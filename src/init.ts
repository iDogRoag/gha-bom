import path from "node:path";
import { pathExists, writeText } from "./utils/fs.js";

export const DEFAULT_CONFIG_TEXT = `version: 1

# Minimum acceptable risk score.
minScore: 80

# CI failure policy.
failOn:
  - high

# Workflow files to scan.
include:
  - ".github/workflows/*.{yml,yaml}"

exclude: []

trustedActions:
  - "actions/*"
  - "github/*"
  - "docker/*"

trustedOwners: []

allowedSecrets:
  - "GITHUB_TOKEN"

allowedSelfHostedLabels: []

risk:
  requireExplicitPermissions: true
  requireShaPinnedThirdPartyActions: true
  allowPullRequestTarget: false
  allowSecretsInPullRequestTarget: false
  allowWriteAll: false
  allowSecretsInThirdPartyActions: false

diff:
  baseline: ".gha-bom/baseline.json"
`;

export async function initConfig(targetPath: string, force = false): Promise<string> {
  const root = path.resolve(targetPath || process.cwd());
  const configPath = path.join(root, "gha-bom.yml");

  if (!force && (await pathExists(configPath))) {
    throw new Error(`${configPath} already exists. Use --force to overwrite it.`);
  }

  await writeText(configPath, DEFAULT_CONFIG_TEXT);
  return configPath;
}
