import type { NormalizedPermissions, PermissionLevel } from "../types.js";
import { isRecord } from "../utils/yaml.js";

export const PERMISSION_SCOPES = [
  "actions",
  "artifact-metadata",
  "attestations",
  "checks",
  "code-quality",
  "contents",
  "deployments",
  "discussions",
  "id-token",
  "issues",
  "models",
  "packages",
  "pages",
  "pull-requests",
  "security-events",
  "statuses",
  "vulnerability-alerts"
];

export function normalizePermissions(
  raw: unknown,
  source: "workflow" | "job" | "implicit"
): NormalizedPermissions {
  if (raw === undefined || raw === null) {
    return { mode: "missing", scopes: {}, source };
  }

  if (raw === "read-all") {
    return {
      mode: "read-all",
      scopes: Object.fromEntries(PERMISSION_SCOPES.map((scope) => [scope, "read" as const])),
      source,
      raw
    };
  }

  if (raw === "write-all") {
    return {
      mode: "write-all",
      scopes: Object.fromEntries(PERMISSION_SCOPES.map((scope) => [scope, "write" as const])),
      source,
      raw
    };
  }

  if (isRecord(raw)) {
    const scopes: Record<string, PermissionLevel> = {};
    for (const [scope, level] of Object.entries(raw)) {
      if (level === "read" || level === "write" || level === "none") {
        scopes[scope] = level;
      }
    }

    return {
      mode: Object.keys(scopes).length === 0 ? "empty" : "map",
      scopes,
      source,
      raw
    };
  }

  return { mode: "missing", scopes: {}, source, raw };
}

export function hasAnyWritePermission(permissions: NormalizedPermissions): boolean {
  return permissions.mode === "write-all" || Object.values(permissions.scopes).includes("write");
}

export function hasScopeWrite(permissions: NormalizedPermissions, scope: string): boolean {
  return permissions.mode === "write-all" || permissions.scopes[scope] === "write";
}

export function widenedPermission(before: PermissionLevel | undefined, after: PermissionLevel | undefined): boolean {
  return levelRank(after) > levelRank(before);
}

export function narrowedPermission(before: PermissionLevel | undefined, after: PermissionLevel | undefined): boolean {
  return levelRank(after) < levelRank(before);
}

function levelRank(level: PermissionLevel | undefined): number {
  if (level === "write") {
    return 2;
  }

  if (level === "read") {
    return 1;
  }

  return 0;
}
