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

This pair follows the [shared suite contract](../skill-suite.md). The design catalog,
framework decisions and existing record schema remain domain-specific.

Decides the design pattern for a code change - or an explicit `none` - from a built-in framework-agnostic catalog, transposes it to the target framework (Angular, React, Vue, Vanilla TS, Quarkus, PHP/Symfony), and records the decision **before** writing implementation code. After implementation it hands the code to a fresh reviewer that re-derives the design blind. The defining constraint: the decision is the deliverable, not the pattern. A `none` carries the same burden of proof as a Strategy, and the task is not done until a fresh review says `SOUND`.

## When to reach for it

- **Invocation mode.** Type `/transpose-design-pattern`, or the agent reaches for it automatically when a task fits.
- **Trigger boundary.** Reach for this when implementing or refactoring interchangeable behaviors, plugins, factories, DTO mapping, shared state, composable actions, or cross-cutting concerns. For auditing existing pattern choices after the fact, use [review-design-patterns](./review-design-patterns.md).

## The decision record

The procedure ends, before the first write, on one JSON document: the need, the structural forces found (with the site that carries each), the alternatives considered, the pattern or `none` with its reason, the framework transposition (or `null` when no guide covers the stack), the planned artifacts, and the invariants the code must make observable. It lives outside the repository. When the harness provides an `ai-engineering-gate` command, the record is piped to it; otherwise it sits in the summary and in a file the reviewer opens after its blind pass.

## The fresh reviewer

Once the code and the project's deterministic checks are done, the skill dispatches a reviewer that did not write the code - the `design-pattern-reviewer` subagent when installed, else a fresh general subagent - with a fixed brief: scope, framework, the need in one sentence, and the record's path. Never the pattern name. Findings are fixed and re-reviewed by a new dispatch; a contested finding goes to the user. Only `SOUND` completes the task.

## Bundled references

- `references/pattern-catalog.md` - framework-agnostic catalog: structural forces with the extension-cost test, one entry per pattern with its invariants, the `None` entry, decision rules
- `references/design-decision-record.schema.json` - JSON Schema of the decision record; the contract a gate validates against
- `references/transpose-*.md` - per-framework transposition guides
