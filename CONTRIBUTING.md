# Contributing

```bash
npm install
npm run typecheck
npm run lint
npm run test
npm run build
```

## Releasing

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning and changelog generation — no manual `npm version` or `CHANGELOG.md` editing.

1. In your PR, run `npx changeset` and describe the change. Pick a bump type (patch/minor/major).
2. Commit the generated `.changeset/*.md` file alongside your code changes.
3. Merge to `main`. CI opens (or updates) a "Version Packages" PR that bumps `package.json` and writes `CHANGELOG.md` from the accumulated changesets.
4. Merging that PR triggers the actual `npm publish` via CI.

PRs with no user-facing effect (docs, CI config, tests) don't need a changeset.
