# Engineering

Skills for daily code work. **Promoted** - listed in the top-level README and shipped in the Claude plugin.

The transpose/review suite contains the design-patterns, modern-typescript and testing-patterns pairs.
`agent-instruction-doctor` is a separate tool outside the suite.

## User-invoked

Reachable only by typing the name (`disable-model-invocation: true`, one-line `description`).

- **[agent-instruction-doctor](./agent-instruction-doctor/SKILL.md)** - Diagnose ignored, conflicting or unreachable agent instructions from the repository up to user/global settings (AGENTS.md, CLAUDE.md, rules, skills, hooks, settings, subagents, MCP), then apply only the repair candidates you select. Separate tool, outside the suite.

## Model-invoked

Model- or user-reachable (rich trigger phrasing in `description`).

### Transpose/review suite

See the [suite guide](../../docs/skill-suite.md) for the common contract, composition and contributor procedure.

- **[transpose-testing-patterns](./transpose-testing-patterns/SKILL.md)** - Choose test form, seam, oracle and doubles before writing; guide observed TDD with the detected runner adapter (Vitest, Karma + jasmine-core + Angular TestBed, or Codeception) and TypeScript checks.
- **[review-testing-patterns](./review-testing-patterns/SKILL.md)** - Independent read-only audit of test quality, static/runtime guarantees and process evidence.

- **[transpose-modern-typescript](./transpose-modern-typescript/SKILL.md)** - Decide and implement modern supported TS/JS idioms, types, collections, lifetime and native APIs, with records before code and independent review.
- **[review-modern-typescript](./review-modern-typescript/SKILL.md)** - Read-only blind audit of language and platform choices; compare expected/recorded/actual and steelman each finding.

- **[transpose-design-patterns](./transpose-design-patterns/SKILL.md)** — Decide a pattern or an explicit `none` from the catalog, transpose it to Angular / React / Vue / Vanilla TS / Quarkus / PHP (Symfony), record the decision before implementation, then hand the code to a fresh blind reviewer.
- **[review-design-patterns](./review-design-patterns/SKILL.md)** — Independent design-pattern audit: blind re-derivation frozen first, three-way comparison (expected / recorded / actual), steelman gate, catalog gaps. Companion to `transpose-design-patterns`.
