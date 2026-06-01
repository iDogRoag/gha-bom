import type { WorkflowTrigger } from "../types.js";
import { isRecord } from "../utils/yaml.js";

export function normalizeTriggers(raw: unknown): WorkflowTrigger[] {
  if (typeof raw === "string") {
    return [{ name: raw }];
  }

  if (Array.isArray(raw)) {
    return raw.map((trigger) => ({ name: String(trigger) }));
  }

  if (isRecord(raw)) {
    return Object.entries(raw).map(([name, detail]) => ({ name, detail }));
  }

  return [];
}

export function hasTrigger(triggers: WorkflowTrigger[], name: string): boolean {
  return triggers.some((trigger) => trigger.name === name);
}

export function hasUntrustedPrTrigger(triggers: WorkflowTrigger[]): boolean {
  return triggers.some((trigger) => trigger.name === "pull_request" || trigger.name === "pull_request_target");
}

export function hasPrivilegedUserTrigger(triggers: WorkflowTrigger[]): boolean {
  return triggers.some((trigger) =>
    ["workflow_run", "issue_comment", "repository_dispatch", "issues", "pull_request_review", "pull_request_review_comment"].includes(
      trigger.name
    )
  );
}
