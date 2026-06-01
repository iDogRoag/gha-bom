import type { Finding, RiskLabel, RiskPenalty, RiskScore } from "./types.js";

const PENALTIES: Array<{ match: RegExp; points: number }> = [
  { match: /pull_request_target.*PR head|PR head.*pull_request_target/i, points: 30 },
  { match: /write-all/i, points: 25 },
  { match: /Secret passed to unpinned third-party action/i, points: 25 },
  { match: /Self-hosted runner used on pull request|pull_request_target uses self-hosted/i, points: 25 },
  { match: /secrets inherit/i, points: 20 },
  { match: /Release path uses unpinned third-party action/i, points: 20 },
  { match: /Missing explicit workflow permissions|publishes without explicit permissions/i, points: 15 },
  { match: /Third-party action is not SHA pinned|Remote reusable workflow is not SHA pinned/i, points: 15 },
  { match: /official action is not SHA pinned/i, points: 5 },
  { match: /id-token write with no detected OIDC use/i, points: 10 },
  { match: /inherits workflow-level write permissions/i, points: 10 },
  { match: /artifact upload from pull request/i, points: 10 },
  { match: /artifact path is broad/i, points: 5 },
  { match: /Scheduled workflow publishes/i, points: 5 }
];

const SEVERITY_FALLBACK = {
  high: 20,
  medium: 10,
  low: 3
} as const;

export function computeRiskScore(findings: Finding[]): RiskScore {
  const penalties: RiskPenalty[] = findings.map((finding) => {
    const matched = PENALTIES.find((penalty) => penalty.match.test(`${finding.title} ${finding.message}`));
    const points = matched?.points ?? SEVERITY_FALLBACK[finding.severity];
    return {
      findingId: finding.id,
      points,
      reason: finding.title
    };
  });

  const totalPenalty = penalties.reduce((sum, penalty) => sum + penalty.points, 0);
  const value = Math.max(0, Math.min(100, 100 - totalPenalty));
  return {
    value,
    label: labelFor(value),
    penalties,
    note: "Risk score is a heuristic prioritization aid, not proof that a workflow is safe."
  };
}

export function labelFor(score: number): RiskLabel {
  if (score >= 90) {
    return "low risk";
  }

  if (score >= 70) {
    return "moderate risk";
  }

  if (score >= 50) {
    return "high risk";
  }

  return "critical risk";
}
