import type { LocationRef, SecretReference } from "../types.js";
import { isSecretLikeKey } from "../utils/redact.js";

const SECRET_EXPRESSION_RE =
  /\$\{\{\s*secrets(?:\.([A-Za-z_][A-Za-z0-9_]*)|\[['"]([^'"]+)['"]\])\s*\}\}/g;
const SCRIPT_SECRET_RE = /secrets\.([A-Za-z_][A-Za-z0-9_]*)/g;
const GITHUB_TOKEN_RE = /\bGITHUB_TOKEN\b/g;

export function detectSecretsInValue(
  value: unknown,
  location: LocationRef,
  context: SecretReference["context"]
): SecretReference[] {
  const text = flattenText(value);
  const results: SecretReference[] = [];

  for (const match of text.matchAll(SECRET_EXPRESSION_RE)) {
    const name = match[1] ?? match[2];
    if (name) {
      results.push({ name, source: "expression", location, context });
    }
  }

  for (const match of text.matchAll(SCRIPT_SECRET_RE)) {
    const name = match[1];
    if (name && !results.some((secret) => secret.name === name && secret.context === context)) {
      results.push({ name, source: "expression", location, context });
    }
  }

  if (GITHUB_TOKEN_RE.test(text) && !results.some((secret) => secret.name === "GITHUB_TOKEN")) {
    results.push({ name: "GITHUB_TOKEN", source: "github-token", location, context });
  }

  return results;
}

export function detectSecretEnvKeys(env: Record<string, unknown>, location: LocationRef): SecretReference[] {
  return Object.keys(env)
    .filter(isSecretLikeKey)
    .map((name) => ({
      name,
      source: "env-key" as const,
      location,
      context: "env" as const
    }));
}

function flattenText(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
