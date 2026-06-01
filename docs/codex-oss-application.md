# Codex OSS Application Notes

Paste-ready answers, each under 500 characters.

## Why this repository qualifies

gha-bom helps maintainers understand their GitHub Actions supply chain. It scans workflows offline and reports actions, refs, permissions, secrets, triggers, runners, artifacts, caches, and release paths. This matters because CI/CD workflows build and publish OSS, but they are often missing from normal dependency visibility.

## How API credits would be used

I would use API credits to build maintainer workflows around gha-bom reports: summarizing GitHub Actions attack-surface changes in PRs, explaining risky workflow changes, generating safer recommendations, improving release review checklists, and helping triage user-submitted workflow examples without adding maintainer burden.

## Anything else we should know

gha-bom is a new OSS project targeting a real maintainer pain: making CI/CD workflow risk visible and reviewable. It is offline-first, tested, documented, distributed as a CLI, and designed to complement existing tools like zizmor and abom rather than replace them.
