import type { EnvReference, LocationRef } from "../types.js";
import { isSecretLikeKey, redactValue } from "../utils/redact.js";
import { isRecord } from "../utils/yaml.js";

export function detectEnvReferences(env: unknown, location?: LocationRef): EnvReference[] {
  if (!isRecord(env)) {
    return [];
  }

  return Object.entries(env).map(([name, value]) => ({
    name,
    valueRedacted: redactValue(name, value),
    secretLike: isSecretLikeKey(name),
    location
  }));
}
