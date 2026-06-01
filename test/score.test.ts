import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanRepository } from "../src/analyzer.js";
import { labelFor } from "../src/score.js";
import { options } from "./analyzer.test.js";

describe("score", () => {
  it("clean workflow gets a high score", async () => {
    const report = await scanRepository(path.join(process.cwd(), "test/fixtures/basic"), options());
    expect(report.score.value).toBeGreaterThanOrEqual(70);
  });

  it("write-all and risky behavior lowers score", async () => {
    const report = await scanRepository(path.join(process.cwd(), "test/fixtures/risky"), options());
    expect(report.score.value).toBeLessThan(70);
  });

  it("score is clamped from 0 to 100", async () => {
    const report = await scanRepository(path.join(process.cwd(), "test/fixtures/risky"), options());
    expect(report.score.value).toBeGreaterThanOrEqual(0);
    expect(report.score.value).toBeLessThanOrEqual(100);
  });

  it("score labels are correct", () => {
    expect(labelFor(95)).toBe("low risk");
    expect(labelFor(80)).toBe("moderate risk");
    expect(labelFor(60)).toBe("high risk");
    expect(labelFor(20)).toBe("critical risk");
  });
});
