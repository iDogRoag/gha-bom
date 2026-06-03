# npm Publish Check

Publishing must be done manually by the maintainer. Do not publish from an
automation or from a machine that is not logged in to the intended npm account.

## Commands

```sh
npm whoami
npm view gha-bom version
npm pack --dry-run
npm publish --dry-run
npm publish
npm view gha-bom version
npx gha-bom@latest --version
npx gha-bom@latest demo
npx gha-bom@latest scan . --format markdown
```

## What success looks like

- `npm whoami` prints the maintainer npm username.
- `npm view gha-bom version` prints the currently published version, or returns
  404 before the first publish.
- `npm pack --dry-run` lists only intended package files.
- `npm publish --dry-run` completes without packaging or registry errors.
- `npm publish` publishes the package from the maintainer account.
- After publish, `npm view gha-bom version` prints `0.1.1`.
- `npx gha-bom@latest --version` prints `0.1.1`.
- `npx gha-bom@latest demo` runs the bundled demo.
- `npx gha-bom@latest scan . --format markdown` scans a local checkout and
  prints Markdown output.

If `npm view gha-bom version` already returns `0.1.1`, do not republish the
same version.

## If the package name is already taken

If `gha-bom` is unavailable on npm, stop. Do not publish under a confusing name
while the README still uses `npx gha-bom`.

Before launch, update README commands, package metadata, binary names, docs,
examples, and release notes to the final npm package name.

## Package contents

`package.json` uses the `files` array to include:

- `dist`
- `README.md`
- `LICENSE`
- `CHANGELOG.md`
- `package.json`
- `docs`
- `examples`
- launch and contributor docs

The package intentionally excludes `src`, `test`, `coverage`, temporary files,
and build caches. The compiled `dist` output is the supported runtime surface.
