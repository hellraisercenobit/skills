# Agent notes for this skills repo

Skills live in bucket folders under `skills/`:

- `engineering/` — daily code work (**promoted**)
- `productivity/` — daily non-code workflow tools (**promoted**)
- `misc/` — kept around but rarely used, not promoted
- `personal/` — tied to a personal setup, not promoted
- `in-progress/` — drafts not yet ready to ship
- `deprecated/` — no longer used

## Adding a skill

1. Copy `skills/in-progress/_template/` to `skills/<bucket>/<skill-name>/` and rename `SKILL.template.md` to `SKILL.md`.
2. Fill in the `SKILL.md` frontmatter (`name`, `description`) and body. Quote a `description` that contains `: `, or strict YAML parsers such as skills.sh skip the skill.
3. Keep `agents/openai.yaml` in sync with invocation mode (see [.agents/invocation.md](./.agents/invocation.md)).
4. Update the bucket `README.md`.
5. If **promoted** (`engineering/` or `productivity/`):
   - Add a line in the top-level `README.md`
   - Add the path to `.claude-plugin/plugin.json` → `skills`
   - Add a docs page at `docs/<bucket>/<skill-name>.md` (see [.agents/writing-docs.md](./.agents/writing-docs.md))
6. Run `npm run link-skills` to symlink into local harness directories.
7. Add a changeset: `npm run changeset`.

## Versioning

- Bump with [changesets](https://github.com/changesets/changesets). `npm run version` applies pending changesets, then `scripts/sync-version.sh` copies the `package.json` `version` into `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`. Never edit those three versions by hand.
- Pushing to `main` opens a version PR via `.github/workflows/release.yml`.

## Linking locally

```bash
npm run link-skills
```

Symlinks each skill (except `deprecated/`) into `~/.claude/skills` and `~/.agents/skills`.
