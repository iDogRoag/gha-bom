# Release Checklist

- [ ] Run `npm ci`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm pack --dry-run`.
- [ ] Run `gha-bom demo`.
- [ ] Run `gha-bom scan examples/risky`.
- [ ] Update `CHANGELOG.md`.
- [ ] Tag release.
- [ ] Publish npm package.
- [ ] Create GitHub release.
- [ ] Post launch links.
