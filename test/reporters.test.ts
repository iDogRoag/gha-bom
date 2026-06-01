import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanRepository } from "../src/analyzer.js";
import { renderHtml } from "../src/reporters/html.js";
import { renderJson } from "../src/reporters/json.js";
import { renderMarkdown } from "../src/reporters/markdown.js";
import { renderTable } from "../src/reporters/table.js";
import { options } from "./analyzer.test.js";

describe("reporters", () => {
  it("JSON reporter emits valid schema", async () => {
    const report = await reportFixture();
    const parsed = JSON.parse(renderJson(report));
    expect(parsed.schemaVersion).toBe(1);
  });

  it("Markdown reporter includes summary and findings", async () => {
    const report = await reportFixture();
    const markdown = renderMarkdown(report);
    expect(markdown).toContain("gha-bom report");
    expect(markdown).toContain("Top findings");
  });

  it("HTML reporter escapes content", async () => {
    const report = await reportFixture();
    report.findings[0]!.title = "<script>alert(1)</script>";
    const html = renderHtml(report);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("Table reporter includes score and top risks", async () => {
    const report = await reportFixture();
    const table = renderTable(report);
    expect(table).toContain("Risk score");
    expect(table).toContain("Top risks");
  });
});

async function reportFixture() {
  return scanRepository(path.join(process.cwd(), "test/fixtures/risky"), options());
}
