import path from "node:path";
import { normalizePermissions } from "./detectors/permissions.js";
import { parseActionReference } from "./detectors/actions.js";
import { detectEnvReferences } from "./detectors/env.js";
import { classifyRunner } from "./detectors/runners.js";
import { normalizeTriggers } from "./detectors/triggers.js";
import type { Finding, LocationRef, WorkflowBom, WorkflowJob, WorkflowStep } from "./types.js";
import { readText } from "./utils/fs.js";
import { relativePosix } from "./utils/path.js";
import { stableId } from "./utils/text.js";
import { isRecord, parseYaml } from "./utils/yaml.js";

export interface ParseWorkflowResult {
  workflow: WorkflowBom;
  findings: Finding[];
}

export async function parseWorkflowFile(root: string, absolutePath: string): Promise<ParseWorkflowResult> {
  const filePath = relativePosix(root, absolutePath);
  const source = await readText(absolutePath);
  const parsed = parseYaml(source);

  if (parsed.errors.length > 0 || !isRecord(parsed.value)) {
    const message = parsed.errors.join("; ") || "Workflow YAML did not parse to an object.";
    const workflow: WorkflowBom = {
      filePath,
      valid: false,
      triggers: [],
      permissions: normalizePermissions(undefined, "workflow"),
      env: [],
      jobs: [],
      parseError: message
    };

    return {
      workflow,
      findings: [
        {
          id: stableId("invalid-yaml", filePath, message),
          severity: "high",
          confidence: "high",
          title: "Invalid workflow YAML",
          message: "gha-bom could not fully parse this workflow, so inventory for this file is incomplete.",
          filePath,
          evidence: message,
          recommendation: "Fix the YAML parse error so static analysis can continue for this workflow.",
          category: "parse-error"
        }
      ]
    };
  }

  const doc = parsed.value;
  const workflowName = typeof doc.name === "string" ? doc.name : path.basename(filePath);
  const workflow: WorkflowBom = {
    filePath,
    name: workflowName,
    valid: true,
    triggers: normalizeTriggers(doc.on),
    permissions: normalizePermissions(doc.permissions, "workflow"),
    env: detectEnvReferences(doc.env, { filePath, workflowName }),
    defaults: doc.defaults,
    concurrency: doc.concurrency,
    jobs: parseJobs(filePath, workflowName, doc.jobs, doc.permissions)
  };

  return { workflow, findings: [] };
}

function parseJobs(filePath: string, workflowName: string, jobsRaw: unknown, workflowPermissions: unknown): WorkflowJob[] {
  if (!isRecord(jobsRaw)) {
    return [];
  }

  return Object.entries(jobsRaw).flatMap(([jobId, rawJob]) => {
    if (!isRecord(rawJob)) {
      return [];
    }

    const jobPermissionsRaw = "permissions" in rawJob ? rawJob.permissions : workflowPermissions;
    const jobLocation: LocationRef = { filePath, workflowName, jobId };
    const job: WorkflowJob = {
      jobId,
      name: typeof rawJob.name === "string" ? rawJob.name : undefined,
      runsOn: classifyRunner(rawJob["runs-on"]),
      permissions: normalizePermissions(jobPermissionsRaw, "permissions" in rawJob ? "job" : "workflow"),
      needs: parseNeeds(rawJob.needs),
      if: typeof rawJob.if === "string" ? rawJob.if : undefined,
      environment: parseEnvironment(rawJob.environment),
      container: rawJob.container,
      services: rawJob.services,
      strategy: rawJob.strategy,
      uses: typeof rawJob.uses === "string" ? rawJob.uses : undefined,
      secretsInherit: rawJob.secrets === "inherit",
      env: detectEnvReferences(rawJob.env, jobLocation),
      steps: []
    };

    if (job.uses) {
      const action = parseActionReference(job.uses, jobLocation);
      job.steps = [
        {
          index: 0,
          name: `Reusable workflow ${job.uses}`,
          uses: job.uses,
          env: [],
          action
        }
      ];
    } else {
      job.steps = parseSteps(filePath, workflowName, jobId, rawJob.steps);
    }

    return [job];
  });
}

function parseSteps(filePath: string, workflowName: string, jobId: string, stepsRaw: unknown): WorkflowStep[] {
  if (!Array.isArray(stepsRaw)) {
    return [];
  }

  return stepsRaw.flatMap((rawStep, index) => {
    if (!isRecord(rawStep)) {
      return [];
    }

    const location: LocationRef = {
      filePath,
      workflowName,
      jobId,
      stepName: typeof rawStep.name === "string" ? rawStep.name : undefined,
      stepIndex: index
    };
    const uses = typeof rawStep.uses === "string" ? rawStep.uses : undefined;
    const step: WorkflowStep = {
      index,
      name: typeof rawStep.name === "string" ? rawStep.name : undefined,
      id: typeof rawStep.id === "string" ? rawStep.id : undefined,
      uses,
      run: typeof rawStep.run === "string" ? rawStep.run : undefined,
      with: isRecord(rawStep.with) ? rawStep.with : undefined,
      env: detectEnvReferences(rawStep.env, location),
      shell: typeof rawStep.shell === "string" ? rawStep.shell : undefined,
      workingDirectory: typeof rawStep["working-directory"] === "string" ? rawStep["working-directory"] : undefined
    };

    if (uses) {
      step.action = parseActionReference(uses, location);
    }

    return [step];
  });
}

function parseNeeds(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.map(String);
  }

  return [];
}

function parseEnvironment(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (isRecord(value) && typeof value.name === "string") {
    return value.name;
  }

  return undefined;
}
