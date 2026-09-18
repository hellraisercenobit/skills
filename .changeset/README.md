# Changesets

This folder is used by `@changesets/cli` to version `@hellraisercenobit/ai-engineering-gate`. npm workspaces only expose `packages/*`; the private root package is not a changeset member. `scripts/sync-version.sh` copies the gate version onto the plugin manifests.

- Run `npm run changeset` after a meaningful skill or gate change, targeting the gate package
- Merging the version PR bumps the gate, syncs the plugin version, and publishes the npm package
