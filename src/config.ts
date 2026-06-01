import path from "node:path";
import { z } from "zod";
import type { Config, ConfigLoadResult, FailPolicy, Finding } from "./types.js";
import { pathExists, readText } from "./utils/fs.js";
import { parseYaml } from "./utils/yaml.js";
import { stableId } from "./utils/text.js";

export const DEFAULT_INCLUDE = [".github/workflows/*.{yml,yaml}"];
export const DEFAULT_EXCLUDE = [
  "node_modules/**",
  ".git/**",
  "dist/**",
  "build/**",
  "coverage/**",
  ".next/**",
  ".turbo/**",
  "target/**"
];

const failPolicySchema = z.enum([
  "none",
  "high",
  "medium",
  "score-below",
  "new-high",
  "new-secret",
  "new-write-permission",
  "new-unpinned-action"
]);

const defaultRiskConfig = {
  allowPullRequestTarget: false,
  requireExplicitPermissions: true,
  requireShaPinnedThirdPartyActions: true,
  allowSecretsInPullRequestTarget: false,
  allowWriteAll: false,
  allowSecretsInThirdPartyActions: false
};

const riskSchema = z
  .object({
    allowPullRequestTarget: z.boolean().default(defaultRiskConfig.allowPullRequestTarget),
    requireExplicitPermissions: z.boolean().default(defaultRiskConfig.requireExplicitPermissions),
    requireShaPinnedThirdPartyActions: z.boolean().default(defaultRiskConfig.requireShaPinnedThirdPartyActions),
    allowSecretsInPullRequestTarget: z.boolean().default(defaultRiskConfig.allowSecretsInPullRequestTarget),
    allowWriteAll: z.boolean().default(defaultRiskConfig.allowWriteAll),
    allowSecretsInThirdPartyActions: z.boolean().default(defaultRiskConfig.allowSecretsInThirdPartyActions)
  })
  .default(defaultRiskConfig);

const configSchema = z.object({
    version: z.literal(1).default(1),
    minScore: z.number().min(0).max(100).default(80),
    failOn: z.array(failPolicySchema).default(["none"]),
    include: z.array(z.string()).default(DEFAULT_INCLUDE),
    exclude: z.array(z.string()).default([]),
    trustedActions: z.array(z.string()).default(["actions/*", "github/*", "docker/*"]),
    trustedOwners: z.array(z.string()).default([]),
    allowedSecrets: z.array(z.string()).default(["GITHUB_TOKEN"]),
    allowedSelfHostedLabels: z.array(z.string()).default([]),
    risk: riskSchema,
    diff: z
      .object({
        baseline: z.string().optional()
      })
      .default({})
  });

export const DEFAULT_CONFIG: Config = configSchema.parse({});

const CONFIG_FILES = ["gha-bom.yml", "gha-bom.yaml", ".gha-bom.yml", ".gha-bom.yaml"];

export async function loadConfig(root: string, explicitPath?: string): Promise<ConfigLoadResult> {
  const warnings: Finding[] = [];
  const configPath = explicitPath ? path.resolve(root, explicitPath) : await findConfig(root);

  if (!configPath) {
    warnings.push(configFinding(root, "Config missing", "No gha-bom config file was found.", "config missing"));
    return { config: DEFAULT_CONFIG, warnings };
  }

  const source = await readText(configPath);
  const parsed = parseYaml(source);
  if (parsed.errors.length > 0) {
    throw new ConfigError(configPath, `Invalid YAML: ${parsed.errors.join("; ")}`);
  }

  const result = configSchema.safeParse(parsed.value ?? {});
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
      .join("; ");
    throw new ConfigError(configPath, details);
  }

  const config = {
    ...DEFAULT_CONFIG,
    ...result.data,
    risk: {
      ...DEFAULT_CONFIG.risk,
      ...result.data.risk
    },
    diff: {
      ...DEFAULT_CONFIG.diff,
      ...result.data.diff
    }
  };

  return { config, configPath, warnings };
}

async function findConfig(root: string): Promise<string | undefined> {
  for (const name of CONFIG_FILES) {
    const candidate = path.join(root, name);
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function configFinding(root: string, title: string, message: string, evidence: string): Finding {
  return {
    id: stableId("config", title, evidence),
    severity: "low",
    confidence: "high",
    title,
    message,
    filePath: root,
    evidence,
    recommendation: "Run gha-bom init to create a project policy file when you want repeatable CI settings.",
    category: "config"
  };
}

export function mergeCliConfig(
  config: Config,
  values: {
    include?: string[];
    exclude?: string[];
    minScore?: number;
    failOn?: FailPolicy;
  }
): Config {
  return {
    ...config,
    include: values.include && values.include.length > 0 ? values.include : config.include,
    exclude: values.exclude && values.exclude.length > 0 ? values.exclude : config.exclude,
    minScore: values.minScore ?? config.minScore,
    failOn: values.failOn ? [values.failOn] : config.failOn
  };
}

export class ConfigError extends Error {
  constructor(
    readonly configPath: string,
    message: string
  ) {
    super(`Invalid config at ${configPath}: ${message}`);
    this.name = "ConfigError";
  }
}
