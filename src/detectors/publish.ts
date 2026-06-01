import type { LocationRef, ReleasePath, WorkflowJob, WorkflowStep } from "../types.js";
import { hasAnyWritePermission, hasScopeWrite } from "./permissions.js";

const ACTION_RELEASE_PATTERNS = [
  { pattern: /^pypa\/gh-action-pypi-publish/i, type: "package" as const, ecosystem: "python", registry: "pypi.org" },
  { pattern: /^goreleaser\/goreleaser-action/i, type: "github-release" as const, ecosystem: "go" },
  { pattern: /^softprops\/action-gh-release/i, type: "github-release" as const },
  { pattern: /^ncipollo\/release-action/i, type: "github-release" as const },
  { pattern: /^docker\/build-push-action/i, type: "container" as const, ecosystem: "container" },
  { pattern: /^actions\/deploy-pages/i, type: "pages" as const, ecosystem: "pages" }
];

const RUN_RELEASE_PATTERNS = [
  { pattern: /\bnpm\s+publish\b|\byarn\s+npm\s+publish\b|\bpnpm\s+publish\b|\bbun\s+publish\b/i, type: "package" as const, ecosystem: "npm", registry: "npmjs.org" },
  { pattern: /\bnpm\s+.*--provenance\b/i, type: "package" as const, ecosystem: "npm", registry: "npmjs.org" },
  { pattern: /\bpython\s+-m\s+twine\s+upload\b|\btwine\s+upload\b|\bpoetry\s+publish\b/i, type: "package" as const, ecosystem: "python", registry: "pypi.org" },
  { pattern: /\bcargo\s+publish\b/i, type: "package" as const, ecosystem: "rust", registry: "crates.io" },
  { pattern: /\bdocker\s+push\b|\bghcr\.io\b/i, type: "container" as const, ecosystem: "container", registry: "ghcr.io" },
  { pattern: /\bgh\s+release\s+(create|upload)\b/i, type: "github-release" as const },
  { pattern: /\bmvn\s+deploy\b|\bgradle\s+publish\b/i, type: "package" as const, ecosystem: "jvm" },
  { pattern: /\baws\b|\bgcloud\b|\baz\b|\bkubectl\b|\bhelm\b|\bterraform\s+apply\b/i, type: "deployment" as const }
];

export function detectReleasePaths(workflowName: string, job: WorkflowJob): ReleasePath[] {
  const results: ReleasePath[] = [];
  const requiresWritePermission = hasAnyWritePermission(job.permissions);
  const usesOIDC = hasScopeWrite(job.permissions, "id-token");

  for (const step of job.steps) {
    const location: LocationRef = {
      filePath: "",
      workflowName,
      jobId: job.jobId,
      stepName: step.name,
      stepIndex: step.index
    };
    const actionName = step.uses?.split("@")[0] ?? "";

    for (const definition of ACTION_RELEASE_PATTERNS) {
      if (definition.pattern.test(actionName)) {
        const dockerPush = actionName.toLowerCase() === "docker/build-push-action" ? step.with?.push === true || step.with?.push === "true" : true;
        if (!dockerPush) {
          continue;
        }

        results.push({
          type: definition.type,
          ecosystem: definition.ecosystem,
          registry: definition.registry,
          commandOrAction: step.uses ?? actionName,
          workflow: workflowName,
          job: job.jobId,
          step: step.name,
          requiresSecrets: stepHasSecret(step),
          requiresWritePermission,
          usesOIDC,
          risk: requiresWritePermission || stepHasSecret(step) ? "medium" : "low",
          location
        });
      }
    }

    if (step.run) {
      for (const definition of RUN_RELEASE_PATTERNS) {
        if (definition.pattern.test(step.run)) {
          results.push({
            type: definition.type,
            ecosystem: definition.ecosystem,
            registry: definition.registry,
            commandOrAction: firstLine(step.run),
            workflow: workflowName,
            job: job.jobId,
            step: step.name,
            requiresSecrets: stepHasSecret(step),
            requiresWritePermission,
            usesOIDC,
            risk: requiresWritePermission || stepHasSecret(step) ? "medium" : "low",
            location
          });
        }
      }
    }
  }

  return results;
}

function stepHasSecret(step: WorkflowStep): boolean {
  return /\bsecrets\.|\bGITHUB_TOKEN\b/i.test(`${step.run ?? ""}\n${JSON.stringify(step.env)}\n${JSON.stringify(step.with ?? {})}`);
}

function firstLine(value: string): string {
  return value.trim().split(/\r?\n/)[0]?.slice(0, 180) ?? value;
}
