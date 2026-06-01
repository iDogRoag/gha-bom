import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/config.js";
import { discoverWorkflowFiles } from "../src/discover.js";

describe("discover", () => {
  it("discovers workflow files", async () => {
    const files = await discoverWorkflowFiles(path.join(process.cwd(), "test/fixtures/basic"), DEFAULT_CONFIG);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/ci\.yml$/);
  });
});
