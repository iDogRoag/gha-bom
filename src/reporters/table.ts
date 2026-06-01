import pc from "picocolors";
import type { DiffReport, Finding, Report } from "../types.js";

export function renderTable(data: Report | DiffReport): string {
  if ("changes" in data) {
    return renderDiffTable(data);
  }

  return renderReportTable(data);
}

function renderReportTable(report: Report): string {
  const lines = [
    pc.bold("gha-bom scan"),
    "",
    `${pc.bold("Status")} ${statusColor(report.summary.status)}`,
    `${pc.bold("Risk score")} ${scoreColor(report.score.value)} ${pc.dim(`(${report.score.label})`)}`,
    `${pc.bold("Workflows")} ${report.summary.workflowsScanned} workflows, ${report.summary.jobsScanned} jobs`,
    `${pc.bold("Actions")} ${report.summary.actionsFound} total, ${report.summary.thirdPartyActions} third party, ${report.summary.unpinnedThirdPartyActions} unpinned third party`,
    `${pc.bold("Access")} ${report.summary.secretsReferenced} secrets, ${report.summary.writePermissionJobs} jobs with write permissions, ${report.summary.releasePaths} release paths`,
    `${pc.bold("Findings")} ${pc.red(String(report.summary.highFindings))} high, ${pc.yellow(String(report.summary.mediumFindings))} medium, ${pc.dim(String(report.summary.lowFindings))} low`,
    ""
  ];

  const top = [...report.findings].sort((a, b) => severityRank(b.severity) - severityRank(a.severity)).slice(0, 8);
  if (top.length > 0) {
    lines.push(pc.bold("Top findings"));
    for (const finding of top) {
      lines.push(`- ${severityColor(finding.severity)} ${finding.title} ${pc.dim(location(finding))}`);
      lines.push(`  ${pc.dim(finding.recommendation)}`);
    }
    lines.push("");
  }

  if (report.recommendations.length > 0) {
    lines.push(pc.bold("Next steps"));
    for (const recommendation of report.recommendations.slice(0, 5)) {
      lines.push(`- ${recommendation}`);
    }
    lines.push("");
  }

  lines.push(pc.dim("Static offline analysis. Not proof that a workflow is safe."));
  return `${lines.join("\n")}\n`;
}

function renderDiffTable(diff: DiffReport): string {
  const lines = [
    pc.bold("gha-bom diff"),
    "",
    `${pc.bold("Risk score")} ${diff.summary.oldScore} -> ${diff.summary.newScore} (${formatDelta(diff.summary.scoreDelta)})`,
    `${pc.bold("Changes")} ${diff.summary.totalChanges} total, ${pc.red(String(diff.summary.highChanges))} high, ${pc.yellow(String(diff.summary.mediumChanges))} medium`,
    ""
  ];

  for (const change of diff.changes.sort((a, b) => severityRank(b.severity) - severityRank(a.severity)).slice(0, 20)) {
    lines.push(`- ${severityColor(change.severity)} ${change.title} ${pc.dim([change.filePath, change.jobId, change.stepName].filter(Boolean).join(" "))}`);
    lines.push(`  ${change.message}`);
  }

  if (diff.changes.length === 0) {
    lines.push("No CI/CD attack-surface changes detected.");
  }

  return `${lines.join("\n")}\n`;
}

function statusColor(status: Report["summary"]["status"]): string {
  if (status === "pass") {
    return pc.green(status);
  }

  if (status === "partial") {
    return pc.yellow(status);
  }

  return pc.red(status);
}

function scoreColor(score: number): string {
  if (score >= 90) {
    return pc.green(String(score));
  }

  if (score >= 70) {
    return pc.yellow(String(score));
  }

  return pc.red(String(score));
}

function severityColor(severity: Finding["severity"]): string {
  if (severity === "high") {
    return pc.red("[high]");
  }

  if (severity === "medium") {
    return pc.yellow("[medium]");
  }

  return pc.dim("[low]");
}

function severityRank(severity: Finding["severity"]): number {
  return { high: 3, medium: 2, low: 1 }[severity];
}

function location(finding: Finding): string {
  return [finding.filePath, finding.jobId, finding.stepName].filter(Boolean).join(" ");
}

function formatDelta(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
