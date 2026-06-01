import type {
  ActionReference,
  DiffFinding,
  DiffReport,
  Finding,
  NormalizedPermissionRecord,
  Report,
  SecretReference
} from "./types.js";
import { narrowedPermission, widenedPermission } from "./detectors/permissions.js";
import { stableId } from "./utils/text.js";

const TOOL_VERSION = "0.1.0";

export function diffReports(oldReport: Report, newReport: Report): DiffReport {
  const changes: DiffFinding[] = [];

  changes.push(...workflowChanges(oldReport, newReport));
  changes.push(...jobChanges(oldReport, newReport));
  changes.push(...actionChanges(oldReport, newReport));
  changes.push(...secretChanges(oldReport.secrets, newReport.secrets));
  changes.push(...permissionChanges(oldReport.permissions, newReport.permissions));
  changes.push(...triggerChanges(oldReport, newReport));
  changes.push(...runnerChanges(oldReport, newReport));
  changes.push(...oidcChanges(oldReport, newReport));
  changes.push(...releasePathChanges(oldReport, newReport));
  changes.push(...artifactChanges(oldReport, newReport));
  changes.push(...cacheChanges(oldReport, newReport));
  changes.push(...scoreChange(oldReport, newReport));
  changes.push(...findingChanges(oldReport.findings, newReport.findings));

  const unique = dedupeChanges(changes);
  return {
    schemaVersion: 1,
    tool: {
      name: "gha-bom",
      version: TOOL_VERSION
    },
    summary: {
      oldScore: oldReport.score.value,
      newScore: newReport.score.value,
      scoreDelta: newReport.score.value - oldReport.score.value,
      highChanges: unique.filter((change) => change.severity === "high").length,
      mediumChanges: unique.filter((change) => change.severity === "medium").length,
      lowChanges: unique.filter((change) => change.severity === "low").length,
      totalChanges: unique.length
    },
    changes: unique
  };
}

function workflowChanges(oldReport: Report, newReport: Report): DiffFinding[] {
  const oldKeys = new Set(oldReport.workflows.map((workflow) => workflow.filePath));
  const newKeys = new Set(newReport.workflows.map((workflow) => workflow.filePath));
  const changes: DiffFinding[] = [];

  for (const filePath of newKeys) {
    if (!oldKeys.has(filePath)) {
      changes.push(change("medium", "new-workflow", "New workflow", `New workflow ${filePath} was added.`, undefined, filePath, filePath));
    }
  }

  for (const filePath of oldKeys) {
    if (!newKeys.has(filePath)) {
      changes.push(change("low", "removed-workflow", "Removed workflow", `Workflow ${filePath} was removed.`, filePath, undefined, filePath));
    }
  }

  return changes;
}

function jobChanges(oldReport: Report, newReport: Report): DiffFinding[] {
  const oldJobs = new Set(oldReport.workflows.flatMap((workflow) => workflow.jobs.map((job) => `${workflow.filePath}|${job.jobId}`)));
  const newJobs = new Set(newReport.workflows.flatMap((workflow) => workflow.jobs.map((job) => `${workflow.filePath}|${job.jobId}`)));
  const changes: DiffFinding[] = [];

  for (const key of newJobs) {
    if (!oldJobs.has(key)) {
      const [filePath, jobId] = key.split("|");
      changes.push(change("medium", "new-job", "New job", `New job ${jobId} was added.`, undefined, key, filePath, undefined, jobId));
    }
  }

  for (const key of oldJobs) {
    if (!newJobs.has(key)) {
      const [filePath, jobId] = key.split("|");
      changes.push(change("low", "removed-job", "Removed job", `Job ${jobId} was removed.`, key, undefined, filePath, undefined, jobId));
    }
  }

  return changes;
}

function actionChanges(oldReport: Report, newReport: Report): DiffFinding[] {
  const oldByLocation = new Map(oldReport.actions.map((action) => [actionLocationKey(action), action]));
  const newByLocation = new Map(newReport.actions.map((action) => [actionLocationKey(action), action]));
  const oldKeys = new Set(oldReport.actions.map(actionIdentityKey));
  const changes: DiffFinding[] = [];

  for (const action of newReport.actions) {
    const locationKey = actionLocationKey(action);
    const oldAtLocation = oldByLocation.get(locationKey);

    if (!oldAtLocation) {
      changes.push(
        change(
          action.kind === "third-party-action" ? "medium" : "low",
          "new-action",
          "New action",
          `New action ${action.raw} was added.`,
          undefined,
          action.raw,
          action.location.filePath,
          action.location.workflowName,
          action.location.jobId,
          action.location.stepName
        )
      );
      if (action.kind === "third-party-action") {
        changes.push(
          change(
            "medium",
            "new-third-party-action",
            "New third-party action",
            `New third-party action ${action.raw} was added.`,
            undefined,
            action.raw,
            action.location.filePath,
            action.location.workflowName,
            action.location.jobId,
            action.location.stepName
          )
        );
      }
      if ((action.kind === "third-party-action" || action.kind === "reusable-workflow-remote") && action.refType !== "full-sha") {
        changes.push(
          change(
            "high",
            "new-unpinned-action",
            "New unpinned action",
            `New mutable or partial action ref ${action.raw} was added.`,
            undefined,
            action.raw,
            action.location.filePath,
            action.location.workflowName,
            action.location.jobId,
            action.location.stepName,
            "Pin third-party actions and remote reusable workflows to full commit SHAs."
          )
        );
      }
      continue;
    }

    if (oldAtLocation.raw !== action.raw) {
      changes.push(
        change(
          oldAtLocation.refType === "full-sha" && action.refType !== "full-sha" ? "high" : "medium",
          "changed-action-ref",
          "Action reference changed",
          `Action at this location changed from ${oldAtLocation.raw} to ${action.raw}.`,
          oldAtLocation.raw,
          action.raw,
          action.location.filePath,
          action.location.workflowName,
          action.location.jobId,
          action.location.stepName
        )
      );

      if (oldAtLocation.refType === "full-sha" && action.refType !== "full-sha") {
        changes.push(
          change(
            "high",
            "action-unpinned",
            "Action changed from SHA to mutable ref",
            `${oldAtLocation.raw} changed to ${action.raw}.`,
            oldAtLocation.raw,
            action.raw,
            action.location.filePath,
            action.location.workflowName,
            action.location.jobId,
            action.location.stepName
          )
        );
      }

      if (oldAtLocation.refType !== "full-sha" && action.refType === "full-sha") {
        changes.push(
          change(
            "low",
            "action-pinned",
            "Action changed to SHA pin",
            `${oldAtLocation.raw} changed to ${action.raw}.`,
            oldAtLocation.raw,
            action.raw,
            action.location.filePath,
            action.location.workflowName,
            action.location.jobId,
            action.location.stepName
          )
        );
      }
    }
  }

  for (const action of oldReport.actions) {
    if (!oldKeys.has(actionIdentityKey(action))) {
      continue;
    }
    if (!newReport.actions.some((candidate) => actionIdentityKey(candidate) === actionIdentityKey(action))) {
      changes.push(
        change(
          "low",
          "removed-action",
          "Removed action",
          `Action ${action.raw} was removed.`,
          action.raw,
          undefined,
          action.location.filePath,
          action.location.workflowName,
          action.location.jobId,
          action.location.stepName
        )
      );
    }
  }

  return changes;
}

function secretChanges(oldSecrets: SecretReference[], newSecrets: SecretReference[]): DiffFinding[] {
  const oldKeys = new Set(oldSecrets.map(secretKey));
  const newKeys = new Set(newSecrets.map(secretKey));
  const changes: DiffFinding[] = [];

  for (const secret of newSecrets) {
    const key = secretKey(secret);
    if (!oldKeys.has(key)) {
      changes.push(
        change(
          "high",
          "new-secret",
          "New secret reference",
          `New secret reference ${secret.name} was added.`,
          undefined,
          secret.name,
          secret.location.filePath,
          secret.location.workflowName,
          secret.location.jobId,
          secret.location.stepName,
          "Review whether this secret is needed and whether it flows to third-party actions or untrusted triggers."
        )
      );
    }
  }

  for (const secret of oldSecrets) {
    const key = secretKey(secret);
    if (!newKeys.has(key)) {
      changes.push(
        change(
          "low",
          "removed-secret",
          "Removed secret reference",
          `Secret reference ${secret.name} was removed.`,
          secret.name,
          undefined,
          secret.location.filePath,
          secret.location.workflowName,
          secret.location.jobId,
          secret.location.stepName
        )
      );
    }
  }

  return changes;
}

function permissionChanges(oldPermissions: NormalizedPermissionRecord[], newPermissions: NormalizedPermissionRecord[]): DiffFinding[] {
  const oldByKey = new Map(oldPermissions.map((permission) => [permissionKey(permission), permission]));
  const changes: DiffFinding[] = [];

  for (const permission of newPermissions) {
    const old = oldByKey.get(permissionKey(permission));
    if (!old) {
      if (permission.jobId && (permission.permissions.mode === "write-all" || Object.values(permission.permissions.scopes).includes("write"))) {
        changes.push(
          change(
            "high",
            "new-write-permission",
            "New write permission",
            "A new job or workflow permission grants write access.",
            undefined,
            permission.permissions.raw ?? permission.permissions.scopes,
            permission.workflow,
            undefined,
            permission.jobId
          )
        );
      }
      continue;
    }

    if (permission.permissions.mode === "write-all" && old.permissions.mode !== "write-all") {
      changes.push(
        change(
          "high",
          "new-write-permission",
          "New write-all permission",
          "Permissions changed to write-all.",
          old.permissions.raw,
          permission.permissions.raw,
          permission.workflow,
          undefined,
          permission.jobId
        )
      );
    }

    const scopes = new Set([...Object.keys(old.permissions.scopes), ...Object.keys(permission.permissions.scopes)]);
    for (const scope of scopes) {
      const before = old.permissions.scopes[scope];
      const after = permission.permissions.scopes[scope];
      if (widenedPermission(before, after)) {
        changes.push(
          change(
            after === "write" ? "high" : "medium",
            after === "write" ? "new-write-permission" : "permission-widened",
            "Permission widened",
            `${scope} permission changed from ${before ?? "none"} to ${after ?? "none"}.`,
            before,
            after,
            permission.workflow,
            undefined,
            permission.jobId
          )
        );
      } else if (narrowedPermission(before, after)) {
        changes.push(
          change(
            "low",
            "permission-narrowed",
            "Permission narrowed",
            `${scope} permission changed from ${before ?? "none"} to ${after ?? "none"}.`,
            before,
            after,
            permission.workflow,
            undefined,
            permission.jobId
          )
        );
      }
    }
  }

  return changes;
}

function triggerChanges(oldReport: Report, newReport: Report): DiffFinding[] {
  const oldTriggers = new Set(oldReport.workflows.flatMap((workflow) => workflow.triggers.map((trigger) => `${workflow.filePath}|${trigger.name}`)));
  const changes: DiffFinding[] = [];

  for (const workflow of newReport.workflows) {
    for (const trigger of workflow.triggers) {
      const key = `${workflow.filePath}|${trigger.name}`;
      if (!oldTriggers.has(key)) {
        changes.push(
          change(
            trigger.name === "pull_request_target" ? "high" : "medium",
            trigger.name === "pull_request_target" ? "new-pull-request-target" : "new-trigger",
            "New trigger",
            `New ${trigger.name} trigger was added.`,
            undefined,
            trigger.name,
            workflow.filePath,
            workflow.name
          )
        );
      }
    }
  }

  return changes;
}

function runnerChanges(oldReport: Report, newReport: Report): DiffFinding[] {
  const oldRunnerKeys = new Set(oldReport.runners.map((runner) => `${runner.workflow}|${runner.jobId}|${runner.runner.kind}|${runner.runner.labels.join(",")}`));
  return newReport.runners.flatMap((runner) => {
    const key = `${runner.workflow}|${runner.jobId}|${runner.runner.kind}|${runner.runner.labels.join(",")}`;
    if (oldRunnerKeys.has(key) || runner.runner.kind !== "self-hosted") {
      return [];
    }

    return [
      change(
        "high",
        "new-self-hosted-runner",
        "New self-hosted runner",
        "A job now uses a self-hosted runner.",
        undefined,
        runner.runner.labels,
        runner.workflow,
        undefined,
        runner.jobId
      )
    ];
  });
}

function oidcChanges(oldReport: Report, newReport: Report): DiffFinding[] {
  const oldKeys = new Set(oldReport.oidc.map((use) => `${use.location.filePath}|${use.location.jobId}|${use.type}|${use.evidence}`));
  return newReport.oidc.flatMap((use) => {
    const key = `${use.location.filePath}|${use.location.jobId}|${use.type}|${use.evidence}`;
    if (oldKeys.has(key)) {
      return [];
    }

    return [
      change(
        "medium",
        "new-oidc-use",
        "New OIDC use",
        `New OIDC-related use detected: ${use.evidence}`,
        undefined,
        use.evidence,
        use.location.filePath,
        use.location.workflowName,
        use.location.jobId,
        use.location.stepName
      )
    ];
  });
}

function releasePathChanges(oldReport: Report, newReport: Report): DiffFinding[] {
  const oldKeys = new Set(oldReport.releasePaths.map((release) => `${release.location.filePath}|${release.location.jobId}|${release.commandOrAction}`));
  return newReport.releasePaths.flatMap((release) => {
    const key = `${release.location.filePath}|${release.location.jobId}|${release.commandOrAction}`;
    if (oldKeys.has(key)) {
      return [];
    }

    return [
      change(
        "high",
        "new-release-path",
        "New release path",
        `New ${release.type} release path detected.`,
        undefined,
        release.commandOrAction,
        release.location.filePath,
        release.location.workflowName,
        release.location.jobId,
        release.location.stepName
      )
    ];
  });
}

function artifactChanges(oldReport: Report, newReport: Report): DiffFinding[] {
  const oldKeys = new Set(oldReport.artifacts.map((artifact) => `${artifact.location.filePath}|${artifact.location.jobId}|${artifact.kind}|${artifact.paths.join(",")}`));
  return newReport.artifacts.flatMap((artifact) => {
    const key = `${artifact.location.filePath}|${artifact.location.jobId}|${artifact.kind}|${artifact.paths.join(",")}`;
    if (oldKeys.has(key)) {
      return [];
    }

    return [
      change(
        "medium",
        "new-artifact-path",
        "New artifact path",
        `New artifact ${artifact.kind} path detected.`,
        undefined,
        artifact.paths,
        artifact.location.filePath,
        artifact.location.workflowName,
        artifact.location.jobId,
        artifact.location.stepName
      )
    ];
  });
}

function cacheChanges(oldReport: Report, newReport: Report): DiffFinding[] {
  const oldKeys = new Set(oldReport.caches.map((cache) => `${cache.location.filePath}|${cache.location.jobId}|${cache.kind}|${cache.paths.join(",")}|${cache.key ?? ""}`));
  return newReport.caches.flatMap((cache) => {
    const key = `${cache.location.filePath}|${cache.location.jobId}|${cache.kind}|${cache.paths.join(",")}|${cache.key ?? ""}`;
    if (oldKeys.has(key)) {
      return [];
    }

    return [
      change(
        "medium",
        "new-cache-path",
        "New cache use",
        "New cache usage was detected.",
        undefined,
        cache.key ?? cache.paths,
        cache.location.filePath,
        cache.location.workflowName,
        cache.location.jobId,
        cache.location.stepName
      )
    ];
  });
}

function scoreChange(oldReport: Report, newReport: Report): DiffFinding[] {
  if (oldReport.score.value === newReport.score.value) {
    return [];
  }

  return [
    change(
      newReport.score.value < oldReport.score.value ? "medium" : "low",
      "risk-score-change",
      "Risk score changed",
      `Risk score changed from ${oldReport.score.value} to ${newReport.score.value}.`,
      oldReport.score.value,
      newReport.score.value
    )
  ];
}

function findingChanges(oldFindings: Finding[], newFindings: Finding[]): DiffFinding[] {
  const oldKeys = new Set(oldFindings.map(findingKey));
  const newKeys = new Set(newFindings.map(findingKey));
  const changes: DiffFinding[] = [];

  for (const finding of newFindings.filter((entry) => entry.severity === "high")) {
    if (!oldKeys.has(findingKey(finding))) {
      changes.push(
        change(
          "high",
          "new-high-finding",
          "New high finding",
          finding.title,
          undefined,
          finding.evidence,
          finding.filePath,
          finding.workflowName,
          finding.jobId,
          finding.stepName,
          finding.recommendation
        )
      );
    }
  }

  for (const finding of oldFindings.filter((entry) => entry.severity === "high")) {
    if (!newKeys.has(findingKey(finding))) {
      changes.push(
        change(
          "low",
          "resolved-high-finding",
          "Resolved high finding",
          finding.title,
          finding.evidence,
          undefined,
          finding.filePath,
          finding.workflowName,
          finding.jobId,
          finding.stepName
        )
      );
    }
  }

  return changes;
}

function change(
  severity: DiffFinding["severity"],
  changeType: DiffFinding["changeType"],
  title: string,
  message: string,
  before?: unknown,
  after?: unknown,
  filePath?: string,
  workflowName?: string,
  jobId?: string,
  stepName?: string,
  recommendation = "Review this CI/CD attack-surface change before merging."
): DiffFinding {
  return {
    id: stableId(changeType, title, message, filePath, workflowName, jobId, stepName, JSON.stringify(before), JSON.stringify(after)),
    severity,
    changeType,
    title,
    message,
    before,
    after,
    filePath,
    workflowName,
    jobId,
    stepName,
    recommendation
  };
}

function actionLocationKey(action: ActionReference): string {
  return `${action.location.filePath}|${action.location.jobId ?? ""}|${action.location.stepIndex ?? ""}`;
}

function actionIdentityKey(action: ActionReference): string {
  return `${action.location.filePath}|${action.location.jobId ?? ""}|${action.location.stepIndex ?? ""}|${action.raw}`;
}

function secretKey(secret: SecretReference): string {
  return `${secret.location.filePath}|${secret.location.jobId ?? ""}|${secret.location.stepIndex ?? ""}|${secret.name}|${secret.context}`;
}

function permissionKey(permission: NormalizedPermissionRecord): string {
  return `${permission.workflow}|${permission.jobId ?? "<workflow>"}`;
}

function findingKey(finding: Finding): string {
  return `${finding.category}|${finding.title}|${finding.filePath}|${finding.jobId ?? ""}|${finding.stepName ?? ""}|${finding.evidence}`;
}

function dedupeChanges(changes: DiffFinding[]): DiffFinding[] {
  const seen = new Set<string>();
  return changes.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}
