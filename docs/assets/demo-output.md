# gha-bom report

Risk score: **0/100** (critical risk)

| Metric | Value |
| --- | ---: |
| Workflows scanned | 1 |
| Jobs scanned | 1 |
| Actions found | 2 |
| Third-party actions | 1 |
| Unpinned third-party actions | 1 |
| Secrets referenced | 1 |
| Write permission jobs | 1 |
| Release paths | 1 |
| Findings | 12 high, 4 medium, 10 low |

## Top findings

| Severity | Confidence | Finding | Location | Recommendation |
| --- | --- | --- | --- | --- |
| high | high | Workflow uses write-all permissions | .github/workflows/risky.yml | Replace write-all with explicit least-privilege job permissions. |
| high | high | Job uses write-all permissions | .github/workflows/risky.yml danger | Replace write-all with explicit job-level scopes. |
| high | high | pull_request_target uses write-all | .github/workflows/risky.yml danger | Avoid write-all in pull_request_target workflows. |
| high | high | pull_request_target has write permissions | .github/workflows/risky.yml danger | Use read-only permissions unless the privileged job is isolated from untrusted input. |
| high | high | pull_request_target checks out PR head | .github/workflows/risky.yml danger | Do not check out untrusted PR head code in pull_request_target jobs. |
| high | high | pull_request_target references secrets | .github/workflows/risky.yml danger | Avoid secrets in pull_request_target or split privileged steps into a separate trusted workflow. |
| high | high | pull_request_target uses self-hosted runner | .github/workflows/risky.yml danger | Use GitHub-hosted runners for untrusted pull request workflows. |
| high | high | Third-party action on pull_request_target with write permission | .github/workflows/risky.yml danger | Pin third-party actions in privileged workflows to full commit SHAs. |
| high | high | Self-hosted runner used on pull request trigger | .github/workflows/risky.yml danger | Use GitHub-hosted runners for untrusted pull request workflows or isolate self-hosted runners tightly. |
| high | high | Secret passed to unpinned third-party action | .github/workflows/risky.yml danger | Pin the third-party action to a full commit SHA or remove the secret from that step. |
| high | high | OIDC enabled in pull_request_target workflow | .github/workflows/risky.yml danger | Avoid id-token: write in pull_request_target workflows. |
| high | high | Release path uses unpinned third-party action | .github/workflows/risky.yml danger | Pin third-party actions in release jobs to full commit SHAs. |
| medium | high | pull_request_target trigger needs review | .github/workflows/risky.yml | Use pull_request where possible, or isolate privileged logic from untrusted pull request code. |
| medium | high | Third-party action is not SHA pinned | .github/workflows/risky.yml danger | Pin this reference to a full commit SHA or explicitly trust the owner in gha-bom.yml. |
| medium | medium | id-token write with no detected OIDC use | .github/workflows/risky.yml danger | Remove id-token: write unless this job needs OIDC federation. |

## Workflow inventory

| Workflow | Name | Triggers | Jobs | Permissions |
| --- | --- | --- | ---: | --- |
| .github/workflows/risky.yml | Risky | pull_request_target | 1 | write-all |

## Third-party actions

| Action | Ref type | Location |
| --- | --- | --- |
| some-owner/some-action@v1 | major-tag | .github/workflows/risky.yml danger |

## Secrets

| Secret name | Location |
| --- | --- |
| NPM_TOKEN | .github/workflows/risky.yml danger  |

## Recommendations

- Declare least-privilege permissions at workflow or job level.
- Pin third-party actions to full commit SHAs where practical.
- Review where secrets and GITHUB_TOKEN can flow, including implicit token access.
- Treat pull_request_target and workflow_run as privileged triggers and keep untrusted code away from them.
- Put release and package publishing jobs behind explicit permissions and protected environments.

> gha-bom is static offline analysis. It is a visibility and prioritization aid, not proof that a workflow is safe.

