import path from "node:path";
import { loadConfig, mergeCliConfig } from "./config.js";
import { discoverWorkflowFiles } from "./discover.js";
import { detectArtifacts } from "./detectors/artifacts.js";
import { detectCaches } from "./detectors/cache.js";
import { detectStepOidc, detectOidcPermission } from "./detectors/oidc.js";
import { parseActionReference } from "./detectors/actions.js";
import { detectReleasePaths } from "./detectors/publish.js";
import { detectSecretEnvKeys, detectSecretsInValue } from "./detectors/secrets.js";
import { hasAnyWritePermission } from "./detectors/permissions.js";
import { parseWorkflowFile } from "./parser.js";
import { generateRiskFindings, recommendationsFor } from "./risk.js";
import { computeRiskScore } from "./score.js";
import type {
  ActionReference,
  ArtifactUse,
  BadgeInfo,
  CacheUse,
  CliScanOptions,
  EnvReference,
  Finding,
  NormalizedPermissionRecord,
  OidcUse,
  ReleasePath,
  Report,
  RunnerRecord,
  SecretReference,
  WorkflowBom,
  WorkflowStep
} from "./types.js";
import { assertReadableDirectory, pathExists, readText } from "./utils/fs.js";
import { relativePosix, resolveFrom } from "./utils/path.js";
import { nowIso } from "./utils/time.js";
import { stableId, uniq } from "./utils/text.js";
import { isRecord, parseYaml } from "./utils/yaml.js";

const TOOL_VERSION = "0.1.1";

export async function scanRepository(targetPath: string, options: CliScanOptions): Promise<Report> {
  const root = path.resolve(targetPath || process.cwd());
  await assertReadableDirectory(root);

  const configLoad = await loadConfig(root, options.config);
  const config = mergeCliConfig(configLoad.config, {
    include: options.include,
    exclude: options.exclude,
    minScore: options.minScore,
    failOn: options.failOn
  });

  const workflowFiles = await discoverWorkflowFiles(root, config);
  const parseResults = await Promise.all(workflowFiles.map((file) => parseWorkflowFile(root, file)));
  const workflows = parseResults.map((result) => result.workflow);
  const parseFindings = parseResults.flatMap((result) => result.findings);

  const actionRefs = collectActionReferences(workflows);
  const localActionRefs = await collectLocalCompositeActionReferences(root, workflows);
  const actions = dedupeActions([...actionRefs, ...localActionRefs]);
  const secrets = dedupeSecrets(collectSecrets(workflows));
  const env = collectEnv(workflows);
  const permissions = collectPermissions(workflows);
  const runners = collectRunners(workflows);
  const oidc = collectOidc(workflows);
  const releasePaths = collectReleasePaths(workflows, secrets, permissions, oidc);
  const artifacts = collectArtifacts(workflows);
  const caches = collectCaches(workflows);

  const riskFindings = generateRiskFindings({
    config,
    workflows,
    actions,
    secrets,
    permissions,
    oidc,
    releasePaths,
    artifacts,
    caches
  });

  const findings = dedupeFindings([...configLoad.warnings, ...parseFindings, ...riskFindings]);
  const score = computeRiskScore(findings);
  const invalidWorkflows = workflows.filter((workflow) => !workflow.valid).length;
  const highFindings = findings.filter((finding) => finding.severity === "high").length;
  const mediumFindings = findings.filter((finding) => finding.severity === "medium").length;
  const lowFindings = findings.filter((finding) => finding.severity === "low").length;

  const report: Report = {
    schemaVersion: 1,
    tool: {
      name: "gha-bom",
      version: TOOL_VERSION
    },
    repo: {
      root,
      scannedAt: nowIso(),
      configPath: configLoad.configPath ? relativePosix(root, configLoad.configPath) : undefined,
      offline: true,
      unknowns: [
        "Repository and organization default GITHUB_TOKEN permissions were not queried.",
        "Branch protection, rulesets, environment protection, and action allow policies were not queried.",
        "Secret existence and secret values were not queried.",
        "Remote action owner identity and remote ref type were not verified.",
        "CODEOWNERS coverage cannot be verified offline without repository policy context."
      ]
    },
    summary: {
      status: invalidWorkflows > 0 ? "partial" : highFindings > 0 ? "fail" : "pass",
      workflowsScanned: workflows.length,
      invalidWorkflows,
      jobsScanned: workflows.reduce((sum, workflow) => sum + workflow.jobs.length, 0),
      actionsFound: actions.length,
      thirdPartyActions: actions.filter((action) => action.kind === "third-party-action").length,
      unpinnedThirdPartyActions: actions.filter(
        (action) => (action.kind === "third-party-action" || action.kind === "reusable-workflow-remote") && action.refType !== "full-sha"
      ).length,
      secretsReferenced: uniq(secrets.map((secret) => secret.name)).length,
      envVarsReferenced: uniq(env.map((entry) => entry.name)).length,
      writePermissionJobs: permissions.filter((permission) => permission.jobId && hasAnyWritePermission(permission.permissions)).length,
      releasePaths: releasePaths.length,
      highFindings,
      mediumFindings,
      lowFindings
    },
    score,
    badge: options.badge ? createBadge(score.value) : undefined,
    workflows,
    actions,
    secrets,
    env,
    permissions,
    runners,
    oidc,
    releasePaths,
    artifacts,
    caches,
    findings,
    recommendations: []
  };

  report.recommendations = recommendationsFor(report);
  return report;
}

function createBadge(score: number): BadgeInfo {
  const color = score >= 90 ? "brightgreen" : score >= 70 ? "yellowgreen" : score >= 50 ? "yellow" : "orange";
  const label = `gha-bom risk ${score}/100`;
  return {
    label,
    color,
    markdown: `![gha-bom risk score](https://img.shields.io/badge/gha--bom-risk%20${score}%2F100-${color})`
  };
}

function collectActionReferences(workflows: WorkflowBom[]): ActionReference[] {
  return workflows.flatMap((workflow) =>
    workflow.jobs.flatMap((job) => job.steps.flatMap((step) => (step.action ? [step.action] : [])))
  );
}

async function collectLocalCompositeActionReferences(root: string, workflows: WorkflowBom[]): Promise<ActionReference[]> {
  const refs: ActionReference[] = [];

  for (const workflow of workflows) {
    for (const job of workflow.jobs) {
      for (const step of job.steps) {
        if (step.action?.kind !== "local-action" || !step.action.path?.startsWith("./.github/actions/")) {
          continue;
        }

        const actionDir = resolveFrom(root, step.action.path);
        const candidates = [path.join(actionDir, "action.yml"), path.join(actionDir, "action.yaml")];
        const actionFile = await firstExisting(candidates);
        if (!actionFile) {
          continue;
        }

        const source = await readText(actionFile);
        const parsed = parseYaml(source);
        if (parsed.errors.length > 0 || !isRecord(parsed.value)) {
          continue;
        }

        const runs = isRecord(parsed.value.runs) ? parsed.value.runs : undefined;
        const steps = Array.isArray(runs?.steps) ? runs.steps : [];
        const actionRelPath = relativePosix(root, actionFile);
        for (const [index, rawNestedStep] of steps.entries()) {
          if (!isRecord(rawNestedStep) || typeof rawNestedStep.uses !== "string") {
            continue;
          }

          refs.push(
            parseActionReference(rawNestedStep.uses, {
              filePath: actionRelPath,
              workflowName: workflow.name,
              jobId: job.jobId,
              stepName: typeof rawNestedStep.name === "string" ? rawNestedStep.name : step.name,
              stepIndex: index
            })
          );
        }
      }
    }
  }

  return refs;
}

function collectSecrets(workflows: WorkflowBom[]): SecretReference[] {
  const secrets: SecretReference[] = [];

  for (const workflow of workflows) {
    const workflowLocation = { filePath: workflow.filePath, workflowName: workflow.name };
    secrets.push(...detectSecretsInValue(workflow.env, workflowLocation, "env"));
    for (const env of workflow.env) {
      if (env.secretLike) {
        secrets.push({ name: env.name, source: "env-key", location: workflowLocation, context: "env" });
      }
    }

    for (const job of workflow.jobs) {
      const jobLocation = { filePath: workflow.filePath, workflowName: workflow.name, jobId: job.jobId };
      if (job.secretsInherit) {
        secrets.push({ name: "*", source: "unknown", location: jobLocation, context: "reusable-workflow" });
      }

      for (const env of job.env) {
        if (env.secretLike) {
          secrets.push({ name: env.name, source: "env-key", location: jobLocation, context: "env" });
        }
      }
      secrets.push(...detectSecretsInValue(job.env, jobLocation, "env"));

      for (const step of job.steps) {
        const stepLocation = {
          filePath: workflow.filePath,
          workflowName: workflow.name,
          jobId: job.jobId,
          stepName: step.name,
          stepIndex: step.index
        };
        const stepEnvObject = Object.fromEntries(step.env.map((entry) => [entry.name, entry.valueRedacted]));
        secrets.push(...detectSecretEnvKeys(stepEnvObject, stepLocation));
        secrets.push(...detectSecretsInValue(step.env, stepLocation, "env"));
        secrets.push(...detectSecretsInValue(step.with, stepLocation, "with"));
        secrets.push(...detectSecretsInValue(step.run, stepLocation, "run"));
      }
    }
  }

  return secrets;
}

function collectEnv(workflows: WorkflowBom[]): EnvReference[] {
  return workflows.flatMap((workflow) => [
    ...workflow.env,
    ...workflow.jobs.flatMap((job) => [...job.env, ...job.steps.flatMap((step) => step.env)])
  ]);
}

function collectPermissions(workflows: WorkflowBom[]): NormalizedPermissionRecord[] {
  return workflows.flatMap((workflow) => [
    { workflow: workflow.filePath, permissions: workflow.permissions },
    ...workflow.jobs.map((job) => ({
      workflow: workflow.filePath,
      jobId: job.jobId,
      permissions: job.permissions
    }))
  ]);
}

function collectRunners(workflows: WorkflowBom[]): RunnerRecord[] {
  return workflows.flatMap((workflow) =>
    workflow.jobs.map((job) => ({
      workflow: workflow.filePath,
      jobId: job.jobId,
      runner: job.runsOn
    }))
  );
}

function collectOidc(workflows: WorkflowBom[]): OidcUse[] {
  const results: OidcUse[] = [];

  for (const workflow of workflows) {
    for (const job of workflow.jobs) {
      const jobLocation = { filePath: workflow.filePath, workflowName: workflow.name, jobId: job.jobId };
      results.push(...detectOidcPermission(job.permissions, jobLocation));
      for (const step of job.steps) {
        results.push(
          ...detectStepOidc(step, {
            filePath: workflow.filePath,
            workflowName: workflow.name,
            jobId: job.jobId,
            stepName: step.name,
            stepIndex: step.index
          })
        );
      }
    }
  }

  return results;
}

function collectReleasePaths(
  workflows: WorkflowBom[],
  secrets: SecretReference[],
  permissions: NormalizedPermissionRecord[],
  oidc: OidcUse[]
): ReleasePath[] {
  const releasePaths: ReleasePath[] = [];
  for (const workflow of workflows) {
    for (const job of workflow.jobs) {
      const detected = detectReleasePaths(workflow.name ?? workflow.filePath, job);
      for (const releasePath of detected) {
        releasePath.location.filePath = workflow.filePath;
        releasePath.location.workflowName = workflow.name;
        releasePath.requiresSecrets =
          releasePath.requiresSecrets ||
          secrets.some((secret) => secret.location.filePath === workflow.filePath && secret.location.jobId === job.jobId);
        releasePath.requiresWritePermission =
          releasePath.requiresWritePermission ||
          permissions.some(
            (permission) =>
              permission.workflow === workflow.filePath && permission.jobId === job.jobId && hasAnyWritePermission(permission.permissions)
          );
        releasePath.usesOIDC =
          releasePath.usesOIDC || oidc.some((use) => use.location.filePath === workflow.filePath && use.location.jobId === job.jobId);
        releasePaths.push(releasePath);
      }
    }
  }

  return releasePaths;
}

function collectArtifacts(workflows: WorkflowBom[]): ArtifactUse[] {
  const artifacts: ArtifactUse[] = [];
  for (const workflow of workflows) {
    for (const job of workflow.jobs) {
      const detected = detectArtifacts(workflow.name ?? workflow.filePath, job);
      for (const artifact of detected) {
        artifact.location.filePath = workflow.filePath;
        artifact.location.workflowName = workflow.name;
        artifacts.push(artifact);
      }
    }
  }

  return artifacts;
}

function collectCaches(workflows: WorkflowBom[]): CacheUse[] {
  const caches: CacheUse[] = [];
  for (const workflow of workflows) {
    for (const job of workflow.jobs) {
      const detected = detectCaches(workflow.name ?? workflow.filePath, job);
      for (const cache of detected) {
        cache.location.filePath = workflow.filePath;
        cache.location.workflowName = workflow.name;
        caches.push(cache);
      }
    }
  }

  return caches;
}

async function firstExisting(paths: string[]): Promise<string | undefined> {
  for (const candidate of paths) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function dedupeActions(actions: ActionReference[]): ActionReference[] {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.location.filePath}|${action.location.jobId}|${action.location.stepIndex}|${action.raw}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function dedupeSecrets(secrets: SecretReference[]): SecretReference[] {
  const seen = new Set<string>();
  return secrets.filter((secret) => {
    const key = `${secret.location.filePath}|${secret.location.jobId}|${secret.location.stepIndex}|${secret.name}|${secret.context}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = finding.id || stableId(finding.category, finding.title, finding.filePath, finding.evidence);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
