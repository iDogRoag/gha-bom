## gha-bom diff

Risk score changed from **87** to **0** (-87).

| Severity | Change | Location | Why it matters |
| --- | --- | --- | --- |
| high | New unpinned action | .github/workflows/risky.yml danger | New mutable or partial action ref some-owner/some-action@v1 was added. |
| high | New secret reference | .github/workflows/risky.yml danger | New secret reference NPM_TOKEN was added. |
| high | New write permission | .github/workflows/risky.yml danger | A new job or workflow permission grants write access. |
| high | New trigger | .github/workflows/risky.yml | New pull_request_target trigger was added. |
| high | New self-hosted runner | .github/workflows/risky.yml danger | A job now uses a self-hosted runner. |
| high | New release path | .github/workflows/risky.yml danger | New package release path detected. |
| high | New high finding | .github/workflows/risky.yml | Workflow uses write-all permissions |
| high | New high finding | .github/workflows/risky.yml danger | Job uses write-all permissions |
| high | New high finding | .github/workflows/risky.yml danger | pull_request_target uses write-all |
| high | New high finding | .github/workflows/risky.yml danger | pull_request_target has write permissions |
| high | New high finding | .github/workflows/risky.yml danger | pull_request_target checks out PR head |
| high | New high finding | .github/workflows/risky.yml danger | pull_request_target references secrets |
| high | New high finding | .github/workflows/risky.yml danger | pull_request_target uses self-hosted runner |
| high | New high finding | .github/workflows/risky.yml danger | Third-party action on pull_request_target with write permission |
| high | New high finding | .github/workflows/risky.yml danger | Self-hosted runner used on pull request trigger |
| high | New high finding | .github/workflows/risky.yml danger | Secret passed to unpinned third-party action |
| high | New high finding | .github/workflows/risky.yml danger | OIDC enabled in pull_request_target workflow |
| high | New high finding | .github/workflows/risky.yml danger | Release path uses unpinned third-party action |
| medium | New workflow | .github/workflows/risky.yml | New workflow .github/workflows/risky.yml was added. |
| medium | New job | .github/workflows/risky.yml danger | New job danger was added. |
| medium | New action | .github/workflows/risky.yml danger | New action some-owner/some-action@v1 was added. |
| medium | New third-party action | .github/workflows/risky.yml danger | New third-party action some-owner/some-action@v1 was added. |
| medium | New OIDC use | .github/workflows/risky.yml danger | New OIDC-related use detected: id-token: write |
| medium | Risk score changed | - | Risk score changed from 87 to 0. |
| low | Removed workflow | .github/workflows/ci.yml | Workflow .github/workflows/ci.yml was removed. |
| low | Removed job | .github/workflows/ci.yml test | Job test was removed. |
| low | New action | .github/workflows/risky.yml danger | New action actions/checkout@v6 was added. |
| low | Removed action | .github/workflows/ci.yml test | Action actions/checkout@v6 was removed. |
| low | Removed action | .github/workflows/ci.yml test | Action actions/setup-node@v6 was removed. |
