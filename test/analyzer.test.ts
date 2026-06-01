import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanRepository } from "../src/analyzer.js";
import type { CliScanOptions } from "../src/types.js";

describe("analyzer", () => {
  it("scans a basic fixture", async () => {
    const report = await scanRepository(fixture("basic"), options());
    expect(report.summary.workflowsScanned).toBe(1);
    expect(report.summary.jobsScanned).toBe(1);
    expect(report.actions.map((action) => action.raw)).toContain("actions/checkout@v6");
  });

  it("detects OIDC and cloud deploy paths", async () => {
    const report = await scanRepository(fixture("oidc"), options());
    expect(report.oidc.some((use) => use.evidence === "id-token: write")).toBe(true);
    expect(report.releasePaths.some((release) => release.type === "deployment")).toBe(true);
  });

  it("includes local composite action nested uses", async () => {
    const report = await scanRepository(fixture("composite"), options());
    expect(report.actions.map((action) => action.raw)).toContain("some-owner/nested-action@main");
  });

  it("detects release paths and secrets", async () => {
    const report = await scanRepository(fixture("release"), options());
    expect(report.releasePaths.length).toBeGreaterThan(0);
    expect(report.secrets.some((secret) => secret.name === "GITHUB_TOKEN")).toBe(true);
  });
});

function fixture(name: string): string {
  return path.join(process.cwd(), "test/fixtures", name);
}

export function options(): CliScanOptions {
  return {
    format: "json",
    include: [],
    exclude: [],
    showWorkflows: false,
    showJobs: false,
    showSteps: false,
    showSecrets: false,
    showEnv: false,
    badge: false,
    ci: true,
    quiet: true,
    verbose: false
  };
}
