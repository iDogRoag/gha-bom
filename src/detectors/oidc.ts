import type { LocationRef, OidcUse, WorkflowStep } from "../types.js";
import { hasScopeWrite } from "./permissions.js";
import type { NormalizedPermissions } from "../types.js";

const OIDC_ACTIONS: Record<string, OidcUse["provider"]> = {
  "aws-actions/configure-aws-credentials": "aws",
  "google-github-actions/auth": "gcp",
  "azure/login": "azure",
  "hashicorp/vault-action": "vault"
};

export function detectOidcPermission(permissions: NormalizedPermissions, location: LocationRef): OidcUse[] {
  if (!hasScopeWrite(permissions, "id-token")) {
    return [];
  }

  return [
    {
      type: "permission",
      provider: "unknown",
      location,
      evidence: "id-token: write"
    }
  ];
}

export function detectStepOidc(step: WorkflowStep, location: LocationRef): OidcUse[] {
  const uses = step.uses ?? "";
  const actionName = uses.split("@")[0]?.toLowerCase();
  const results: OidcUse[] = [];

  if (actionName && OIDC_ACTIONS[actionName]) {
    results.push({
      type: "cloud-action",
      provider: OIDC_ACTIONS[actionName],
      location,
      evidence: uses
    });
  }

  const withText = JSON.stringify(step.with ?? {});
  const runText = step.run ?? "";
  const text = `${withText}\n${runText}`;
  if (/OIDC|audience|role-to-assume|workload_identity_provider|federated/i.test(text)) {
    results.push({
      type: step.run ? "script" : "with-field",
      provider: inferProvider(text),
      location,
      evidence: compactEvidence(text)
    });
  }

  return results;
}

function inferProvider(text: string): OidcUse["provider"] {
  if (/aws|role-to-assume|arn:aws/i.test(text)) {
    return "aws";
  }

  if (/google|gcp|workload_identity_provider/i.test(text)) {
    return "gcp";
  }

  if (/azure|az login|federated/i.test(text)) {
    return "azure";
  }

  if (/vault/i.test(text)) {
    return "vault";
  }

  return "unknown";
}

function compactEvidence(text: string): string {
  return text.replace(/\s+/g, " ").slice(0, 180);
}
