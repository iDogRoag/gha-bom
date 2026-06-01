import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanRepository } from "../src/analyzer.js";
import { diffReports } from "../src/diff.js";
import { renderMarkdown } from "../src/reporters/markdown.js";
import { options } from "./analyzer.test.js";

describe("diff", () => {
  it("detects new action, secret, write permission, pull_request_target, release path, high finding, and score change", async () => {
    const oldReport = await scanRepository(path.join(process.cwd(), "test/fixtures/basic"), options());
    const newReport = await scanRepository(path.join(process.cwd(), "test/fixtures/risky"), options());
    const diff = diffReports(oldReport, newReport);

    expect(diff.changes.some((change) => change.changeType === "new-action")).toBe(true);
    expect(diff.changes.some((change) => change.changeType === "new-secret")).toBe(true);
    expect(diff.changes.some((change) => change.changeType === "new-write-permission")).toBe(true);
    expect(diff.changes.some((change) => change.changeType === "new-pull-request-target")).toBe(true);
    expect(diff.changes.some((change) => change.changeType === "new-release-path")).toBe(true);
    expect(diff.changes.some((change) => change.changeType === "new-high-finding")).toBe(true);
    expect(diff.changes.some((change) => change.changeType === "risk-score-change")).toBe(true);
  });

  it("detects changed action refs and markdown includes changed risks", async () => {
    const oldReport = await scanRepository(path.join(process.cwd(), "test/fixtures/basic"), options());
    const newReport = structuredClone(oldReport);
    newReport.actions[0]!.raw = "actions/checkout@1111111111111111111111111111111111111111";
    newReport.actions[0]!.ref = "1111111111111111111111111111111111111111";
    newReport.actions[0]!.refType = "full-sha";
    const diff = diffReports(oldReport, newReport);
    expect(diff.changes.some((change) => change.changeType === "changed-action-ref")).toBe(true);
    expect(renderMarkdown(diff)).toContain("gha-bom diff");
  });
});
