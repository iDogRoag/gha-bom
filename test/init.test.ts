import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { initConfig } from "../src/init.js";

describe("init", () => {
  it("writes config and does not overwrite without force", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gha-bom-init-"));
    const configPath = await initConfig(dir);
    expect(await fs.readFile(configPath, "utf8")).toContain("version: 1");
    await expect(initConfig(dir)).rejects.toThrow(/already exists/);
    await expect(initConfig(dir, true)).resolves.toBe(configPath);
  });
});
