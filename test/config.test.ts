import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("config", () => {
  it("uses defaults when config is missing", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gha-bom-config-"));
    const result = await loadConfig(dir);
    expect(result.config.minScore).toBe(80);
    expect(result.warnings[0]?.title).toBe("Config missing");
  });

  it("validates config with field path errors", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gha-bom-config-"));
    await fs.writeFile(path.join(dir, "gha-bom.yml"), "version: 1\nminScore: 200\n", "utf8");
    await expect(loadConfig(dir)).rejects.toThrow(/minScore/);
  });
});
