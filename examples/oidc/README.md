# OIDC Example

## What this example shows

A deploy workflow with `id-token: write`, AWS credentials federation, and a
cloud deployment command.

## Command to run

```sh
gha-bom scan examples/oidc
```

## Expected top findings

- Cloud deploy path detected.
- OIDC permission detected.
- Official actions are not pinned to full commit SHAs.

## What a safer version would do

- Keep `id-token: write` scoped to the deploy job.
- Use protected environments for production deploys.
- Pin actions when reproducibility matters.
- Keep cloud role permissions narrow.
