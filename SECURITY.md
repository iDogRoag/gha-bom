# Security Policy

gha-bom is a static offline analysis tool. It reads GitHub Actions workflow
YAML, optional gha-bom config files, and local action metadata. It does not
execute target repository code.

Please report suspected vulnerabilities by opening a private security advisory
on GitHub when the repository is published.

## Scope

Security issues include secret disclosure, unexpected network calls in default
scan paths, command execution against the target repository, and unsafe HTML
report rendering.

Findings about a scanned repository are not vulnerabilities in gha-bom itself.
