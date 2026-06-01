# Basic Example

## What this example shows

A small CI workflow with `pull_request` and `push` triggers, read-only
`contents` permission, official setup actions, and npm test commands.

## Command to run

```sh
gha-bom scan examples/basic
```

## Expected top findings

- Official actions are not pinned to full commit SHAs.
- Cache use appears in a pull request workflow.

## What a safer version would do

- Pin actions to full commit SHAs when reproducibility matters.
- Keep permissions explicit and read-only.
- Keep cache keys based on dependency files instead of user-controlled data.
