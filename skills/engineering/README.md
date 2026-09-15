# Engineering

Skills for daily code work. **Promoted** — listed in the top-level README and shipped in the Claude plugin.

## User-invoked

Reachable only when you type them (`disable-model-invocation: true` + `policy.allow_implicit_invocation: false`).

- **[nuke-review](./nuke-review/SKILL.md)** — Thermo-nuclear code quality review: extremely strict maintainability audit of a branch. Fork of Cursor's [thermo-nuclear-code-quality-review](https://github.com/cursor/plugins/blob/main/cursor-team-kit/skills/thermo-nuclear-code-quality-review/SKILL.md) (MIT), restructured for agents.

## Model-invoked

Model- or user-reachable (rich trigger phrasing in `description`).

- **[transpose-design-pattern](./transpose-design-pattern/SKILL.md)** — Decide a pattern or an explicit `none` from the catalog, transpose it to Angular / React / Vue / Vanilla TS / Quarkus / PHP (Symfony), record the decision before implementation, then hand the code to a fresh blind reviewer.
- **[review-design-patterns](./review-design-patterns/SKILL.md)** — Independent design-pattern audit: blind re-derivation frozen first, three-way comparison (expected / recorded / actual), steelman gate, catalog gaps. Companion to `transpose-design-pattern`.
- **[transpose-comments](./transpose-comments/SKILL.md)** — Write only the why: no comment by default, one Simplified Technical English (ASD-STE100) line where a why exists, placed in the language's idiom (lint directives carry it inline). Runs before any code write.
- **[review-comments](./review-comments/SKILL.md)** — Audit comments in a diff, MR, or file: keep the why, delete narration, tighten the rest to STE. Companion to `transpose-comments`.
