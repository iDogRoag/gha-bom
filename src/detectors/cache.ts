import type { CacheUse, LocationRef, WorkflowJob } from "../types.js";

export function detectCaches(workflowName: string, job: WorkflowJob): CacheUse[] {
  const results: CacheUse[] = [];

  for (const step of job.steps) {
    const actionName = step.uses?.split("@")[0]?.toLowerCase() ?? "";
    const location: LocationRef = {
      filePath: "",
      workflowName,
      jobId: job.jobId,
      stepName: step.name,
      stepIndex: step.index
    };

    if (actionName === "actions/cache") {
      results.push({
        kind: "actions/cache",
        key: stringValue(step.with?.key),
        paths: pathValues(step.with?.path),
        location
      });
    }

    if (
      ["actions/setup-node", "actions/setup-java", "actions/setup-python"].includes(actionName) &&
      step.with &&
      "cache" in step.with
    ) {
      results.push({
        kind: "setup-cache",
        key: stringValue(step.with["cache-dependency-path"]) ?? stringValue(step.with.cache),
        paths: pathValues(step.with["cache-dependency-path"]),
        location
      });
    }

    if (step.run && /\b(cache|restore-cache|save-cache)\b/i.test(step.run)) {
      results.push({
        kind: "script",
        key: undefined,
        paths: [],
        location
      });
    }
  }

  return results;
}

export function cacheKeyLooksUserControlled(cache: CacheUse): boolean {
  return /\bgithub\.event\b|pull_request|issue|comment|head_ref/i.test(cache.key ?? "");
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
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
