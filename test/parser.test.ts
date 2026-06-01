import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseWorkflowFile } from "../src/parser.js";

describe("parser", () => {
  it("parses a basic workflow", async () => {
    const result = await parseWorkflowFile(process.cwd(), fixture("basic/.github/workflows/ci.yml"));
    expect(result.workflow.name).toBe("CI");
    expect(result.workflow.triggers.map((trigger) => trigger.name)).toEqual(["pull_request", "push"]);
    expect(result.workflow.jobs[0]?.steps.some((step) => step.uses === "actions/checkout@v6")).toBe(true);
  });

  it("parses on as string", async () => {
    const file = await tempWorkflow("on: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hi\n");
    const result = await parseWorkflowFile(path.dirname(path.dirname(path.dirname(file))), file);
    expect(result.workflow.triggers.map((trigger) => trigger.name)).toEqual(["push"]);
  });

  it("parses on as array", async () => {
    const file = await tempWorkflow("on: [push, pull_request]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hi\n");
    const result = await parseWorkflowFile(path.dirname(path.dirname(path.dirname(file))), file);
    expect(result.workflow.triggers.map((trigger) => trigger.name)).toEqual(["push", "pull_request"]);
  });

  it("parses on as object", async () => {
    const file = await tempWorkflow("on:\n  push:\n    branches: [main]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hi\n");
    const result = await parseWorkflowFile(path.dirname(path.dirname(path.dirname(file))), file);
    expect(result.workflow.triggers[0]?.name).toBe("push");
  });

  it("parses workflow and job permissions", async () => {
    const result = await parseWorkflowFile(process.cwd(), fixture("release/.github/workflows/release.yml"));
    expect(result.workflow.permissions.scopes.contents).toBe("write");
    expect(result.workflow.jobs[0]?.permissions.scopes.packages).toBe("write");
  });

  it("parses reusable workflow jobs", async () => {
    const result = await parseWorkflowFile(process.cwd(), fixture("reusable/.github/workflows/caller.yml"));
    expect(result.workflow.jobs[0]?.uses).toBe("acme/ci/.github/workflows/reuse.yml@v1");
    expect(result.workflow.jobs[0]?.secretsInherit).toBe(true);
  });

  it("invalid YAML produces a high parse finding", async () => {
    const result = await parseWorkflowFile(process.cwd(), fixture("invalid-yaml/.github/workflows/bad.yml"));
    expect(result.workflow.valid).toBe(false);
    expect(result.findings[0]?.severity).toBe("high");
  });
});

function fixture(relative: string): string {
  return path.join(process.cwd(), "test/fixtures", relative);
}

async function tempWorkflow(content: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gha-bom-parser-"));
  const workflowDir = path.join(dir, ".github/workflows");
  await fs.mkdir(workflowDir, { recursive: true });
  const file = path.join(workflowDir, "test.yml");
  await fs.writeFile(file, content, "utf8");
  return file;
}
