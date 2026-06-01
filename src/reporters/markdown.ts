import type { DiffReport, Finding, Report } from "../types.js";

export function renderMarkdown(data: Report | DiffReport): string {
  if ("changes" in data) {
    return renderDiffMarkdown(data);
  }

  return renderReportMarkdown(data);
}

function renderReportMarkdown(report: Report): string {
  const lines: string[] = [
    "# gha-bom report",
    "",
    `Risk score: **${report.score.value}/100** (${report.score.label})`,
    ""
  ];

  if (report.badge) {
    lines.push(report.badge.markdown, "");
  }

  lines.push(
    "| Metric | Value |",
    "| --- | ---: |",
    `| Workflows scanned | ${report.summary.workflowsScanned} |`,
    `| Jobs scanned | ${report.summary.jobsScanned} |`,
    `| Actions found | ${report.summary.actionsFound} |`,
    `| Third-party actions | ${report.summary.thirdPartyActions} |`,
    `| Unpinned third-party actions | ${report.summary.unpinnedThirdPartyActions} |`,
    `| Secrets referenced | ${report.summary.secretsReferenced} |`,
    `| Write permission jobs | ${report.summary.writePermissionJobs} |`,
    `| Release paths | ${report.summary.releasePaths} |`,
    `| Findings | ${report.summary.highFindings} high, ${report.summary.mediumFindings} medium, ${report.summary.lowFindings} low |`,
    "",
    "## Top findings",
    ""
  );

  const topFindings = [...report.findings].sort(sortFindings).slice(0, 15);
  if (topFindings.length === 0) {
    lines.push("No findings.");
  } else {
    lines.push("| Severity | Confidence | Finding | Location | Recommendation |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const finding of topFindings) {
      lines.push(
        `| ${finding.severity} | ${finding.confidence} | ${escapePipe(finding.title)} | ${escapePipe(location(finding))} | ${escapePipe(finding.recommendation)} |`
      );
    }
  }

  lines.push("", "## Workflow inventory", "", "| Workflow | Name | Triggers | Jobs | Permissions |");
  lines.push("| --- | --- | --- | ---: | --- |");
  for (const workflow of report.workflows) {
    lines.push(
      `| ${escapePipe(workflow.filePath)} | ${escapePipe(workflow.name ?? "-")} | ${escapePipe(workflow.triggers.map((trigger) => trigger.name).join(", ") || "-")} | ${workflow.jobs.length} | ${workflow.permissions.mode} |`
    );
  }

  lines.push("", "## Third-party actions", "");
  const thirdParty = report.actions.filter((action) => action.kind === "third-party-action" || action.kind === "reusable-workflow-remote");
  if (thirdParty.length === 0) {
    lines.push("No third-party actions detected.");
  } else {
    lines.push("| Action | Ref type | Location |");
    lines.push("| --- | --- | --- |");
    for (const action of thirdParty) {
      lines.push(`| ${escapePipe(action.raw)} | ${action.refType} | ${escapePipe(action.location.filePath)} ${action.location.jobId ?? ""} |`);
    }
  }

  if (report.summary.secretsReferenced > 0) {
    lines.push("", "## Secrets", "", "| Secret name | Location |");
    lines.push("| --- | --- |");
    for (const secret of report.secrets) {
      lines.push(`| ${escapePipe(secret.name)} | ${escapePipe(secret.location.filePath)} ${secret.location.jobId ?? ""} ${secret.location.stepName ?? ""} |`);
    }
  }

  lines.push("", "## Recommendations", "");
  for (const recommendation of report.recommendations) {
    lines.push(`- ${recommendation}`);
  }

  lines.push("", "> gha-bom is static offline analysis. It is a visibility and prioritization aid, not proof that a workflow is safe.", "");
  return `${lines.join("\n")}\n`;
}

function renderDiffMarkdown(diff: DiffReport): string {
  const lines = [
    "## gha-bom diff",
    "",
    `Risk score changed from **${diff.summary.oldScore}** to **${diff.summary.newScore}** (${formatDelta(diff.summary.scoreDelta)}).`,
    "",
    "| Severity | Change | Location | Why it matters |",
    "| --- | --- | --- | --- |"
  ];

  if (diff.changes.length === 0) {
    lines.push("| low | No changes | - | No CI/CD attack-surface changes were detected. |");
  } else {
    for (const change of diff.changes.sort((a, b) => severityRank(b.severity) - severityRank(a.severity))) {
      lines.push(
        `| ${change.severity} | ${escapePipe(change.title)} | ${escapePipe([change.filePath, change.jobId, change.stepName].filter(Boolean).join(" ")) || "-"} | ${escapePipe(change.message)} |`
      );
    }
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

function sortFindings(a: Finding, b: Finding): number {
  return severityRank(b.severity) - severityRank(a.severity);
}

function severityRank(severity: Finding["severity"]): number {
  return { high: 3, medium: 2, low: 1 }[severity];
}

function location(finding: Finding): string {
  return [finding.filePath, finding.jobId, finding.stepName].filter(Boolean).join(" ");
}

function escapePipe(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function formatDelta(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
