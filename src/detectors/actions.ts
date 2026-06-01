import type { ActionReference, ActionReferenceKind, ActionRefType, LocationRef } from "../types.js";

const FULL_SHA_RE = /^[a-f0-9]{40}$/i;
const SHORT_SHA_RE = /^[a-f0-9]{7,39}$/i;
const SEMVER_RE = /^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const MAJOR_RE = /^v?\d+$/;

export function parseActionReference(raw: string, location: LocationRef): ActionReference {
  if (raw.startsWith("docker://")) {
    const image = raw.slice("docker://".length);
    const ref = image.includes(":") ? image.split(":").pop() : undefined;
    return {
      raw,
      kind: "docker-action",
      path: image,
      ref,
      refType: ref ? "mutable-ref" : "missing",
      refMutable: true,
      location
    };
  }

  if (raw.startsWith("./") || raw.startsWith("../")) {
    const kind: ActionReferenceKind = raw.includes(".github/workflows/")
      ? "reusable-workflow-local"
      : "local-action";
    return {
      raw,
      kind,
      path: raw,
      refType: "missing",
      refMutable: false,
      location
    };
  }

  const atIndex = raw.lastIndexOf("@");
  const withoutRef = atIndex >= 0 ? raw.slice(0, atIndex) : raw;
  const ref = atIndex >= 0 ? raw.slice(atIndex + 1) : undefined;
  const parts = withoutRef.split("/");
  const owner = parts[0];
  const repo = parts[1];
  const subPath = parts.length > 2 ? parts.slice(2).join("/") : undefined;

  if (!owner || !repo) {
    return {
      raw,
      kind: "unknown",
      ref,
      refType: classifyRef(ref),
      refMutable: isMutableRef(ref),
      location
    };
  }

  const kind = classifyRemoteKind(owner, subPath);
  return {
    raw,
    kind,
    owner,
    repo,
    path: subPath,
    ref,
    refType: classifyRef(ref),
    refMutable: isMutableRef(ref),
    location
  };
}

export function classifyRef(ref: string | undefined): ActionRefType {
  if (!ref) {
    return "missing";
  }

  if (FULL_SHA_RE.test(ref)) {
    return "full-sha";
  }

  if (SHORT_SHA_RE.test(ref)) {
    return "short-sha";
  }

  if (SEMVER_RE.test(ref)) {
    return "semver-tag";
  }

  if (MAJOR_RE.test(ref)) {
    return "major-tag";
  }

  return "mutable-ref";
}

export function isMutableRef(ref: string | undefined): boolean {
  const refType = classifyRef(ref);
  return refType !== "full-sha";
}

export function isOfficialOwner(owner: string): boolean {
  return ["actions", "github", "docker"].includes(owner.toLowerCase());
}

function classifyRemoteKind(owner: string, subPath: string | undefined): ActionReferenceKind {
  if (subPath?.startsWith(".github/workflows/")) {
    return "reusable-workflow-remote";
  }

  return isOfficialOwner(owner) ? "official-github-action" : "third-party-action";
}
