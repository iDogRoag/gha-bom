# Risky Example

## What this example shows

A deliberately risky `pull_request_target` workflow with `write-all`, a
self-hosted runner, checkout of pull request head code, a mutable third-party
action, a secret reference, and a package publish command.

## Command to run

```sh
gha-bom scan examples/risky
```

## Expected top findings

- `pull_request_target` with write permissions.
- Secret passed to an unpinned third-party action.
- Self-hosted runner used with a pull request trigger.
- Release path uses an unpinned third-party action.
- Workflow publishes without narrow job-level permissions.

## What a safer version would do

- Use `pull_request` for untrusted code.
- Avoid checking out PR head code in privileged workflows.
- Replace `write-all` with narrow job-level permissions.
- Use GitHub-hosted runners for untrusted pull requests.
- Pin third-party actions to full commit SHAs.
