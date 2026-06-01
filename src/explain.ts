import path from "node:path";
import { parseWorkflowFile } from "./parser.js";
import { scanRepository } from "./analyzer.js";
import type { CliScanOptions, OutputFormat, Report, WorkflowBom } from "./types.js";
import { renderHtml } from "./reporters/html.js";
import { renderJson } from "./reporters/json.js";
import { renderMarkdown } from "./reporters/markdown.js";
import { renderTable } from "./reporters/table.js";
import { relativePosix } from "./utils/path.js";

export async function explainWorkflow(workflowFile: string, options: CliScanOptions): Promise<string> {
  const absolute = path.resolve(workflowFile);
  const root = findLikelyRepoRoot(absolute);
  const report = await scanRepository(root, options);
  const rel = relativePosix(root, absolute);
  const workflow = report.workflows.find((candidate) => candidate.filePath === rel);

  if (!workflow) {
    const parsed = await parseWorkflowFile(path.dirname(absolute), absolute);
    return renderSingleWorkflow(parsed.workflow, parsed.findings, options.format);
  }

  return renderWorkflowFromReport(report, workflow, options.format);
}

function renderWorkflowFromReport(report: Report, workflow: WorkflowBom, format: OutputFormat): string {
  const subset: Report = {
    ...report,
    summary: {
      ...report.summary,
      workflowsScanned: 1,
      jobsScanned: workflow.jobs.length,
      actionsFound: report.actions.filter((action) => action.location.filePath === workflow.filePath).length,
      thirdPartyActions: report.actions.filter(
        (action) => action.location.filePath === workflow.filePath && action.kind === "third-party-action"
      ).length,
      unpinnedThirdPartyActions: report.actions.filter(
        (action) =>
          action.location.filePath === workflow.filePath &&
          (action.kind === "third-party-action" || action.kind === "reusable-workflow-remote") &&
          action.refType !== "full-sha"
      ).length,
      secretsReferenced: report.secrets.filter((secret) => secret.location.filePath === workflow.filePath).length,
      envVarsReferenced: report.env.filter((env) => env.location?.filePath === workflow.filePath).length,
      writePermissionJobs: report.permissions.filter((permission) => permission.workflow === workflow.filePath && permission.jobId).length,
      releasePaths: report.releasePaths.filter((release) => release.location.filePath === workflow.filePath).length
    },
    workflows: [workflow],
    actions: report.actions.filter((action) => action.location.filePath === workflow.filePath),
    secrets: report.secrets.filter((secret) => secret.location.filePath === workflow.filePath),
    env: report.env.filter((env) => env.location?.filePath === workflow.filePath),
    permissions: report.permissions.filter((permission) => permission.workflow === workflow.filePath),
    runners: report.runners.filter((runner) => runner.workflow === workflow.filePath),
    oidc: report.oidc.filter((use) => use.location.filePath === workflow.filePath),
    releasePaths: report.releasePaths.filter((release) => release.location.filePath === workflow.filePath),
    artifacts: report.artifacts.filter((artifact) => artifact.location.filePath === workflow.filePath),
    caches: report.caches.filter((cache) => cache.location.filePath === workflow.filePath),
    findings: report.findings.filter((finding) => finding.filePath === workflow.filePath)
  };

  return renderByFormat(subset, format);
}

function renderSingleWorkflow(workflow: WorkflowBom, findings: Report["findings"], format: OutputFormat): string {
  const report: Report = {
    schemaVersion: 1,
    tool: { name: "gha-bom", version: "0.1.0" },
    repo: {
      root: path.dirname(workflow.filePath),
      scannedAt: new Date().toISOString(),
      offline: true,
      unknowns: ["Only one workflow file was parsed; repository context was not available."]
    },
    summary: {
      status: findings.some((finding) => finding.severity === "high") ? "fail" : "pass",
      workflowsScanned: 1,
      invalidWorkflows: workflow.valid ? 0 : 1,
      jobsScanned: workflow.jobs.length,
      actionsFound: workflow.jobs.flatMap((job) => job.steps).filter((step) => step.action).length,
      thirdPartyActions: 0,
      unpinnedThirdPartyActions: 0,
      secretsReferenced: 0,
      envVarsReferenced: 0,
      writePermissionJobs: 0,
      releasePaths: 0,
      highFindings: findings.filter((finding) => finding.severity === "high").length,
      mediumFindings: findings.filter((finding) => finding.severity === "medium").length,
      lowFindings: findings.filter((finding) => finding.severity === "low").length
    },
    score: { value: 100, label: "low risk", penalties: [], note: "Single-file parse only." },
    workflows: [workflow],
    actions: workflow.jobs.flatMap((job) => job.steps.flatMap((step) => (step.action ? [step.action] : []))),
    secrets: [],
    env: workflow.env,
    permissions: [{ workflow: workflow.filePath, permissions: workflow.permissions }],
    runners: [],
    oidc: [],
    releasePaths: [],
    artifacts: [],
    caches: [],
    findings,
    recommendations: ["Run gha-bom scan from the repository root for full context."]
  };

  return renderByFormat(report, format);
}

function renderByFormat(report: Report, format: OutputFormat): string {
  if (format === "json") {
    return renderJson(report);
  }

  if (format === "markdown") {
    return renderMarkdown(report);
  }

  if (format === "html") {
    return renderHtml(report);
  }

  return renderTable(report);
}

function findLikelyRepoRoot(absoluteWorkflowFile: string): string {
  const marker = `${path.sep}.github${path.sep}workflows${path.sep}`;
  const index = absoluteWorkflowFile.indexOf(marker);
  if (index >= 0) {
    return absoluteWorkflowFile.slice(0, index);
  }

  return process.cwd();
}
