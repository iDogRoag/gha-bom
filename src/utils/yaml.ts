import { parseDocument } from "yaml";

export interface ParsedYaml {
  value: unknown;
  errors: string[];
}

export function parseYaml(source: string): ParsedYaml {
  const document = parseDocument(source, {
    prettyErrors: false,
    strict: false,
    uniqueKeys: false
  });

  const errors = document.errors.map((error) => error.message);
  const value = errors.length > 0 ? undefined : document.toJSON();
  return { value, errors };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function getRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}
