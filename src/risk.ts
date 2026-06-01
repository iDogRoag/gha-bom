import type {
  ActionReference,
  ArtifactUse,
  CacheUse,
  Config,
  Finding,
  NormalizedPermissionRecord,
  OidcUse,
  ReleasePath,
  Report,
  SecretReference,
  WorkflowBom,
  WorkflowJob
} from "./types.js";
import { hasBroadArtifactPath } from "./detectors/artifacts.js";
import { cacheKeyLooksUserControlled } from "./detectors/cache.js";
import { hasAnyWritePermission, hasScopeWrite } from "./detectors/permissions.js";
import { hasTrigger, hasUntrustedPrTrigger, hasPrivilegedUserTrigger } from "./detectors/triggers.js";
import { stableId, stringifyEvidence } from "./utils/text.js";

interface RiskInput {
  config: Config;
  workflows: WorkflowBom[];
  actions: ActionReference[];
  secrets: SecretReference[];
  permissions: NormalizedPermissionRecord[];
  oidc: OidcUse[];
  releasePaths: ReleasePath[];
  artifacts: ArtifactUse[];
  caches: CacheUse[];
}

export function generateRiskFindings(input: RiskInput): Finding[] {
  const findings: Finding[] = [];

  for (const workflow of input.workflows) {
    if (!workflow.valid) {
      continue;
    }

    if (workflow.permissions.mode === "missing" && input.config.risk.requireExplicitPermissions) {
      findings.push(
        finding(
          "medium",
          "high",
          "permissions",
          "Missing explicit workflow permissions",
          "This workflow does not declare top-level permissions, so effective GITHUB_TOKEN access depends on repository or organization defaults.",
          workflow.filePath,
          workflow.name,
          undefined,
          undefined,
          "permissions missing",
          "Add the narrowest explicit permissions block needed by this workflow."
        )
      );
    }

    if (workflow.permissions.mode === "read-all") {
      findings.push(
        finding(
          "medium",
          "high",
          "permissions",
          "Workflow uses read-all permissions",
          "read-all is broader than most workflows need and can make future job changes harder to audit.",
          workflow.filePath,
          workflow.name,
          undefined,
          undefined,
          "permissions: read-all",
          "Replace read-all with a map of specific read scopes."
        )
      );
    }

    if (workflow.permissions.mode === "write-all") {
      findings.push(
        finding(
          "high",
          "high",
          "permissions",
          "Workflow uses write-all permissions",
          "write-all grants broad GITHUB_TOKEN write access to every job unless overridden.",
          workflow.filePath,
          workflow.name,
          undefined,
          undefined,
          "permissions: write-all",
          "Replace write-all with explicit least-privilege job permissions."
        )
      );
    }

    if (hasTrigger(workflow.triggers, "pull_request_target") && !input.config.risk.allowPullRequestTarget) {
      findings.push(
        finding(
          "medium",
          "high",
          "trigger",
          "pull_request_target trigger needs review",
          "pull_request_target runs in a privileged context and is dangerous when combined with write permissions, secrets, checkout of PR head, or untrusted scripts.",
          workflow.filePath,
          workflow.name,
          undefined,
          undefined,
          "on: pull_request_target",
          "Use pull_request where possible, or isolate privileged logic from untrusted pull request code."
        )
      );
    }

    if (hasTrigger(workflow.triggers, "schedule") && workflowHasReleasePath(input.releasePaths, workflow)) {
      findings.push(
        finding(
          "low",
          "medium",
          "trigger",
          "Scheduled workflow publishes or deploys",
          "A scheduled release or deploy path can run without a human event in the pull request timeline.",
          workflow.filePath,
          workflow.name,
          undefined,
          undefined,
          "schedule trigger with release/deploy path",
          "Confirm this schedule is intentional and protected by narrow permissions and environment rules."
        )
      );
    }

    for (const job of workflow.jobs) {
      findings.push(...jobPermissionFindings(workflow, job));
      findings.push(...pullRequestTargetFindings(workflow, job, input));
      findings.push(...runnerFindings(workflow, job));
      findings.push(...reusableWorkflowFindings(workflow, job));
    }
  }

  for (const action of input.actions) {
    findings.push(...actionPinningFindings(action, input.config));
  }

  findings.push(...secretFindings(input));
  findings.push(...oidcFindings(input));
  findings.push(...releasePathFindings(input));
  findings.push(...artifactFindings(input));
  findings.push(...cacheFindings(input));

  return dedupeFindings(findings);
}

export function recommendationsFor(report: Report): string[] {
  const recommendations = new Set<string>();

  if (report.findings.some((finding) => finding.category === "permissions")) {
    recommendations.add("Declare least-privilege permissions at workflow or job level.");
  }

  if (report.findings.some((finding) => finding.category === "pinning")) {
    recommendations.add("Pin third-party actions to full commit SHAs where practical.");
  }

  if (report.findings.some((finding) => finding.category === "secrets")) {
    recommendations.add("Review where secrets and GITHUB_TOKEN can flow, including implicit token access.");
  }

  if (report.findings.some((finding) => finding.category === "trigger")) {
    recommendations.add("Treat pull_request_target and workflow_run as privileged triggers and keep untrusted code away from them.");
  }

  if (report.findings.some((finding) => finding.category === "publish")) {
    recommendations.add("Put release and package publishing jobs behind explicit permissions and protected environments.");
  }

  if (recommendations.size === 0) {
    recommendations.add("Keep using gha-bom diffs to review CI/CD attack-surface changes in pull requests.");
  }

  return Array.from(recommendations);
}

function jobPermissionFindings(workflow: WorkflowBom, job: WorkflowJob): Finding[] {
  const findings: Finding[] = [];
  if (job.permissions.mode === "write-all") {
    findings.push(
      finding(
        "high",
        "high",
        "permissions",
        "Job uses write-all permissions",
        "This job has broad write access through GITHUB_TOKEN.",
        workflow.filePath,
        workflow.name,
        job.jobId,
        undefined,
        "permissions: write-all",
        "Replace write-all with explicit job-level scopes."
      )
    );
  }

  if (job.permissions.source === "workflow" && workflow.permissions.mode === "map" && hasAnyWritePermission(workflow.permissions)) {
    findings.push(
      finding(
        "medium",
        "high",
        "permissions",
        "Job inherits workflow-level write permissions",
        "Workflow-level write permissions apply to this job even if only one job needs them.",
        workflow.filePath,
        workflow.name,
        job.jobId,
        undefined,
        stringifyEvidence(workflow.permissions.scopes),
        "Move write permissions to the specific job that needs them."
      )
    );
  }

  for (const scope of ["contents", "packages", "pages", "pull-requests", "issues", "security-events", "attestations", "actions"]) {
    if (hasScopeWrite(job.permissions, scope)) {
      findings.push(
        finding(
          "low",
          "high",
          "permissions",
          `Job has ${scope}: write`,
          `This job can write to the ${scope} permission scope.`,
          workflow.filePath,
          workflow.name,
          job.jobId,
          undefined,
          `${scope}: write`,
          "Confirm this write scope is required and keep it at job scope."
        )
      );
    }
  }

  return findings;
}

function pullRequestTargetFindings(workflow: WorkflowBom, job: WorkflowJob, input: RiskInput): Finding[] {
  if (!hasTrigger(workflow.triggers, "pull_request_target")) {
    return [];
  }

  const findings: Finding[] = [];
  const jobSecrets = input.secrets.filter((secret) => secret.location.filePath === workflow.filePath && secret.location.jobId === job.jobId);
  const jobActions = input.actions.filter((action) => action.location.filePath === workflow.filePath && action.location.jobId === job.jobId);

  if (job.permissions.mode === "write-all") {
    findings.push(
      finding(
        "high",
        "high",
        "trigger",
        "pull_request_target uses write-all",
        "This privileged pull request workflow has broad write permissions.",
        workflow.filePath,
        workflow.name,
        job.jobId,
        undefined,
        "pull_request_target + write-all",
        "Avoid write-all in pull_request_target workflows."
      )
    );
  }

  if (hasAnyWritePermission(job.permissions)) {
    findings.push(
      finding(
        "high",
        "high",
        "trigger",
        "pull_request_target has write permissions",
        "A privileged pull request workflow with write permissions can be dangerous if untrusted code runs in the job.",
        workflow.filePath,
        workflow.name,
        job.jobId,
        undefined,
        stringifyEvidence(job.permissions.scopes),
        "Use read-only permissions unless the privileged job is isolated from untrusted input."
      )
    );
  }

  if (job.steps.some((step) => /github\.event\.pull_request\.head\.(sha|ref)|head\.sha/i.test(JSON.stringify(step.with ?? {})))) {
    findings.push(
      finding(
        "high",
        "high",
        "trigger",
        "pull_request_target checks out PR head",
        "Checking out untrusted pull request code in pull_request_target can expose privileged tokens or secrets.",
        workflow.filePath,
        workflow.name,
        job.jobId,
        undefined,
        "checkout ref references github.event.pull_request.head",
        "Do not check out untrusted PR head code in pull_request_target jobs."
      )
    );
  }

  if (jobSecrets.length > 0) {
    findings.push(
      finding(
        "high",
        "high",
        "secrets",
        "pull_request_target references secrets",
        "Secrets referenced in privileged pull request workflows need careful isolation from untrusted code.",
        workflow.filePath,
        workflow.name,
        job.jobId,
        undefined,
        jobSecrets.map((secret) => secret.name).join(", "),
        "Avoid secrets in pull_request_target or split privileged steps into a separate trusted workflow."
      )
    );
  }

  if (job.runsOn.kind === "self-hosted") {
    findings.push(
      finding(
        "high",
        "high",
        "runner",
        "pull_request_target uses self-hosted runner",
        "Self-hosted runners can expose persistent infrastructure to untrusted pull request behavior.",
        workflow.filePath,
        workflow.name,
        job.jobId,
        undefined,
        job.runsOn.labels.join(", "),
        "Use GitHub-hosted runners for untrusted pull request workflows."
      )
    );
  }

  if (jobActions.some((action) => action.kind === "third-party-action" && action.refMutable) && hasAnyWritePermission(job.permissions)) {
    findings.push(
      finding(
        "high",
        "high",
        "pinning",
        "Third-party action on pull_request_target with write permission",
        "A mutable third-party action can change underneath a privileged pull request workflow.",
        workflow.filePath,
        workflow.name,
        job.jobId,
        undefined,
        jobActions.filter((action) => action.kind === "third-party-action" && action.refMutable).map((action) => action.raw).join(", "),
        "Pin third-party actions in privileged workflows to full commit SHAs."
      )
    );
  }

  return findings;
}

function runnerFindings(workflow: WorkflowBom, job: WorkflowJob): Finding[] {
  if (job.runsOn.kind !== "self-hosted" || !hasUntrustedPrTrigger(workflow.triggers)) {
    return [];
  }

  return [
    finding(
      "high",
      "high",
      "runner",
      "Self-hosted runner used on pull request trigger",
      "Self-hosted runners can expose persistent infrastructure to untrusted pull request code.",
      workflow.filePath,
      workflow.name,
      job.jobId,
      undefined,
      job.runsOn.labels.join(", "),
      "Use GitHub-hosted runners for untrusted pull request workflows or isolate self-hosted runners tightly."
    )
  ];
}

function reusableWorkflowFindings(workflow: WorkflowBom, job: WorkflowJob): Finding[] {
  if (!job.secretsInherit || !job.uses || job.uses.startsWith("./")) {
    return [];
  }

  return [
    finding(
      "high",
      "high",
      "reusable-workflow",
      "secrets inherit used with remote reusable workflow",
      "secrets: inherit passes caller secrets into a remote reusable workflow.",
      workflow.filePath,
      workflow.name,
      job.jobId,
      undefined,
      `${job.uses} with secrets: inherit`,
      "Pass only the specific secrets that the reusable workflow needs."
    )
  ];
}

function actionPinningFindings(action: ActionReference, config: Config): Finding[] {
  if (action.kind === "local-action") {
    return [
      finding(
        "low",
        "high",
        "local-action",
        "Local action included",
        "gha-bom included this local action in the static inventory.",
        action.location.filePath,
        action.location.workflowName,
        action.location.jobId,
        action.location.stepName,
        action.raw,
        "Review local action contents like any other workflow code."
      )
    ];
  }

  if (action.kind === "docker-action") {
    return [
      finding(
        "low",
        "medium",
        "pinning",
        "Docker action reference found",
        "Docker image tags are mutable unless pinned by digest.",
        action.location.filePath,
        action.location.workflowName,
        action.location.jobId,
        action.location.stepName,
        action.raw,
        "Pin Docker images by digest where possible."
      )
    ];
  }

  if (action.kind === "official-github-action" && action.refType !== "full-sha") {
    return [
      finding(
        "low",
        "high",
        "pinning",
        "Official action is not SHA pinned",
        "Full commit SHA pinning reduces tag mutation risk even for official actions.",
        action.location.filePath,
        action.location.workflowName,
        action.location.jobId,
        action.location.stepName,
        action.raw,
        "Use a full commit SHA when you need the strongest reproducibility."
      )
    ];
  }

  if ((action.kind === "third-party-action" || action.kind === "reusable-workflow-remote") && action.refType !== "full-sha") {
    const severity = action.refType === "semver-tag" || action.refType === "short-sha" ? "medium" : "medium";
    return [
      finding(
        severity,
        "high",
        "pinning",
        action.kind === "reusable-workflow-remote" ? "Remote reusable workflow is not SHA pinned" : "Third-party action is not SHA pinned",
        "Mutable or partial refs can change without a workflow file change. Offline mode cannot verify the remote owner or ref.",
        action.location.filePath,
        action.location.workflowName,
        action.location.jobId,
        action.location.stepName,
        action.raw,
        config.risk.requireShaPinnedThirdPartyActions
          ? "Pin this reference to a full commit SHA or explicitly trust the owner in gha-bom.yml."
          : "Consider pinning to a full commit SHA for stronger reproducibility."
      )
    ];
  }

  return [];
}

function secretFindings(input: RiskInput): Finding[] {
  const findings: Finding[] = [];

  for (const secret of input.secrets) {
    const actionAtLocation = input.actions.find(
      (action) =>
        action.location.filePath === secret.location.filePath &&
        action.location.jobId === secret.location.jobId &&
        action.location.stepIndex === secret.location.stepIndex
    );

    if (actionAtLocation?.kind === "third-party-action" && actionAtLocation.refType !== "full-sha") {
      findings.push(
        finding(
          "high",
          "high",
          "secrets",
          "Secret passed to unpinned third-party action",
          "Secrets can be exposed if a mutable third-party action is compromised or retagged.",
          secret.location.filePath,
          secret.location.workflowName,
          secret.location.jobId,
          secret.location.stepName,
          `${secret.name} -> ${actionAtLocation.raw}`,
          "Pin the third-party action to a full commit SHA or remove the secret from that step."
        )
      );
    } else if (actionAtLocation?.kind === "third-party-action") {
      findings.push(
        finding(
          "medium",
          "high",
          "secrets",
          "Secret used in step with third-party action",
          "The step references a secret and invokes a third-party action.",
          secret.location.filePath,
          secret.location.workflowName,
          secret.location.jobId,
          secret.location.stepName,
          `${secret.name} -> ${actionAtLocation.raw}`,
          "Review whether the action needs this secret and whether the action is pinned and trusted."
        )
      );
    }
  }

  return findings;
}

function oidcFindings(input: RiskInput): Finding[] {
  const findings: Finding[] = [];
  const permissionUses = input.oidc.filter((oidc) => oidc.type === "permission");
  const cloudUses = input.oidc.filter((oidc) => oidc.type !== "permission");

  for (const permission of permissionUses) {
    const hasDetectedUse = cloudUses.some(
      (use) => use.location.filePath === permission.location.filePath && use.location.jobId === permission.location.jobId
    );

    if (!hasDetectedUse) {
      findings.push(
        finding(
          "medium",
          "medium",
          "oidc",
          "id-token write with no detected OIDC use",
          "This job can mint OIDC tokens, but gha-bom did not detect a matching cloud login or OIDC command.",
          permission.location.filePath,
          permission.location.workflowName,
          permission.location.jobId,
          permission.location.stepName,
          permission.evidence,
          "Remove id-token: write unless this job needs OIDC federation."
        )
      );
    }

    const workflow = input.workflows.find((candidate) => candidate.filePath === permission.location.filePath);
    if (workflow && hasTrigger(workflow.triggers, "pull_request_target")) {
      findings.push(
        finding(
          "high",
          "high",
          "oidc",
          "OIDC enabled in pull_request_target workflow",
          "A privileged pull request workflow can mint OIDC tokens.",
          permission.location.filePath,
          permission.location.workflowName,
          permission.location.jobId,
          undefined,
          permission.evidence,
          "Avoid id-token: write in pull_request_target workflows."
        )
      );
    }
  }

  for (const use of cloudUses) {
    const hasPermission = permissionUses.some(
      (permission) => permission.location.filePath === use.location.filePath && permission.location.jobId === use.location.jobId
    );
    if (!hasPermission) {
      findings.push(
        finding(
          "medium",
          "medium",
          "oidc",
          "OIDC use without id-token write",
          "gha-bom detected likely OIDC usage, but the job does not appear to grant id-token: write.",
          use.location.filePath,
          use.location.workflowName,
          use.location.jobId,
          use.location.stepName,
          use.evidence,
          "Add id-token: write only to the job that needs OIDC, or remove the unused cloud auth step."
        )
      );
    }
  }

  return findings;
}

function releasePathFindings(input: RiskInput): Finding[] {
  const findings: Finding[] = [];
  for (const release of input.releasePaths) {
    const jobActions = input.actions.filter(
      (action) => action.location.filePath === release.location.filePath && action.location.jobId === release.location.jobId
    );
    const unpinnedThirdParty = jobActions.find((action) => action.kind === "third-party-action" && action.refType !== "full-sha");
    const jobPermission = input.permissions.find(
      (permission) => permission.workflow === release.location.filePath && permission.jobId === release.location.jobId
    );

    if (unpinnedThirdParty) {
      findings.push(
        finding(
          "high",
          "high",
          "publish",
          "Release path uses unpinned third-party action",
          "A release or publish job depends on a mutable third-party action.",
          release.location.filePath,
          release.location.workflowName,
          release.location.jobId,
          release.location.stepName,
          `${release.commandOrAction}; ${unpinnedThirdParty.raw}`,
          "Pin third-party actions in release jobs to full commit SHAs."
        )
      );
    }

    if (!jobPermission || jobPermission.permissions.mode === "missing") {
      findings.push(
        finding(
          "high",
          "medium",
          "publish",
          "Workflow publishes without explicit permissions",
          "gha-bom detected a release or publish path, but the job does not have explicit permissions in the scanned workflow.",
          release.location.filePath,
          release.location.workflowName,
          release.location.jobId,
          release.location.stepName,
          release.commandOrAction,
          "Add explicit least-privilege permissions for this release path."
        )
      );
    }

    if (release.requiresSecrets) {
      findings.push(
        finding(
          "medium",
          "medium",
          "publish",
          "Release path uses secret-like credentials",
          "This publish or release path references secrets or GITHUB_TOKEN.",
          release.location.filePath,
          release.location.workflowName,
          release.location.jobId,
          release.location.stepName,
          release.commandOrAction,
          "Prefer OIDC or trusted publishing where available, and keep credentials scoped to the target registry."
        )
      );
    }
  }

  return findings;
}

function artifactFindings(input: RiskInput): Finding[] {
  const findings: Finding[] = [];
  for (const artifact of input.artifacts) {
    if (hasBroadArtifactPath(artifact)) {
      findings.push(
        finding(
          "low",
          "high",
          "artifact",
          "Artifact path is broad",
          "Broad artifact paths can accidentally collect secrets, build caches, or unrelated repository files.",
          artifact.location.filePath,
          artifact.location.workflowName,
          artifact.location.jobId,
          artifact.location.stepName,
          artifact.paths.join(", "),
          "Restrict artifact paths to the exact build outputs needed."
        )
      );
    }

    const workflow = input.workflows.find((candidate) => candidate.filePath === artifact.location.filePath);
    if (workflow && artifact.kind === "upload" && hasUntrustedPrTrigger(workflow.triggers)) {
      findings.push(
        finding(
          "medium",
          "medium",
          "artifact",
          "Artifact upload from pull request workflow",
          "Artifacts produced from untrusted pull request code should not be consumed by privileged jobs without validation.",
          artifact.location.filePath,
          artifact.location.workflowName,
          artifact.location.jobId,
          artifact.location.stepName,
          artifact.name ?? artifact.paths.join(", "),
          "Keep untrusted artifacts separate from release or deployment jobs."
        )
      );
    }
  }

  return findings;
}

function cacheFindings(input: RiskInput): Finding[] {
  const findings: Finding[] = [];
  for (const cache of input.caches) {
    const workflow = input.workflows.find((candidate) => candidate.filePath === cache.location.filePath);
    if (workflow && hasUntrustedPrTrigger(workflow.triggers)) {
      findings.push(
        finding(
          "medium",
          "medium",
          "cache",
          "Cache used in pull request workflow",
          "Caches that interact with untrusted pull request code need careful keying and restore boundaries.",
          cache.location.filePath,
          cache.location.workflowName,
          cache.location.jobId,
          cache.location.stepName,
          cache.key ?? cache.paths.join(", "),
          "Avoid sharing writable caches between untrusted and privileged workflows."
        )
      );
    }

    if (cacheKeyLooksUserControlled(cache)) {
      findings.push(
        finding(
          "medium",
          "medium",
          "cache",
          "Cache key includes user-controlled event data",
          "User-controlled cache keys can make cache behavior harder to reason about.",
          cache.location.filePath,
          cache.location.workflowName,
          cache.location.jobId,
          cache.location.stepName,
          cache.key ?? "",
          "Use stable dependency-file hashes for cache keys."
        )
      );
    }
  }

  return findings;
}

function workflowHasReleasePath(releasePaths: ReleasePath[], workflow: WorkflowBom): boolean {
  return releasePaths.some((releasePath) => releasePath.location.filePath === workflow.filePath);
}

function finding(
  severity: Finding["severity"],
  confidence: Finding["confidence"],
  category: Finding["category"],
  title: string,
  message: string,
  filePath: string,
  workflowName: string | undefined,
  jobId: string | undefined,
  stepName: string | undefined,
  evidence: string,
  recommendation: string
): Finding {
  return {
    id: stableId(category, title, filePath, workflowName, jobId, stepName, evidence),
    severity,
    confidence,
    title,
    message,
    filePath,
    workflowName,
    jobId,
    stepName,
    evidence,
    recommendation,
    category
  };
}

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    if (seen.has(finding.id)) {
      return false;
    }

    seen.add(finding.id);
    return true;
  });
}
