# gha-bom v0.1.1 launch polish

## Summary of changes

- Add README badges for CI, npm, license, and Node 24.
- Add sample Markdown, HTML, and diff reports.
- Add Codex OSS application support answers.
- Add public issue seed list.
- Clean up demo asset wording.
- Add npm publish readiness checklist.
- Expand contributor guidance.

## Manual release checklist

- [ ] Confirm working tree is clean.
- [ ] Run `npm install`.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Run `npm pack --dry-run`.
- [ ] Run `node dist/cli.js demo`.
- [ ] Review `FINAL_CHECK.md`.

## npm publish checklist

- [ ] Confirm `npm whoami` is the intended maintainer account.
- [ ] Confirm `npm view gha-bom version --registry https://registry.npmjs.org/`.
- [ ] Run `npm publish --dry-run --registry https://registry.npmjs.org/`.
- [ ] Publish with `npm publish --access public --registry https://registry.npmjs.org/`.
- [ ] Verify `npm view gha-bom version --registry https://registry.npmjs.org/`.

## GitHub release notes draft

Initial launch polish update for gha-bom.

- README badges for CI, npm version/downloads, license, and Node 24.
- Sample Markdown, HTML, and diff reports for easier sharing.
- Codex OSS application support notes.
- Public issue seed list for roadmap contributions.
- Demo asset cleanup and static preview links.
- npm publish checklist for maintainers.

gha-bom remains offline-first and does not add GitHub API, network, telemetry,
advisory database, or AI calls to default scan/demo/diff/report generation.

## Post-release verification commands

```sh
npm view gha-bom version --registry https://registry.npmjs.org/
npx gha-bom demo
npx gha-bom scan .
gh release view v0.1.1 --repo iDogRoag/gha-bom
```
