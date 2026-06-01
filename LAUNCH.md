# Launch Checklist

Use this before announcing gha-bom publicly.

## Repository

- [ ] Create GitHub repo.
- [ ] Replace placeholder repo URLs in `package.json`.
- [ ] Add repo description: `Offline GitHub Actions bill of materials, risk map, and diff tool.`
- [ ] Add repo topics from `docs/repo-topics.md`.
- [ ] Confirm README quickstart works from a clean checkout.
- [ ] Confirm `npx gha-bom demo` works after package publish.

## Package

- [ ] Run `npm ci`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm pack --dry-run`.
- [ ] Inspect package contents.
- [ ] Publish npm package.

## Demo

- [ ] Run `gha-bom demo`.
- [ ] Run `gha-bom demo --format html --output gha-bom-demo.html`.
- [ ] Record terminal demo GIF or screenshot.
- [ ] Add screenshot or GIF to README when ready.

## Announcement

- [ ] Post Show HN.
- [ ] Post to focused Reddit communities.
- [ ] Post to X, LinkedIn, Bluesky, and relevant Discords.
- [ ] Submit to developer launch sites.
- [ ] Create GitHub release.
- [ ] Ask early users for issues, not just stars.

## After launch

- [ ] Watch issues for false positives and missing workflow patterns.
- [ ] Add real-world fixtures from user reports.
- [ ] Keep wording honest: gha-bom is static offline analysis, not proof of safety.
