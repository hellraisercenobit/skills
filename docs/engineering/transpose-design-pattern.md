Quickstart:

```bash
npx skills add hellraisercenobit/skills --skill=transpose-design-pattern
```

```bash
npx skills update transpose-design-pattern
```

[Source](https://github.com/hellraisercenobit/skills/tree/main/skills/engineering/transpose-design-pattern)

**Author:** Guillaume Mongin ([@hellraisercenobit](https://github.com/hellraisercenobit)) · **License:** [MIT](https://github.com/hellraisercenobit/skills/blob/main/skills/engineering/transpose-design-pattern/LICENSE)

## What it does

Selects a design pattern from a built-in framework-agnostic catalog, then transposes it to the target framework (Angular, React, Vue, Vanilla TS, Quarkus) **before** writing implementation code. The defining constraint: pattern choice and framework wiring are mandatory steps — you do not jump straight to coding on pattern-shaped work.

## When to reach for it

- **Invocation mode.** Type `/transpose-design-pattern`, or the agent reaches for it automatically when a task fits.
- **Trigger boundary.** Reach for this when implementing or refactoring interchangeable behaviors, plugins, factories, DTO mapping, shared state, composable actions, or cross-cutting concerns. For auditing existing pattern choices after the fact, use [review-design-patterns](./review-design-patterns.md).

## Bundled references

- `references/pattern-catalog.md` — framework-agnostic catalog
- `references/transpose-*.md` — per-framework transposition guides
