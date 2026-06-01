export type OutputFormat = "table" | "json" | "markdown" | "html";

export type FindingSeverity = "high" | "medium" | "low";
export type FindingConfidence = "high" | "medium" | "low";

export type FindingCategory =
  | "pinning"
  | "permissions"
  | "secrets"
  | "trigger"
  | "runner"
  | "oidc"
  | "publish"
  | "artifact"
  | "cache"
  | "reusable-workflow"
  | "local-action"
  | "yaml"
  | "config"
  | "inventory"
  | "parse-error";

export type ActionReferenceKind =
  | "local-action"
  | "official-github-action"
  | "third-party-action"
  | "docker-action"
  | "reusable-workflow-local"
  | "reusable-workflow-remote"
  | "unknown";

export type ActionRefType =
  | "full-sha"
  | "short-sha"
  | "semver-tag"
  | "major-tag"
  | "mutable-ref"
  | "missing"
  | "unknown";

export type PermissionLevel = "none" | "read" | "write";
export type PermissionMode = "missing" | "read-all" | "write-all" | "empty" | "map";

export type RunnerKind = "github-hosted" | "self-hosted" | "larger-runner" | "matrix" | "unknown";
export type RiskLabel = "low risk" | "moderate risk" | "high risk" | "critical risk";

export type FailPolicy =
  | "none"
  | "high"
  | "medium"
  | "score-below"
  | "new-high"
  | "new-secret"
  | "new-write-permission"
  | "new-unpinned-action";

export interface Config {
  version: 1;
  minScore: number;
  failOn: FailPolicy[];
  include: string[];
  exclude: string[];
  trustedActions: string[];
  trustedOwners: string[];
  allowedSecrets: string[];
  allowedSelfHostedLabels: string[];
  risk: {
    allowPullRequestTarget: boolean;
    requireExplicitPermissions: boolean;
    requireShaPinnedThirdPartyActions: boolean;
    allowSecretsInPullRequestTarget: boolean;
    allowWriteAll: boolean;
    allowSecretsInThirdPartyActions: boolean;
  };
  diff: {
    baseline?: string;
  };
}

export interface ConfigLoadResult {
  config: Config;
  configPath?: string;
  warnings: Finding[];
}

export interface CliScanOptions {
  format: OutputFormat;
  output?: string;
  config?: string;
  include: string[];
  exclude: string[];
  showWorkflows: boolean;
  showJobs: boolean;
  showSteps: boolean;
  showSecrets: boolean;
  showEnv: boolean;
  minScore?: number;
  failOn?: FailPolicy;
  ci: boolean;
  quiet: boolean;
  verbose: boolean;
}

export interface RepoInfo {
  root: string;
  scannedAt: string;
  configPath?: string;
  offline: true;
  unknowns: string[];
}

export interface WorkflowBom {
  filePath: string;
  name?: string;
  valid: boolean;
  triggers: WorkflowTrigger[];
  permissions: NormalizedPermissions;
  env: EnvReference[];
  defaults?: unknown;
  concurrency?: unknown;
  jobs: WorkflowJob[];
  parseError?: string;
}

export interface WorkflowTrigger {
  name: string;
  detail?: unknown;
}

export interface WorkflowJob {
  jobId: string;
  name?: string;
  runsOn: RunnerInfo;
  permissions: NormalizedPermissions;
  needs: string[];
  if?: string;
  environment?: string;
  container?: unknown;
  services?: unknown;
  strategy?: unknown;
  uses?: string;
  secretsInherit: boolean;
  env: EnvReference[];
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  index: number;
  name?: string;
  id?: string;
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
  env: EnvReference[];
  shell?: string;
  workingDirectory?: string;
  action?: ActionReference;
}

export interface ActionReference {
  raw: string;
  kind: ActionReferenceKind;
  owner?: string;
  repo?: string;
  path?: string;
  ref?: string;
  refType: ActionRefType;
  refMutable: boolean;
  location: LocationRef;
}

export interface LocationRef {
  filePath: string;
  workflowName?: string;
  jobId?: string;
  stepName?: string;
  stepIndex?: number;
}

export interface NormalizedPermissions {
  mode: PermissionMode;
  scopes: Record<string, PermissionLevel>;
  source: "workflow" | "job" | "implicit";
  raw?: unknown;
}

export interface SecretReference {
  name: string;
  source: "expression" | "github-token" | "env-key" | "unknown";
  location: LocationRef;
  context: "env" | "with" | "run" | "permissions" | "reusable-workflow" | "unknown";
}

export interface EnvReference {
  name: string;
  valueRedacted?: string;
  secretLike: boolean;
  location?: LocationRef;
}

export interface RunnerInfo {
  raw: unknown;
  labels: string[];
  kind: RunnerKind;
}

export interface OidcUse {
  type: "permission" | "cloud-action" | "script" | "with-field";
  provider?: "aws" | "gcp" | "azure" | "vault" | "unknown";
  location: LocationRef;
  evidence: string;
}

export interface ReleasePath {
  type: "package" | "container" | "github-release" | "pages" | "deployment" | "unknown";
  ecosystem?: string;
  registry?: string;
  commandOrAction: string;
  workflow: string;
  job: string;
  step?: string;
  requiresSecrets: boolean;
  requiresWritePermission: boolean;
  usesOIDC: boolean;
  risk: FindingSeverity;
  location: LocationRef;
}

export interface ArtifactUse {
  kind: "upload" | "download";
  name?: string;
  paths: string[];
  retentionDays?: number;
  location: LocationRef;
}

export interface CacheUse {
  kind: "actions/cache" | "setup-cache" | "script";
  key?: string;
  paths: string[];
  location: LocationRef;
}

export interface Finding {
  id: string;
  severity: FindingSeverity;
  confidence: FindingConfidence;
  title: string;
  message: string;
  filePath: string;
  workflowName?: string;
  jobId?: string;
  stepName?: string;
  lineNumber?: number;
  evidence: string;
  recommendation: string;
  category: FindingCategory;
}

export interface RiskPenalty {
  findingId: string;
  points: number;
  reason: string;
}

export interface RiskScore {
  value: number;
  label: RiskLabel;
  penalties: RiskPenalty[];
  note: string;
}

export interface ReportSummary {
  status: "pass" | "fail" | "partial";
  workflowsScanned: number;
  invalidWorkflows: number;
  jobsScanned: number;
  actionsFound: number;
  thirdPartyActions: number;
  unpinnedThirdPartyActions: number;
  secretsReferenced: number;
  envVarsReferenced: number;
  writePermissionJobs: number;
  releasePaths: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
}

export interface Report {
  schemaVersion: 1;
  tool: {
    name: "gha-bom";
    version: string;
  };
  repo: RepoInfo;
  summary: ReportSummary;
  score: RiskScore;
  workflows: WorkflowBom[];
  actions: ActionReference[];
  secrets: SecretReference[];
  env: EnvReference[];
  permissions: NormalizedPermissionRecord[];
  runners: RunnerRecord[];
  oidc: OidcUse[];
  releasePaths: ReleasePath[];
  artifacts: ArtifactUse[];
  caches: CacheUse[];
  findings: Finding[];
  recommendations: string[];
}

export interface NormalizedPermissionRecord {
  workflow: string;
  jobId?: string;
  permissions: NormalizedPermissions;
}

export interface RunnerRecord {
  workflow: string;
  jobId: string;
  runner: RunnerInfo;
}

export type DiffChangeType =
  | "new-workflow"
  | "removed-workflow"
  | "new-job"
  | "removed-job"
  | "new-action"
  | "removed-action"
  | "changed-action-ref"
  | "action-pinned"
  | "action-unpinned"
  | "new-third-party-action"
  | "new-unpinned-action"
  | "new-secret"
  | "removed-secret"
  | "new-write-permission"
  | "permission-widened"
  | "permission-narrowed"
  | "new-trigger"
  | "new-pull-request-target"
  | "new-self-hosted-runner"
  | "new-oidc-use"
  | "new-release-path"
  | "new-artifact-path"
  | "new-cache-path"
  | "risk-score-change"
  | "new-high-finding"
  | "resolved-high-finding";

export interface DiffFinding {
  id: string;
  severity: FindingSeverity;
  changeType: DiffChangeType;
  title: string;
  message: string;
  before?: unknown;
  after?: unknown;
  filePath?: string;
  workflowName?: string;
  jobId?: string;
  stepName?: string;
  recommendation: string;
}

export interface DiffReport {
  schemaVersion: 1;
  tool: {
    name: "gha-bom";
    version: string;
  };
  summary: {
    oldScore: number;
    newScore: number;
    scoreDelta: number;
    highChanges: number;
    mediumChanges: number;
    lowChanges: number;
    totalChanges: number;
  };
  changes: DiffFinding[];
}

export interface Reporter<T = Report | DiffReport> {
  format: OutputFormat;
  render(data: T): string;
}
