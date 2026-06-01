# Examples

Scan the current repository:

```sh
gha-bom scan
```

Write JSON for baseline use:

```sh
gha-bom scan . --format json --output .gha-bom/baseline.json
```

Create a PR-friendly diff:

```sh
gha-bom scan . --format json --output current.json
gha-bom diff .gha-bom/baseline.json current.json --format markdown
```

Fail CI on new high-risk changes:

```sh
gha-bom diff .gha-bom/baseline.json current.json --fail-on new-high
```
