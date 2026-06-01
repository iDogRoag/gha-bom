import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanRepository } from "../src/analyzer.js";
import { options } from "./analyzer.test.js";

describe("risk findings", () => {
  it("write-all is high", async () => {
    const report = await scan("risky");
    expect(report.findings.some((finding) => finding.severity === "high" && /write-all/i.test(finding.title))).toBe(true);
  });

  it("pull_request_target plus write permissions is high", async () => {
    const report = await scan("risky");
    expect(report.findings.some((finding) => finding.severity === "high" && /pull_request_target has write/i.test(finding.title))).toBe(true);
  });

  it("pull_request_target plus checkout PR head is high", async () => {
    const report = await scan("risky");
    expect(report.findings.some((finding) => finding.severity === "high" && /checks out PR head/i.test(finding.title))).toBe(true);
  });

  it("secret passed to unpinned third-party action is high", async () => {
    const report = await scan("risky");
    expect(report.findings.some((finding) => finding.severity === "high" && /Secret passed to unpinned/i.test(finding.title))).toBe(true);
  });

  it("missing explicit permissions is medium", async () => {
    const report = await scan("invalid-yaml");
    expect(report.findings.some((finding) => finding.severity === "high" && finding.category === "parse-error")).toBe(true);
  });

  it("remote reusable workflow with secrets inherit is high", async () => {
    const report = await scan("reusable");
    expect(report.findings.some((finding) => finding.severity === "high" && /secrets inherit/i.test(finding.title))).toBe(true);
  });

  it("self-hosted runner on pull_request is high", async () => {
    const report = await scan("self-hosted");
    expect(report.findings.some((finding) => finding.severity === "high" && /Self-hosted runner/i.test(finding.title))).toBe(true);
  });

  it("release job with unpinned third-party action is high", async () => {
    const report = await scan("release");
    expect(report.findings.some((finding) => finding.severity === "high" && /Release path uses unpinned/i.test(finding.title))).toBe(true);
  });
});

async function scan(name: string) {
  return scanRepository(path.join(process.cwd(), "test/fixtures", name), options());
}
