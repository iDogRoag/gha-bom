import path from "node:path";
import fg from "fast-glob";
import type { Config } from "./types.js";
import { DEFAULT_EXCLUDE } from "./config.js";
import { toPosixPath } from "./utils/path.js";

export async function discoverWorkflowFiles(root: string, config: Config): Promise<string[]> {
  const patterns = config.include.length > 0 ? config.include : [".github/workflows/*.{yml,yaml}"];
  const ignore = [...DEFAULT_EXCLUDE, ...config.exclude];
  const entries = await fg(patterns, {
    cwd: root,
    onlyFiles: true,
    absolute: true,
    dot: true,
    ignore,
    followSymbolicLinks: false,
    unique: true
  });

  return entries.sort((a, b) => toPosixPath(path.relative(root, a)).localeCompare(toPosixPath(path.relative(root, b))));
}
