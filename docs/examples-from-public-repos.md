# Examples of workflow patterns gha-bom can surface

These are synthetic examples of common workflow patterns. They are not scans of
specific public repositories.

## Mutable third-party action refs

```yaml
steps:
  - uses: some-owner/deploy-action@main
```

Finding gha-bom would raise: `Third-party action is not SHA pinned`.

## write-all permissions

```yaml
permissions: write-all
```

Finding gha-bom would raise: `Workflow uses write-all permissions`.

## secrets in release jobs

```yaml
steps:
  - run: npm publish
    env:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Finding gha-bom would raise: `Release path uses secret-like credentials`.

## pull_request_target risk

```yaml
on: pull_request_target
permissions:
  contents: write
steps:
  - uses: actions/checkout@v6
    with:
      ref: ${{ github.event.pull_request.head.sha }}
```

Finding gha-bom would raise: `pull_request_target checks out PR head`.

## self-hosted runner risk

```yaml
on: pull_request
jobs:
  test:
    runs-on: self-hosted
```

Finding gha-bom would raise: `Self-hosted runner used on pull request trigger`.

## release and package publish paths

```yaml
steps:
  - uses: softprops/action-gh-release@v2
  - run: docker push ghcr.io/example/app:${{ github.ref_name }}
```

Finding gha-bom would raise: `Release path uses unpinned third-party action` and
record GitHub release/container publish paths.

## OIDC use

```yaml
permissions:
  contents: read
  id-token: write
steps:
  - uses: aws-actions/configure-aws-credentials@v4
```

Finding gha-bom would record OIDC permission and cloud auth usage.

## artifact handoff risk

```yaml
on: pull_request
steps:
  - uses: actions/upload-artifact@v4
    with:
      name: build-output
      path: .
```

Finding gha-bom would raise: `Artifact upload from pull request workflow` and
`Artifact path is broad`.
