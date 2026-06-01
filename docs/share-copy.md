# Launch Copy

## Show HN title

Show HN: gha-bom, an offline bill of materials for GitHub Actions workflows

## Show HN post body

I built gha-bom because SBOMs usually cover application dependencies, but not the workflows that build and publish them.

It scans .github/workflows and reports actions, refs, permissions, secrets, triggers, runners, artifacts, caches, release paths, and risky patterns. It also diffs two reports so a pull request can show what changed in the CI/CD attack surface.

It runs offline and does not call the GitHub API.

I would love feedback on missing workflow patterns, confusing findings, and report formats that would make this easier to use in pull requests.

## Reddit post

I built gha-bom, an offline bill of materials for GitHub Actions workflows.

It scans `.github/workflows` and reports the actions, refs, permissions, secrets, triggers, runners, artifacts, caches, and release paths your CI/CD depends on. It also diffs two reports so PRs can show what changed in the workflow attack surface.

It does not call the GitHub API by default, does not fetch remote action metadata, and does not claim to prove a workflow is safe. It is meant to complement tools like zizmor and abom.

Useful feedback: missing workflow patterns, false positives, and what output format would make this easiest to adopt in CI.

## X post

I built gha-bom: an offline bill of materials for GitHub Actions workflows.

It scans `.github/workflows`, reports actions/refs/permissions/secrets/runners/release paths, and diffs reports so PRs can show CI/CD attack-surface changes.

`npx gha-bom demo`

## LinkedIn post

SBOMs usually cover application dependencies, but not the CI/CD workflows that build and publish the application.

I built gha-bom to make GitHub Actions workflows easier to review. It scans `.github/workflows` offline and reports actions, refs, permissions, secret references, triggers, runners, artifacts, caches, release paths, and risky patterns.

The part I care about most is the diff mode: a pull request can show what changed in the workflow attack surface.

It does not call the GitHub API by default and does not claim to prove safety. It is a visibility tool for CI/CD review.

## GitHub release notes

Initial release of gha-bom.

- Offline scan of GitHub Actions workflows
- Workflow/action/ref/permission/secret/runner/artifact/cache/release-path inventory
- Heuristic findings with severity and confidence
- Risk score for prioritization
- JSON, Markdown, table, and self-contained HTML reports
- Diff mode for PR-friendly attack-surface changes
- Built-in demo command

## npm package description

Offline GitHub Actions bill of materials, risk map, and diff tool.
