# Risk Model

gha-bom findings are heuristic and static.

High severity examples:

- `pull_request_target` with write permissions
- `pull_request_target` checking out PR head code
- `write-all`
- secret passed to an unpinned third-party action
- self-hosted runner on pull request triggers
- `secrets: inherit` with a remote reusable workflow
- release path using an unpinned third-party action

Medium severity examples:

- missing explicit workflow permissions
- third-party action pinned to a mutable or partial ref
- id-token write with no detected OIDC use
- workflow-level write permissions inherited by jobs
- cache use in untrusted pull request workflows

Low severity examples:

- official action not pinned to a full commit SHA
- local action included
- broad but non-privileged inventory notes

The score starts at 100, subtracts penalties, and clamps to 0 through 100.
