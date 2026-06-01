# Detection

gha-bom scans `.github/workflows/*.{yml,yaml}` by default.

It extracts:

- workflow triggers, permissions, env, defaults, concurrency, and jobs
- job runners, permissions, needs, environments, containers, services,
  matrices, reusable workflow calls, `secrets: inherit`, and steps
- step `uses`, `run`, `with`, `env`, shell, and working directory
- action refs, ref type, mutable ref status, and action kind
- secret references and secret-looking env keys
- OIDC permissions and common cloud login actions
- artifact upload/download paths
- cache keys and paths
- release, package, container, Pages, and deployment paths

gha-bom reads local composite action metadata only when a workflow references a
path under `.github/actions`.
