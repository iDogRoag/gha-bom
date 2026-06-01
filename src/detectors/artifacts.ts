import type { ArtifactUse, LocationRef, WorkflowJob, WorkflowStep } from "../types.js";

export function detectArtifacts(workflowName: string, job: WorkflowJob): ArtifactUse[] {
  return job.steps.flatMap((step) => {
    const actionName = step.uses?.split("@")[0]?.toLowerCase();
    if (actionName !== "actions/upload-artifact" && actionName !== "actions/download-artifact") {
      return [];
    }

    const location: LocationRef = {
      filePath: "",
      workflowName,
      jobId: job.jobId,
      stepName: step.name,
      stepIndex: step.index
    };

    return [
      {
        kind: actionName.endsWith("upload-artifact") ? "upload" : "download",
        name: stringValue(step.with?.name),
        paths: pathValues(step.with?.path),
        retentionDays: numberValue(step.with?.["retention-days"]),
        location
      }
    ];
  });
}

export function hasBroadArtifactPath(artifact: ArtifactUse): boolean {
  return artifact.paths.some((artifactPath) => [".", "./", "**/*", "*"].includes(artifactPath.trim()));
}

function pathValues(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.map(String);
  }

  return [];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number(value);
  }

  return undefined;
}
