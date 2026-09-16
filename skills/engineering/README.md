# Engineering

Skills for daily code work. **Promoted** - listed in the top-level README and shipped in the Claude plugin.

The transpose/review suite contains the design-patterns, modern-typescript and testing-patterns pairs.
`nuke-review`, `transpose-comments` and `review-comments` are separate tools outside the suite.

## Model-invoked

Model- or user-reachable (rich trigger phrasing in `description`).

### Transpose/review suite

See the [suite guide](../../docs/skill-suite.md) for the common contract, composition and contributor procedure.

- **[transpose-testing-patterns](./transpose-testing-patterns/SKILL.md)** - Choose test form, seam, oracle and doubles before writing; guide observed TDD with Vitest and TypeScript checks.
- **[review-testing-patterns](./review-testing-patterns/SKILL.md)** - Independent read-only audit of test quality, static/runtime guarantees and process evidence.

- **[transpose-modern-typescript](./transpose-modern-typescript/SKILL.md)** - Decide and implement modern supported TS/JS idioms, types, collections, lifetime and native APIs, with records before code and independent review.
- **[review-modern-typescript](./review-modern-typescript/SKILL.md)** - Read-only blind audit of language and platform choices; compare expected/recorded/actual and steelman each finding.

- **[transpose-design-patterns](./transpose-design-patterns/SKILL.md)** — Decide a pattern or an explicit `none` from the catalog, transpose it to Angular / React / Vue / Vanilla TS / Quarkus / PHP (Symfony), record the decision before implementation, then hand the code to a fresh blind reviewer.
- **[review-design-patterns](./review-design-patterns/SKILL.md)** — Independent design-pattern audit: blind re-derivation frozen first, three-way comparison (expected / recorded / actual), steelman gate, catalog gaps. Companion to `transpose-design-patterns`.

### Separate tools

- **[nuke-review](./nuke-review/SKILL.md)** - Strict structural quality review of a branch or diff, invoked by the model or user. Fork of Cursor's [thermo-nuclear-code-quality-review](https://github.com/cursor/plugins/blob/main/cursor-team-kit/skills/thermo-nuclear-code-quality-review/SKILL.md) (MIT).

- **[transpose-comments](./transpose-comments/SKILL.md)** — Write only the why: no comment by default, one Simplified Technical English (ASD-STE100) line where a why exists, placed in the language's idiom (lint directives carry it inline). Runs before any code write.
- **[review-comments](./review-comments/SKILL.md)** — Audit comments in a diff, MR, or file: keep the why, delete narration, tighten the rest to STE. Companion to `transpose-comments`.
