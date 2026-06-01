#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { Command, InvalidArgumentError } from "commander";
import { scanRepository } from "./analyzer.js";
import { ConfigError, loadConfig, mergeCliConfig } from "./config.js";
import { diffReports } from "./diff.js";
import { renderDoctor, runDoctor } from "./doctor.js";
import { explainWorkflow } from "./explain.js";
import { initConfig } from "./init.js";
import { renderHtml } from "./reporters/html.js";
import { renderJson } from "./reporters/json.js";
import { renderMarkdown } from "./reporters/markdown.js";
import { renderTable } from "./reporters/table.js";
import type { CliScanOptions, DiffReport, FailPolicy, OutputFormat, Report } from "./types.js";
import { writeText } from "./utils/fs.js";

const VERSION = "0.1.0";
const OUTPUT_FORMATS = ["table", "json", "markdown", "html"] as const;
const FAIL_POLICIES = [
  "none",
  "high",
  "medium",
  "score-below",
  "new-high",
  "new-secret",
  "new-write-permission",
  "new-unpinned-action"
] as const;

const program = new Command();

program
  .name("gha-bom")
  .description("Offline GitHub Actions bill of materials, risk map, and diff tool.")
  .version(VERSION);

program
  .command("scan")
  .argument("[path]", "repository path", ".")
  .description("Scan local GitHub Actions workflows and print a report.")
  .option("--format <format>", "table, json, markdown, or html", parseFormat, "table")
  .option("--output <file>", "write selected report format to a file")
  .option("--config <file>", "use config file")
  .option("--include <glob>", "include glob; can be repeated", collect, [])
  .option("--exclude <glob>", "exclude glob; can be repeated", collect, [])
  .option("--show-workflows", "show workflow-level details", false)
  .option("--show-jobs", "show job-level details", false)
  .option("--show-steps", "show step-level details", false)
  .option("--show-secrets", "show secret names referenced in workflows", false)
  .option("--show-env", "show environment variable names", false)
  .option("--min-score <number>", "minimum acceptable risk score", parseScore)
  .option("--fail-on <policy>", "none, high, medium, score-below, new-high, new-secret, new-write-permission, new-unpinned-action", parseFailPolicy)
  .option("--ci", "machine-friendly mode", false)
  .option("--quiet", "only print final result and errors", false)
  .option("--verbose", "print parser and detection details", false)
  .action(async (targetPath: string, rawOptions: Partial<CliScanOptions>) => {
    await withErrors(async () => {
      const options = normalizeScanOptions(rawOptions);
      const report = await scanRepository(targetPath, options);
      const rendered = renderOutput(report, options.format);
      await maybeWriteOrPrint(rendered, options.output, options.quiet);
      const config = await effectiveConfig(targetPath, options);
      const failed = evaluateScanPolicy(report, config.failOn, config.minScore);
      process.exitCode = failed ? 1 : 0;
    });
  });

program
  .command("explain")
  .argument("<workflow-file>", "workflow file to explain")
  .description("Explain one workflow in detail.")
  .option("--format <format>", "table, json, markdown, or html", parseFormat, "table")
  .option("--output <file>", "write selected report format to a file")
  .option("--config <file>", "use config file")
  .option("--show-workflows", "show workflow-level details", true)
  .option("--show-jobs", "show job-level details", true)
  .option("--show-steps", "show step-level details", true)
  .option("--show-secrets", "show secret names referenced in workflows", true)
  .option("--show-env", "show environment variable names", true)
  .option("--ci", "machine-friendly mode", false)
  .option("--quiet", "only print final result and errors", false)
  .option("--verbose", "print parser and detection details", false)
  .action(async (workflowFile: string, rawOptions: Partial<CliScanOptions>) => {
    await withErrors(async () => {
      const options = normalizeScanOptions(rawOptions);
      const rendered = await explainWorkflow(workflowFile, options);
      await maybeWriteOrPrint(rendered, options.output, options.quiet);
    });
  });

program
  .command("diff")
  .argument("<old-report.json>", "old gha-bom JSON report")
  .argument("<new-report.json>", "new gha-bom JSON report")
  .description("Compare two gha-bom JSON reports.")
  .option("--format <format>", "table, json, markdown, or html", parseFormat, "table")
  .option("--output <file>", "write selected diff format to a file")
  .option("--fail-on <policy>", "new-high, new-secret, new-write-permission, new-unpinned-action, score-below, high, medium, or none", parseFailPolicy, "none")
  .option("--min-score <number>", "minimum acceptable new risk score", parseScore, 80)
  .option("--quiet", "only print final result and errors", false)
  .action(async (oldPath: string, newPath: string, options: { format: OutputFormat; output?: string; failOn: FailPolicy; minScore: number; quiet: boolean }) => {
    await withErrors(async () => {
      const oldReport = await readReport(oldPath);
      const newReport = await readReport(newPath);
      const diff = diffReports(oldReport, newReport);
      const rendered = renderOutput(diff, options.format);
      await maybeWriteOrPrint(rendered, options.output, options.quiet);
      process.exitCode = evaluateDiffPolicy(diff, options.failOn, options.minScore) ? 1 : 0;
    });
  });

program
  .command("init")
  .argument("[path]", "target directory", ".")
  .description("Create a starter gha-bom.yml config.")
  .option("--force", "overwrite an existing config", false)
  .action(async (targetPath: string, options: { force: boolean }) => {
    await withErrors(async () => {
      const configPath = await initConfig(targetPath, options.force);
      process.stdout.write(`Created ${configPath}\n`);
    });
  });

program
  .command("doctor")
  .description("Check local prerequisites.")
  .action(async () => {
    await withErrors(async () => {
      const result = runDoctor();
      process.stdout.write(renderDoctor(result));
      process.exitCode = result.ok ? 0 : 2;
    });
  });

await program.parseAsync(process.argv);

function normalizeScanOptions(raw: Partial<CliScanOptions>): CliScanOptions {
  return {
    format: raw.format ?? "table",
    output: raw.output,
    config: raw.config,
    include: raw.include ?? [],
    exclude: raw.exclude ?? [],
    showWorkflows: Boolean(raw.showWorkflows),
    showJobs: Boolean(raw.showJobs),
    showSteps: Boolean(raw.showSteps),
    showSecrets: Boolean(raw.showSecrets),
    showEnv: Boolean(raw.showEnv),
    minScore: raw.minScore,
    failOn: raw.failOn,
    ci: Boolean(raw.ci),
    quiet: Boolean(raw.quiet),
    verbose: Boolean(raw.verbose)
  };
}

async function effectiveConfig(targetPath: string, options: CliScanOptions) {
  const root = path.resolve(targetPath || process.cwd());
  const loaded = await loadConfig(root, options.config);
  return mergeCliConfig(loaded.config, {
    include: options.include,
    exclude: options.exclude,
    minScore: options.minScore,
    failOn: options.failOn
  });
}

function renderOutput(data: Report | DiffReport, format: OutputFormat): string {
  if (format === "json") {
    return renderJson(data);
  }

  if (format === "markdown") {
    return renderMarkdown(data);
  }

  if (format === "html") {
    return renderHtml(data);
  }

  return renderTable(data);
}

async function maybeWriteOrPrint(rendered: string, output: string | undefined, quiet: boolean): Promise<void> {
  if (output) {
    await writeText(output, rendered);
    if (!quiet) {
      process.stdout.write(`Wrote ${output}\n`);
    }
    return;
  }

  if (!quiet) {
    process.stdout.write(rendered);
  }
}

function evaluateScanPolicy(report: Report, policies: FailPolicy[], minScore: number): boolean {
  return policies.some((policy) => {
    if (policy === "none") {
      return false;
    }

    if (policy === "high") {
      return report.findings.some((finding) => finding.severity === "high");
    }

    if (policy === "medium") {
      return report.findings.some((finding) => finding.severity === "high" || finding.severity === "medium");
    }

    if (policy === "score-below") {
      return report.score.value < minScore;
    }

    return false;
  });
}

function evaluateDiffPolicy(diff: DiffReport, policy: FailPolicy, minScore: number): boolean {
  if (policy === "none") {
    return false;
  }

  if (policy === "high" || policy === "new-high") {
    return diff.changes.some((change) => change.severity === "high" || change.changeType === "new-high-finding");
  }

  if (policy === "medium") {
    return diff.changes.some((change) => change.severity === "high" || change.severity === "medium");
  }

  if (policy === "new-secret") {
    return diff.changes.some((change) => change.changeType === "new-secret");
  }

  if (policy === "new-write-permission") {
    return diff.changes.some((change) => change.changeType === "new-write-permission");
  }

  if (policy === "new-unpinned-action") {
    return diff.changes.some((change) => change.changeType === "new-unpinned-action" || change.changeType === "action-unpinned");
  }

  if (policy === "score-below") {
    return diff.summary.newScore < minScore;
  }

  return false;
}

async function readReport(filePath: string): Promise<Report> {
  const source = await fs.readFile(filePath, "utf8");
  return JSON.parse(source) as Report;
}

function parseFormat(value: string): OutputFormat {
  if (!OUTPUT_FORMATS.includes(value as OutputFormat)) {
    throw new InvalidArgumentError(`Expected one of ${OUTPUT_FORMATS.join(", ")}`);
  }

  return value as OutputFormat;
}

function parseFailPolicy(value: string): FailPolicy {
  if (!FAIL_POLICIES.includes(value as FailPolicy)) {
    throw new InvalidArgumentError(`Expected one of ${FAIL_POLICIES.join(", ")}`);
  }

  return value as FailPolicy;
}

function parseScore(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    throw new InvalidArgumentError("Expected an integer from 0 to 100");
  }

  return parsed;
}

function collect(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}

async function withErrors(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = error instanceof ConfigError ? 2 : 2;
  }
}
