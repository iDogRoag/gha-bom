# Public Issue Seeds

Copy these into GitHub issues when you are ready to invite contribution.

## Add CycloneDX output

Labels: `enhancement`, `report-format`

Problem: gha-bom JSON is useful, but some teams already collect CycloneDX BOMs.

Proposed behavior: Add `--format cyclonedx-json` for workflow BOM inventory.

Acceptance criteria: A CycloneDX JSON report is generated from existing report
data, includes workflow action refs as components where appropriate, and has
tests.

Suggested files to touch: `src/reporters`, `src/types.ts`, `test/reporters.test.ts`.

Good first issue: no.

## Add SPDX output

Labels: `enhancement`, `report-format`

Problem: Some compliance workflows prefer SPDX artifacts.

Proposed behavior: Add an SPDX-compatible output format for the workflow BOM.

Acceptance criteria: SPDX output is generated from report data and covered by
fixtures/tests.

Suggested files to touch: `src/reporters`, `docs/report-schema.md`, tests.

Good first issue: no.

## Add SARIF output

Labels: `enhancement`, `report-format`, `github-actions`

Problem: Findings cannot yet be uploaded to GitHub code scanning.

Proposed behavior: Add `--format sarif` for findings.

Acceptance criteria: SARIF validates, preserves finding severity/location, and
has reporter tests.

Suggested files to touch: `src/reporters`, `src/types.ts`, `test/reporters.test.ts`.

Good first issue: no.

## Add PR comment mode

Labels: `enhancement`, `ci`

Problem: Markdown output is PR-ready, but gha-bom does not post comments.

Proposed behavior: Add documented PR comment workflow examples, and later an
optional command for comment output handoff.

Acceptance criteria: Docs show a GitHub Actions flow that uploads or comments a
Markdown report without changing offline scan defaults.

Suggested files to touch: `README.md`, `docs/examples.md`, `.github/workflows`.

Good first issue: yes.

## Add known compromised action advisory enrichment

Labels: `enhancement`, `security`, `online-optional`

Problem: gha-bom does not check advisory sources.

Proposed behavior: Add optional, disabled-by-default advisory enrichment.

Acceptance criteria: No network calls by default; explicit flag required; tests
mock advisory data.

Suggested files to touch: `src/analyzer.ts`, `src/risk.ts`, docs, tests.

Good first issue: no.

## Add optional GitHub API enrichment

Labels: `enhancement`, `github-api`, `online-optional`

Problem: Offline mode cannot verify branch protection, environments, or repo
default token permissions.

Proposed behavior: Add optional GitHub API enrichment behind an explicit flag.

Acceptance criteria: Offline default remains unchanged; enriched reports mark
GitHub-derived facts clearly.

Suggested files to touch: new enrichment module, `src/types.ts`, docs, tests.

Good first issue: no.

## Add org-wide scan mode

Labels: `enhancement`, `scale`

Problem: Maintainers may want workflow BOMs across many repositories.

Proposed behavior: Add a documented strategy for scanning checked-out repos, and
later optional org enumeration.

Acceptance criteria: Initial docs include safe local scripts; future command is
explicitly opt-in for GitHub API use.

Suggested files to touch: `docs/examples.md`, future CLI module.

Good first issue: no.

## Add baseline management command

Labels: `enhancement`, `diff`

Problem: Users must manage baseline JSON files manually.

Proposed behavior: Add `gha-bom baseline update` or similar helper.

Acceptance criteria: Command writes a JSON baseline, refuses accidental
overwrite unless requested, and has tests.

Suggested files to touch: `src/cli.ts`, new baseline module, tests.

Good first issue: yes.

## Add more Docker publish detectors

Labels: `enhancement`, `detector`, `docker`

Problem: Docker publish detection is useful but can miss variants.

Proposed behavior: Detect more Docker/BuildKit/podman publish commands.

Acceptance criteria: New fixtures cover at least three publish variants.

Suggested files to touch: `src/detectors/publish.ts`, `test/fixtures`, `test/risk.test.ts`.

Good first issue: yes.

## Add more PyPI publish detectors

Labels: `enhancement`, `detector`, `python`

Problem: Python publish workflows use several tools.

Proposed behavior: Improve detection for hatch, flit, uv, twine, and trusted
publishing patterns.

Acceptance criteria: Fixtures cover common Python package publish flows.

Suggested files to touch: `src/detectors/publish.ts`, fixtures, tests.

Good first issue: yes.

## Add more cloud deploy detectors

Labels: `enhancement`, `detector`, `cloud`

Problem: Deploy commands vary across AWS, Azure, Google Cloud, Kubernetes, and
Terraform.

Proposed behavior: Add more deploy command/action patterns.

Acceptance criteria: Fixtures cover at least AWS, Azure, Google Cloud, and
Kubernetes deploy shapes.

Suggested files to touch: `src/detectors/publish.ts`, `src/detectors/oidc.ts`, fixtures.

Good first issue: yes.

## Add integration guide with zizmor and abom

Labels: `documentation`, `integration`

Problem: gha-bom is meant to complement existing tools, but users need examples.

Proposed behavior: Add a guide showing gha-bom, zizmor, and abom in the same CI
workflow.

Acceptance criteria: Docs explain which tool answers which question and include
a copy-ready workflow.

Suggested files to touch: `docs/examples.md`, `README.md`.

Good first issue: yes.
