# Contributing

Thanks for helping improve gha-bom.

gha-bom is an offline-first GitHub Actions workflow inventory, risk map, and
diff tool. Contributions should keep scan behavior local, deterministic, and
honest about what static analysis can prove.

## How to install

Use Node.js 24.

```sh
npm install
npm run build
node dist/cli.js demo
```

## How to run tests

```sh
npm test
npm run typecheck
npm run build
npm pack --dry-run
```

Use focused tests while developing:

```sh
npm test -- test/risk.test.ts
```

## How detectors are structured

The scanner is intentionally modular:

- `src/parser.ts` parses workflow YAML into typed workflow facts.
- `src/detectors/*` extracts specific inventory facts.
- `src/risk.ts` turns facts into findings.
- `src/score.ts` computes the heuristic score.
- `src/reporters/*` formats reports.
- `src/diff.ts` compares two JSON reports.

Parser code should not create policy opinions. Risk code should not re-parse
YAML when a detector can expose a fact.

## How to add a new detector

1. Add or update a focused file in `src/detectors`.
2. Return typed facts, not formatted strings.
3. Add risk findings in `src/risk.ts` only when the fact deserves a finding.
4. Add fixtures under `test/fixtures`.
5. Add tests for both the detector and the resulting finding.

Default behavior must remain offline. Do not add GitHub API calls or network
calls to scan, demo, explain, diff, or report generation.

## How to add a fixture

Create a small repository shape under `test/fixtures/<name>`.

Keep fixture workflows minimal and readable. A good fixture demonstrates one
idea clearly: a trigger form, a publish path, a runner type, a cache pattern, or
a reusable workflow behavior.

## How to add a reporter

Reporters live in `src/reporters`.

Good reporters:

- render from the stable report object
- avoid mutating reports
- escape untrusted content
- keep secrets redacted
- preserve enough context for CI review

Add reporter tests in `test/reporters.test.ts`.

## How to write a good finding message

A good finding has:

- a short title
- a direct explanation of why the pattern matters
- concrete evidence from the workflow
- a recommendation the user can act on
- a severity and confidence that match the evidence

Avoid exaggerated claims. gha-bom helps teams see and review workflow attack
surface; it does not prove safety.

## Pull request checklist

- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm pack --dry-run`
- [ ] New behavior is covered by a fixture or focused unit test.
- [ ] Secret-looking values remain redacted.
