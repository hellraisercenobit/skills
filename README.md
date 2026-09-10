# Skills

Personal agent skills by **Guillaume Mongin** ([@hellraisercenobit](https://github.com/hellraisercenobit)) — small, composable, versioned. Licensed under [MIT](./LICENSE); ownership is recorded in [NOTICE](./NOTICE).

## Install

**skills.sh** (any agent). Pick skills interactively, or name them. Companion skills (a `transpose-*` skill writes, its `review-*` twin audits and reads the reference files the first one owns) must be installed together:

```bash
npx skills add hellraisercenobit/skills
npx skills add hellraisercenobit/skills --skill transpose-design-pattern --skill review-design-patterns
```

**Claude Code plugin.** The whole set, always installed together:

```bash
claude plugin marketplace add hellraisercenobit/skills
claude plugin install hellraisercenobit-skills@hellraisercenobit
```

**From this checkout.** Symlink every skill into `~/.claude/skills` and `~/.agents/skills`:

```bash
npm install
npm run link-skills
```

## Layout

| Bucket | Purpose | Promoted |
| --- | --- | --- |
| [`skills/engineering/`](./skills/engineering/) | Daily code work | yes |
| [`skills/productivity/`](./skills/productivity/) | Daily non-code workflows | yes |
| [`skills/misc/`](./skills/misc/) | Rarely used | no |
| [`skills/personal/`](./skills/personal/) | Personal setup only | no |
| [`skills/in-progress/`](./skills/in-progress/) | Drafts | no |
| [`skills/deprecated/`](./skills/deprecated/) | Retired | no |

Copy [`skills/in-progress/_template/`](./skills/in-progress/_template/) when starting a new skill. Conventions live in [`AGENTS.md`](./AGENTS.md).

## Engineering

### User-invoked

- **[nuke-review](./skills/engineering/nuke-review/SKILL.md)** — Thermo-nuclear code quality review: an extremely strict maintainability audit of a branch (abstractions, 1k-line files, spaghetti growth, code-judo simplifications). Fork of Cursor's [thermo-nuclear-code-quality-review](https://github.com/cursor/plugins/blob/main/cursor-team-kit/skills/thermo-nuclear-code-quality-review/SKILL.md) (MIT), restructured for agents.

### Model-invoked

- **[transpose-design-pattern](./skills/engineering/transpose-design-pattern/SKILL.md)** — Pick a design pattern from the catalog and transpose it to the target framework before writing code.
- **[review-design-patterns](./skills/engineering/review-design-patterns/SKILL.md)** — Independently audit pattern decisions (blind re-derive + steelman gate). Companion to `transpose-design-pattern`.
- **[transpose-comments](./skills/engineering/transpose-comments/SKILL.md)** — Write only the why: no comment by default, one Simplified Technical English (ASD-STE100) line where a why exists, placed in the language's idiom. Runs before any code write.
- **[review-comments](./skills/engineering/review-comments/SKILL.md)** — Audit comments in a diff, MR, or file: keep the why, delete narration, tighten the rest to STE. Companion to `transpose-comments`.

## Productivity

### User-invoked

_None yet._

### Model-invoked

_None yet._
