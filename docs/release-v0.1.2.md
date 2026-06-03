# gha-bom v0.1.2

npm publish readiness release.

## Changes

- Added final npm publish checklist.
- Strengthened launch readiness tests.
- Verified package metadata, binary entries, package file list, README commands, and npm checklist contents.
- Confirmed no placeholder demo text remains.

## Verification

- `npm test`
- `npm run build`
- `npm run typecheck`
- `npm pack --dry-run`
- `npx gha-bom@latest demo`
- `npx gha-bom@latest scan . --format markdown`
