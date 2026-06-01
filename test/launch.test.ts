import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("launch readiness docs", () => {
  it("README contains launch quickstart and positioning", async () => {
    const readme = await fs.readFile("README.md", "utf8");
    expect(readme).toContain("npx gha-bom scan .");
    expect(readme).toContain("npx gha-bom demo");
    expect(readme).toContain("## How gha-bom is different");
    expect(readme).toContain("static offline analysis");
    expect(readme).toContain("do not call the GitHub API by default");
    const removedPlaceholder = ["Terminal GIF", " coming soon"].join("");
    expect(readme).not.toContain(removedPlaceholder);
  });

  it("launch docs exist", async () => {
    await expectExists("LAUNCH.md");
    await expectExists("docs/share-copy.md");
    await expectExists("docs/repo-topics.md");
    await expectExists("docs/good-first-issues.md");
    await expectExists("docs/release-checklist.md");
    await expectExists("docs/codex-oss-application.md");
    await expectExists("docs/issue-seeds.md");
    await expectExists("docs/sample-report.md");
    await expectExists("docs/sample-diff.md");
    await expectExists("docs/npm-publish-check.md");
  });

  it("package contents are configured for npm", async () => {
    const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));
    expect(packageJson.files).toEqual(
      expect.arrayContaining(["dist", "README.md", "LICENSE", "CHANGELOG.md", "package.json", "docs", "examples"])
    );
    expect(packageJson.files).not.toEqual(expect.arrayContaining(["src", "test", "coverage"]));
  });

  it("demo command still works", () => {
    const result = runCli(["demo"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("gha-bom");
    expect(result.stdout).toContain("Top risks");
  });

  it("badge output still works", () => {
    const result = runCli(["scan", "examples/risky", "--badge"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("![gha-bom risk score]");
    expect(result.stdout).toContain("img.shields.io/badge/gha--bom-risk");
  });
});

async function expectExists(filePath: string): Promise<void> {
  await expect(fs.stat(filePath)).resolves.toBeTruthy();
}

function runCli(args: string[]) {
  return spawnSync(process.execPath, ["--import", "tsx", "src/cli.ts", ...args], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
}
