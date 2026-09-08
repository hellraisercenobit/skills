Quickstart:

```bash
npx skills add hellraisercenobit/skills --skill=review-design-patterns
```

```bash
npx skills update review-design-patterns
```

[Source](https://github.com/hellraisercenobit/skills/tree/main/skills/engineering/review-design-patterns)

**Author:** Guillaume Mongin ([@hellraisercenobit](https://github.com/hellraisercenobit)) · **License:** [MIT](https://github.com/hellraisercenobit/skills/blob/main/skills/engineering/review-design-patterns/LICENSE)

## What it does

Independently audits design-pattern decisions against the shared catalog: re-derives each choice blind, then puts every finding through a steelman gate. The defining constraint: author intent is never evidence — the catalog is the standard, and each finding must survive the strongest defense of the current code.

## When to reach for it

- **Invocation mode.** Type `/review-design-patterns`, or the agent reaches for it automatically when a task fits.
- **Trigger boundary.** Reach for this when reviewing code, a diff, or a PR for pattern soundness / anti-patterns, or when challenging a not-yet-built design. To *choose and apply* a pattern before coding, use [transpose-design-pattern](./transpose-design-pattern.md).

## Companion

Judges against the catalog and guides owned by [transpose-design-pattern](./transpose-design-pattern.md); detection signatures live in `references/smell-signatures.md`.
