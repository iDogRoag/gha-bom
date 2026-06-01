import { execFileSync } from "node:child_process";

export interface DoctorResult {
  nodeVersion: string;
  npmVersion?: string;
  gitVersion?: string;
  nodeSatisfies: boolean;
  ok: boolean;
}

export function runDoctor(): DoctorResult {
  const nodeVersion = process.version;
  const npmVersion = commandVersion("npm", ["--version"]);
  const gitVersion = commandVersion("git", ["--version"]);
  const major = Number(nodeVersion.replace(/^v/, "").split(".")[0]);

  return {
    nodeVersion,
    npmVersion,
    gitVersion,
    nodeSatisfies: major >= 24 && major < 25,
    ok: Boolean(nodeVersion && npmVersion)
  };
}

export function renderDoctor(result: DoctorResult): string {
  return [
    "gha-bom doctor",
    "",
    `Node: ${result.nodeVersion} (${result.nodeSatisfies ? "satisfies >=24 <25" : "does not satisfy >=24 <25"})`,
    `npm: ${result.npmVersion ?? "not found"}`,
    `git: ${result.gitVersion ?? "not found"} (optional)`,
    "",
    result.ok ? "Prerequisites found." : "Missing required prerequisites."
  ].join("\n") + "\n";
}

function commandVersion(command: string, args: string[]): string | undefined {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return undefined;
  }
}
