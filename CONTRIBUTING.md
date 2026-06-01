# Contributing

Thanks for helping improve gha-bom.

## Local Setup

Use Node.js 24.

```sh
npm install
npm test
npm run typecheck
npm run build
```

gha-bom is offline-first. New features must not add network calls to scan,
explain, diff, or report generation unless the behavior is explicit,
documented, and disabled by default.

## Development Principles

- Parse workflow files without executing repository code.
- Keep inventory facts separate from risk findings and policy failures.
- Redact secret-looking values in all human-readable output.
- Prefer stable JSON shapes over presentation-specific fields.
- Add fixtures for new GitHub Actions behavior.
