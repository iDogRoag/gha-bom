import crypto from "node:crypto";

export function stableId(...parts: Array<string | number | undefined>): string {
  const input = parts.filter((part) => part !== undefined && part !== "").join("|");
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
}

export function uniq<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export function stringifyEvidence(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function includesAny(value: string, needles: string[]): boolean {
  const lower = value.toLowerCase();
  return needles.some((needle) => lower.includes(needle.toLowerCase()));
}
