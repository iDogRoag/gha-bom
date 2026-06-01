# Security Model

gha-bom does not execute target repository code.

Default commands do not perform network calls, GitHub API calls, advisory
database calls, telemetry, or AI calls.

The scanner reads:

- workflow YAML
- gha-bom config files
- local composite action metadata under `.github/actions` when referenced

Secret values are not read. Secret names are recorded because they are visible
in workflow files. Secret-looking environment values are redacted.

HTML output is self-contained and escapes report content.
