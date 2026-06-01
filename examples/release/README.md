# Release Example

## What this example shows

A release workflow that writes contents and packages, logs in to GHCR, builds a
container image, and creates a GitHub release.

## Command to run

```sh
gha-bom scan examples/release
```

## Expected top findings

- Release path uses mutable action refs.
- Secrets or `GITHUB_TOKEN` appear in a publish path.
- Job has write permissions.

## What a safer version would do

- Pin third-party actions to full commit SHAs.
- Keep write scopes at the release job only.
- Use protected environments for release jobs.
- Prefer OIDC or trusted publishing where the registry supports it.
