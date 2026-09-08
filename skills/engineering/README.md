# Engineering

Skills for daily code work. **Promoted** — listed in the top-level README and shipped in the Claude plugin.

## User-invoked

Reachable only when you type them (`disable-model-invocation: true` + `policy.allow_implicit_invocation: false`).

_None yet._

## Model-invoked

Model- or user-reachable (rich trigger phrasing in `description`).

- **[transpose-design-pattern](./transpose-design-pattern/SKILL.md)** — Select a pattern from the catalog and transpose it to Angular / React / Vue / Vanilla TS / Quarkus before implementation.
- **[review-design-patterns](./review-design-patterns/SKILL.md)** — Independent design-pattern audit: blind re-derivation + steelman gate. Companion to `transpose-design-pattern`.
- **[transpose-comments](./transpose-comments/SKILL.md)** — Write only the why: no comment by default, one Simplified Technical English (ASD-STE100) line where a why exists, placed in the language's idiom (lint directives carry it inline). Runs before any code write.
- **[review-comments](./review-comments/SKILL.md)** — Audit comments in a diff, MR, or file: keep the why, delete narration, tighten the rest to STE. Companion to `transpose-comments`.
