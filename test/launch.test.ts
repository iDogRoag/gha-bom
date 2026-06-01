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
  });

  it("launch docs exist", async () => {
    await expectExists("LAUNCH.md");
    await expectExists("docs/share-copy.md");
    await expectExists("docs/repo-topics.md");
    await expectExists("docs/good-first-issues.md");
    await expectExists("docs/release-checklist.md");
  });
});

async function expectExists(filePath: string): Promise<void> {
  await expect(fs.stat(filePath)).resolves.toBeTruthy();
}
