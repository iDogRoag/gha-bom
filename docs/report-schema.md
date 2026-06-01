# Report Schema

JSON reports use `schemaVersion: 1`.

Top-level fields:

- `tool`: tool name and version
- `repo`: root, scan time, offline flag, and unknowns
- `summary`: counts and status
- `score`: heuristic score, label, penalties, and note
- `workflows`: parsed workflow inventory
- `actions`: action and reusable workflow references
- `secrets`: secret names only
- `env`: environment variable names with redacted values
- `permissions`: normalized workflow and job permissions
- `runners`: runner classification
- `oidc`: id-token and cloud auth usage
- `releasePaths`: package, container, release, pages, and deploy paths
- `artifacts`: upload/download artifact paths
- `caches`: cache keys and paths
- `findings`: risk findings with severity and confidence
- `recommendations`: next-step guidance

Finding confidence is separate from severity. `severity` says why to care;
`confidence` says how directly the evidence supports the finding.
