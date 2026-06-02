import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const CLI = ["--import", "tsx", "src/cli.ts"];

describe("cli", () => {
  it("gha-bom --help works", () => {
    const result = run(["--help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("gha-bom");
  });

  it("gha-bom scan fixture works", () => {
    const result = run(["scan", "test/fixtures/basic"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Risk score");
  });

  it("gha-bom scan fixture works as JSON", () => {
    const result = run(["scan", "test/fixtures/basic", "--format", "json"]);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).schemaVersion).toBe(1);
  });

  it("gha-bom demo works", () => {
    const result = run(["demo"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("gha-bom");
    expect(result.stdout).toContain("Top risks");
  });

  it("gbom demo works through the shared bin target", async () => {
    const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));
    expect(packageJson.bin.gbom).toBe(packageJson.bin["gha-bom"]);
    const result = run(["demo"]);
    expect(result.status).toBe(0);
  });

  it("gha-bom demo --format json works", () => {
    const result = run(["demo", "--format", "json"]);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).summary.workflowsScanned).toBe(1);
  });

  it("gha-bom demo --format markdown works", () => {
    const result = run(["demo", "--format", "markdown"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("# gha-bom report");
  });

  it("gha-bom demo --format html --output works", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gha-bom-demo-html-"));
    const output = path.join(dir, "demo.html");
    const result = run(["demo", "--format", "html", "--output", output]);
    expect(result.status).toBe(0);
    expect(await fs.readFile(output, "utf8")).toContain("<!doctype html>");
  });

  it("gha-bom explain fixture workflow works", () => {
    const result = run(["explain", "test/fixtures/risky/.github/workflows/risky.yml", "--format", "markdown"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Risky");
  });

  it("gha-bom diff old new works", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gha-bom-cli-"));
    const oldReport = path.join(dir, "old.json");
    const newReport = path.join(dir, "new.json");
    expect(run(["scan", "test/fixtures/basic", "--format", "json", "--output", oldReport, "--quiet"]).status).toBe(0);
    expect(run(["scan", "test/fixtures/risky", "--format", "json", "--output", newReport, "--quiet"]).status).toBe(0);
    const diff = run(["diff", oldReport, newReport, "--format", "markdown"]);
    expect(diff.status).toBe(0);
    expect(diff.stdout).toContain("gha-bom diff");
  });

  it("gha-bom init writes config", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gha-bom-cli-init-"));
    const result = run(["init", dir]);
    expect(result.status).toBe(0);
    expect(await fs.readFile(path.join(dir, "gha-bom.yml"), "utf8")).toContain("version: 1");
  });

  it("invalid config exits 2", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gha-bom-cli-config-"));
    await fs.mkdir(path.join(dir, ".github/workflows"), { recursive: true });
    await fs.writeFile(path.join(dir, ".github/workflows/ci.yml"), "on: push\njobs: {}\n", "utf8");
    await fs.writeFile(path.join(dir, "gha-bom.yml"), "version: 1\nminScore: 999\n", "utf8");
    const result = run(["scan", dir]);
    expect(result.status).toBe(2);
  });

  it("fail-on high exits 1 when high finding exists", () => {
    const result = run(["scan", "test/fixtures/risky", "--fail-on", "high"]);
    expect(result.status).toBe(1);
  });

  it("fail-on none exits 0 even with findings", () => {
    const result = run(["scan", "test/fixtures/risky", "--fail-on", "none"]);
    expect(result.status).toBe(0);
  });

  it("output file is written and package exposes gbom alias", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gha-bom-cli-output-"));
    const output = path.join(dir, "report.md");
    const result = run(["scan", "test/fixtures/basic", "--format", "markdown", "--output", output]);
    expect(result.status).toBe(0);
    expect(await fs.readFile(output, "utf8")).toContain("gha-bom report");
    const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));
    expect(packageJson.bin.gbom).toBe("dist/cli.js");
  });

  it("--badge outputs badge Markdown", () => {
    const result = run(["scan", "test/fixtures/risky", "--badge"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("![gha-bom risk score]");
    expect(result.stdout).toContain("img.shields.io/badge/gha--bom-risk");
  });

  it("JSON output includes badge object when --badge is used", () => {
    const result = run(["scan", "test/fixtures/risky", "--format", "json", "--badge"]);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).badge.markdown).toContain("img.shields.io");
  });

  it("no workflow repo exits 0 and suggests demo", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gha-bom-empty-"));
    const result = run(["scan", dir]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("No GitHub Actions workflows found.");
    expect(result.stdout).toContain("Try gha-bom demo");
  });

  it("default terminal output limits findings to top 5", () => {
    const result = run(["scan", "test/fixtures/risky"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Showing top 5 findings.");
  });
});

function run(args: string[]) {
  return spawnSync(process.execPath, [...CLI, ...args], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
}
