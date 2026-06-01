# npm Publish Check

Publishing must be done manually by the maintainer. Do not publish from an
automation or from a machine that is not logged in to the intended npm account.

## Commands

```sh
npm whoami
npm view gha-bom version --registry https://registry.npmjs.org/
npm pack --dry-run
npm publish --dry-run --registry https://registry.npmjs.org/
```

When ready to publish:

```sh
npm publish --access public --registry https://registry.npmjs.org/
```

## What success looks like

- `npm whoami` prints the maintainer npm username.
- `npm view gha-bom version` prints the currently published version, or returns
  404 before the first publish.
- `npm pack --dry-run` lists only intended package files.
- `npm publish --dry-run` completes without packaging or registry errors.
- After publish, `npm view gha-bom version --registry https://registry.npmjs.org/`
  prints the new version.

## If the package name is already taken

If `gha-bom` is unavailable on npm, do not publish under a confusing name. Pick
one of these options:

- use a scoped package such as `@idogroag/gha-bom`
- choose a new CLI/package name and update README, package metadata, binary
  names, docs, and examples consistently
- keep the GitHub release as source-only until naming is resolved

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
