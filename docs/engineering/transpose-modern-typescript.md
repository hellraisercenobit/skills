Quickstart:

```sh
npx skills add hellraisercenobit/skills --skill transpose-modern-typescript --skill review-modern-typescript
npx skills update transpose-modern-typescript
```

[Source](https://github.com/hellraisercenobit/skills/tree/main/skills/engineering/transpose-modern-typescript)

## What it does

Turns an implementation intention into modern TS/JS using the simplest supported language
and platform capability. Records the decision before editing, verifies behavior and obtains
a fresh independent review. Keeping a useful helper or simple loop can be the right result.

## When to reach for it

- **Invocation mode.** Type /transpose-modern-typescript, or let the agent invoke it when applicable.
- **Trigger boundary.** TS/JS implementation/refactoring: extraction and nullish access, collection
  choice, lazy production, lifetime, async/browser mechanisms and useful type guarantees.
  Excludes prose/formatting edits. Architectural forces belong to /transpose-design-pattern.

## Prerequisites

Install the review companion at a compatible version. Provide project targets or let the
agent derive them from configuration; unresolved targets block dependent adoption. A fresh
review context is required for completion.

## Breadth and trade-offs

The catalog covers destructuring, ??, ??=, ?. including arrays, Map/Set/WeakMap/WeakSet,
generators and yield, streams, cancellation, browser observation/storage/workers, native
parsing/cloning/security primitives, satisfies, unions, narrowing, unknown and derived types.
Rules pair each capability with alternatives, invariants and counterexamples.

The skill separates compiler syntax, declarations, emitted code and runtime support. It does
not impose a TS version, assume Baseline covers product targets or promise native code is
always faster. Performance claims distinguish less algorithmic work from actual measurements.

## Decision and completion

Records preserve sites, targets/evidence, alternatives, choice, action, trade-offs and
invariants. The reviewer freezes expectations before reading those records. Only current
SOUND with passing checks completes the work, subject to any required gate support.

See [the shared suite guide](../skill-suite.md) for installation, composition, expiry,
portable operation and contribution.
