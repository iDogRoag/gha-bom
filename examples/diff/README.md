# Diff Example

## What this example shows

The baseline JSON files in `examples/baseline` compare a simple CI workflow
against the risky workflow. This shows how gha-bom can summarize CI/CD
attack-surface changes in pull requests.

## Command to run

```sh
gha-bom diff examples/baseline/old.json examples/baseline/new.json --format markdown
```

## Expected top findings

- New `pull_request_target` trigger.
- New write permissions.
- New secret reference.
- New self-hosted runner.
- New release path.

## What a safer version would do

- Keep privileged release paths out of untrusted pull request workflows.
- Avoid broad write permissions.
- Pin third-party actions before using them in release or secret-bearing jobs.
