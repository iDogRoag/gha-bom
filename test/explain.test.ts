import path from "node:path";
import { describe, expect, it } from "vitest";
import { explainWorkflow } from "../src/explain.js";
import { options } from "./analyzer.test.js";

describe("explain", () => {
  it("explains a fixture workflow", async () => {
    const text = await explainWorkflow(path.join(process.cwd(), "test/fixtures/risky/.github/workflows/risky.yml"), {
      ...options(),
      format: "markdown"
    });
    expect(text).toContain("Risky");
    expect(text).toContain("Top findings");
  });
});
