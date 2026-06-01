import type { DiffReport, Report } from "../types.js";

export function renderHtml(data: Report | DiffReport): string {
  if ("changes" in data) {
    return page("gha-bom diff", renderDiff(data));
  }

  return page("gha-bom report", renderReport(data));
}

function renderReport(report: Report): string {
  return `
    <section class="summary">
      <div><span>Risk score</span><strong>${report.score.value}</strong><small>${escapeHtml(report.score.label)}</small></div>
      <div><span>Workflows</span><strong>${report.summary.workflowsScanned}</strong><small>${report.summary.jobsScanned} jobs</small></div>
      <div><span>Actions</span><strong>${report.summary.actionsFound}</strong><small>${report.summary.thirdPartyActions} third party</small></div>
      <div><span>Findings</span><strong>${report.summary.highFindings}</strong><small>high severity</small></div>
    </section>
    <section>
      <h2>Top findings</h2>
      ${table(["Severity", "Confidence", "Finding", "Location", "Recommendation"], report.findings.slice(0, 30).map((finding) => [
        finding.severity,
        finding.confidence,
        finding.title,
        [finding.filePath, finding.jobId, finding.stepName].filter(Boolean).join(" "),
        finding.recommendation
      ]))}
    </section>
    <section>
      <h2>Workflow inventory</h2>
      ${table(["Workflow", "Name", "Triggers", "Jobs", "Permissions"], report.workflows.map((workflow) => [
        workflow.filePath,
        workflow.name ?? "",
        workflow.triggers.map((trigger) => trigger.name).join(", "),
        String(workflow.jobs.length),
        workflow.permissions.mode
      ]))}
    </section>
    <section>
      <h2>Actions</h2>
      ${table(["Action", "Kind", "Ref type", "Location"], report.actions.map((action) => [
        action.raw,
        action.kind,
        action.refType,
        [action.location.filePath, action.location.jobId, action.location.stepName].filter(Boolean).join(" ")
      ]))}
    </section>
    <section>
      <h2>Secrets</h2>
      ${table(["Secret", "Context", "Location"], report.secrets.map((secret) => [
        secret.name,
        secret.context,
        [secret.location.filePath, secret.location.jobId, secret.location.stepName].filter(Boolean).join(" ")
      ]))}
    </section>
    <p class="note">gha-bom is static offline analysis. It is a visibility and prioritization aid, not proof that a workflow is safe.</p>
  `;
}

function renderDiff(diff: DiffReport): string {
  return `
    <section class="summary">
      <div><span>Old score</span><strong>${diff.summary.oldScore}</strong></div>
      <div><span>New score</span><strong>${diff.summary.newScore}</strong></div>
      <div><span>Total changes</span><strong>${diff.summary.totalChanges}</strong></div>
      <div><span>High changes</span><strong>${diff.summary.highChanges}</strong></div>
    </section>
    <section>
      <h2>Changes</h2>
      ${table(["Severity", "Change", "Location", "Message"], diff.changes.map((change) => [
        change.severity,
        change.title,
        [change.filePath, change.jobId, change.stepName].filter(Boolean).join(" "),
        change.message
      ]))}
    </section>
  `;
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; padding: 32px; background: Canvas; color: CanvasText; }
    main { max-width: 1180px; margin: 0 auto; }
    h1 { margin: 0 0 24px; font-size: 32px; }
    h2 { margin: 32px 0 12px; font-size: 20px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
    .summary div { border: 1px solid color-mix(in srgb, CanvasText 18%, transparent); border-radius: 8px; padding: 14px; }
    .summary span, .summary small { display: block; color: color-mix(in srgb, CanvasText 62%, transparent); }
    .summary strong { display: block; font-size: 30px; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; vertical-align: top; border-bottom: 1px solid color-mix(in srgb, CanvasText 14%, transparent); padding: 8px; }
    th { background: color-mix(in srgb, CanvasText 7%, transparent); }
    .note { margin-top: 32px; color: color-mix(in srgb, CanvasText 68%, transparent); }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    ${body}
  </main>
</body>
</html>
`;
}

function table(headers: string[], rows: string[][]): string {
  if (rows.length === 0) {
    return "<p>No rows.</p>";
  }

  return `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
