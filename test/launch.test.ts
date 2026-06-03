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
    expect(readme.split(/\r?\n/).length).toBeGreaterThan(80);
    expect(readme).toContain(fencedCommand("npx gha-bom scan ."));
    expect(readme).toContain(fencedCommand("npx gha-bom demo"));
    expect(readme).toContain(fencedCommand("gha-bom init"));
    expect(readme).not.toContain(["Terminal GIF", " coming soon"].join(""));
    expect(readme).not.toContain("YOUR_USERNAME");
    expect(readme).not.toContain("TODO");
    expect(readme).not.toContain("placeholder");
    expect(readme).not.toContain("unpublished");
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

  it("README local links point at committed files", async () => {
    await expectExists("docs/assets/demo-output.txt");
    await expectExists("docs/assets/demo-output.md");
    await expectExists("docs/assets/demo-report.html");
    await expectExists("docs/sample-report.md");
    await expectExists("docs/sample-diff.md");
    await expectExists("docs/sample-report.html");
    await expectExists("CONTRIBUTING.md");
    await expectExists("LICENSE");
  });

  it("package contents are configured for npm", async () => {
    const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));
    expect(packageJson.name).toBe("gha-bom");
    expect(packageJson.version).toBe("0.1.2");
    expect(packageJson.description).toBe("Offline GitHub Actions bill of materials, risk map, and diff tool.");
    expect(packageJson.bin).toEqual({
      "gha-bom": "dist/cli.js",
      gbom: "dist/cli.js"
    });
    expect(normalizeRepositoryUrl(packageJson.repository)).toBe("https://github.com/iDogRoag/gha-bom");
    expect(packageJson.bugs.url).toBe("https://github.com/iDogRoag/gha-bom/issues");
    expect(packageJson.homepage).toBe("https://github.com/iDogRoag/gha-bom#readme");
    expect(packageJson.files).toEqual([
      "dist",
      "README.md",
      "LICENSE",
      "CHANGELOG.md",
      "LAUNCH.md",
      "SECURITY.md",
      "CONTRIBUTING.md",
      "CODE_OF_CONDUCT.md",
      "docs",
      "examples",
      "package.json"
    ]);
  });

  it("npm publish checklist covers manual publish and verification", async () => {
    const checklist = await fs.readFile("docs/npm-publish-check.md", "utf8");
    expect(checklist).toContain("npm publish");
    expect(checklist).toContain("npx gha-bom@latest demo");
    expect(checklist).toContain("npx gha-bom@latest scan . --format markdown");
    expect(checklist).toContain("do not republish the");
    expect(checklist).toContain("If `gha-bom` is unavailable on npm, stop.");
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

function fencedCommand(command: string): string {
  return `\`\`\`sh\n${command}\n\`\`\``;
}

function normalizeRepositoryUrl(repository: unknown): string {
  const raw =
    typeof repository === "string"
      ? repository
      : repository && typeof repository === "object" && "url" in repository
        ? String(repository.url)
        : "";
  return raw.replace(/^git\+/, "").replace(/\.git$/, "");
}
