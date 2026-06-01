# Configuration

gha-bom supports `gha-bom.yml`, `gha-bom.yaml`, `.gha-bom.yml`, and
`.gha-bom.yaml`.

```yaml
version: 1
minScore: 80
failOn:
  - high
include:
  - ".github/workflows/*.{yml,yaml}"
exclude: []
trustedActions:
  - "actions/*"
  - "github/*"
  - "docker/*"
trustedOwners: []
allowedSecrets:
  - "GITHUB_TOKEN"
allowedSelfHostedLabels: []
risk:
  allowPullRequestTarget: false
  requireExplicitPermissions: true
  requireShaPinnedThirdPartyActions: true
  allowSecretsInPullRequestTarget: false
  allowWriteAll: false
  allowSecretsInThirdPartyActions: false
diff:
  baseline: ".gha-bom/baseline.json"
```

`trustedOwners`, `allowedSecrets`, and `allowedSelfHostedLabels` are policy
inputs. gha-bom still reports inventory facts even when policy allows a pattern.
