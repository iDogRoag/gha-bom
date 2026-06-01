import path from "node:path";

export function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

export function relativePosix(root: string, filePath: string): string {
  return toPosixPath(path.relative(root, filePath));
}

export function resolveFrom(root: string, maybeRelative: string): string {
  return path.isAbsolute(maybeRelative) ? maybeRelative : path.resolve(root, maybeRelative);
}

export function stripLeadingDotSlash(value: string): string {
  return value.startsWith("./") ? value.slice(2) : value;
}
