import type { RunnerInfo } from "../types.js";

const GITHUB_HOSTED_PREFIXES = ["ubuntu-", "windows-", "macos-"];

export function classifyRunner(raw: unknown): RunnerInfo {
  if (typeof raw === "string") {
    if (raw.includes("${{")) {
      return { raw, labels: [raw], kind: "matrix" };
    }

    if (raw === "self-hosted") {
      return { raw, labels: [raw], kind: "self-hosted" };
    }

    if (GITHUB_HOSTED_PREFIXES.some((prefix) => raw.startsWith(prefix))) {
      return { raw, labels: [raw], kind: "github-hosted" };
    }

    if (raw.includes("larger") || raw.includes("arc-runner")) {
      return { raw, labels: [raw], kind: "larger-runner" };
    }

    return { raw, labels: [raw], kind: "unknown" };
  }

  if (Array.isArray(raw)) {
    const labels = raw.map(String);
    if (labels.includes("self-hosted")) {
      return { raw, labels, kind: "self-hosted" };
    }

    if (labels.some((label) => label.includes("${{"))) {
      return { raw, labels, kind: "matrix" };
    }

    return { raw, labels, kind: "unknown" };
  }

  if (raw && typeof raw === "object") {
    return { raw, labels: ["<expression>"], kind: "matrix" };
  }

  return { raw, labels: [], kind: "unknown" };
}
