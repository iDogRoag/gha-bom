# Diff

`gha-bom diff old.json new.json` compares two JSON reports.

It detects:

- new and removed workflows
- new and removed jobs
- new, removed, and changed action refs
- action changes from SHA pins to mutable refs
- action changes from mutable refs to SHA pins
- new third-party actions
- new unpinned actions
- new and removed secret references
- new write permissions and widened/narrowed scopes
- new triggers, including `pull_request_target`
- new self-hosted runners
- new OIDC use
- new release paths
- new artifact and cache paths
- risk score changes
- new and resolved high findings

Markdown diff output is intended for pull request comments.
