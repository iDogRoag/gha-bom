# gha-bom

Generate an offline bill of materials for your GitHub Actions workflows.

gha-bom inventories your GitHub Actions workflows, maps their CI/CD attack
surface, and shows what changed in PR-friendly diffs.

> Status: early OSS preview. Static offline analysis only.

## Why This Exists

GitHub Actions workflows are now part of the software supply chain. A
compromised action can access `GITHUB_TOKEN`, job permissions, and secrets
available to that job. SBOMs usually cover application dependencies, not the
CI/CD workflows that build, test, publish, and deploy them.

gha-bom answers three questions:

1. What does this repo's GitHub Actions setup depend on?
2. What permissions, secrets, runners, triggers, artifacts, environments, and
   release paths does it expose?
3. What changed in that CI/CD attack surface since the last scan?

gha-bom is a visibility tool, not proof of safety.

## How gha-bom Is Different

zizmor is a GitHub Actions security linter.

abom maps recursive action dependencies and known compromised actions.

gha-bom is a local workflow inventory and attack-surface diff tool.

Use them together.

## Install

gha-bom requires Node.js 24.

```sh
npm install -g gha-bom
```

During local development:

```sh
npm install
npm run build
node dist/cli.js scan .
```

## Quick Start

```sh
gha-bom scan
gha-bom scan --format markdown --output gha-bom-report.md
gha-bom scan --format json --output current.json
gha-bom diff .gha-bom/baseline.json current.json --format markdown
```

The short alias is also available:

```sh
gbom scan .
```

## Example Output

```text
gha-bom scan

Status fail
Risk score 64 (high risk)
Workflows 4 workflows, 8 jobs
Actions 19 total, 5 third party, 4 unpinned third party
Access 3 secrets, 2 jobs with write permissions, 2 release paths
Findings 2 high, 6 medium, 8 low
```

## Commands

### Scan

```sh
gha-bom scan [path]
```

Scans `.github/workflows/*.{yml,yaml}` by default and reports statically
visible workflows, actions, refs, permissions, secret references, triggers,
runners, OIDC use, artifact paths, cache keys, release paths, findings, and a
heuristic risk score.

Examples:

```sh
gha-bom scan
gha-bom scan ./repo
gha-bom scan --format json
gha-bom scan --format markdown
gha-bom scan --format html --output gha-bom.html
gha-bom scan --show-workflows --show-secrets
gha-bom scan --fail-on high
gha-bom scan --fail-on score-below --min-score 80
gha-bom scan --config gha-bom.yml
```

### Explain

```sh
gha-bom explain .github/workflows/release.yml
gha-bom explain .github/workflows/ci.yml --format markdown
```

Explains one workflow in detail with triggers, permissions, jobs, runners,
actions, secrets, release paths, findings, and suggested next steps.

### Diff

```sh
gha-bom diff baseline.json current.json
gha-bom diff baseline.json current.json --format markdown
gha-bom diff baseline.json current.json --fail-on new-high
gha-bom diff baseline.json current.json --fail-on new-secret
```

Diff mode detects new workflows, jobs, actions, changed refs, action unpinning,
new third-party actions, new secret references, widened permissions, new
`pull_request_target`, new self-hosted runners, OIDC use, release paths,
artifact paths, cache paths, risk score changes, and new high findings.

### Init

```sh
gha-bom init
gha-bom init ./repo --force
```

Creates a starter `gha-bom.yml` config.

### Doctor

```sh
gha-bom doctor
```

Checks local Node.js, npm, and optional git availability.

## Config File

gha-bom looks for:

1. `gha-bom.yml`
2. `gha-bom.yaml`
3. `.gha-bom.yml`
4. `.gha-bom.yaml`

Example:

```yaml
version: 1
minScore: 80
failOn:
  - high
include:
  - ".github/workflows/*.{yml,yaml}"
exclude: []
trustedActions:
  - "actions/*"
  - "github/*"
  - "docker/*"
trustedOwners:
  - "my-org"
allowedSecrets:
  - "GITHUB_TOKEN"
allowedSelfHostedLabels:
  - "linux-secure"
risk:
  allowPullRequestTarget: false
  requireExplicitPermissions: true
  requireShaPinnedThirdPartyActions: true
  allowSecretsInPullRequestTarget: false
  allowWriteAll: false
  allowSecretsInThirdPartyActions: false
diff:
  baseline: ".gha-bom/baseline.json"
```

Bad config shows the file path and field path.

## GitHub Actions Usage

For readability, this example uses major tags. For the strongest
reproducibility, pin third-party actions to full commit SHAs.

```yaml
name: gha-bom

on:
  pull_request:
  push:
    branches:
      - main

permissions:
  contents: read

jobs:
  gha-bom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 24.x
      - run: npx gha-bom scan . --ci --format markdown --output gha-bom-report.md --fail-on high
      - uses: actions/upload-artifact@v5
        if: always()
        with:
          name: gha-bom-report
          path: gha-bom-report.md
```

Baseline diff usage:

```sh
gha-bom scan . --format json --output current.json
gha-bom diff .gha-bom/baseline.json current.json --format markdown --fail-on new-high
```

## Report Formats

- `table`: concise terminal report.
- `json`: stable machine-readable schema.
- `markdown`: PR comment-ready report.
- `html`: single self-contained HTML report with escaped content and no
  external assets.

## Risk Score

The risk score starts at 100 and subtracts heuristic penalties for risky
patterns such as `pull_request_target` with write permissions, `write-all`,
secrets flowing to unpinned third-party actions, self-hosted runners on pull
request triggers, remote reusable workflows with `secrets: inherit`, release
paths with mutable third-party actions, broad artifact paths, and unnecessary
OIDC permissions.

Labels:

- 90 to 100: low risk
- 70 to 89: moderate risk
- 50 to 69: high risk
- 0 to 49: critical risk

The score is a prioritization aid, not proof that a workflow is safe.

## Security Model

gha-bom does not execute target repository code.

It reads:

- GitHub Actions workflow YAML
- `gha-bom.yml` config files
- local composite action metadata under `.github/actions` when referenced

Default scan, explain, diff, and report generation do not make network calls,
GitHub API calls, telemetry calls, advisory database calls, or AI calls.

gha-bom records secret names only. It never attempts to read secret values and
redacts secret-looking environment values in output.

## Limitations

gha-bom is static offline analysis. It does not:

- verify whether an action is malicious
- verify GitHub owner identity
- verify whether a named ref is truly a branch or tag
- verify whether secrets exist in repository settings
- query branch protection, rulesets, or environment protection
- fetch remote action metadata
- replace tools like zizmor or abom

Offline reports include unknowns for facts that require GitHub-side context.

## Roadmap

- Recursive remote action metadata resolution
- Optional GitHub API enrichment
- Known-compromised action advisory checks
- CycloneDX output
- SPDX output
- SARIF output
- PR comment mode
- GitHub App
- Organization-wide scan
- Baseline management
- Dependency locking suggestions
- Integration with zizmor and abom outputs

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
