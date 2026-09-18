Quickstart:

```sh
npx skills add hellraisercenobit/skills --skill transpose-modern-typescript --skill review-modern-typescript
npx skills update review-modern-typescript
```

[Source](https://github.com/hellraisercenobit/skills/tree/main/skills/engineering/review-modern-typescript)

## What it does

Audits TS/JS idioms and platform choices independently, including missed simplifications
in otherwise functional code. It freezes expectations before opening decision records and
confirms a finding only after its strongest defense fails. It edits no files.

## When to reach for it

- **Invocation mode.** Type /review-modern-typescript, or let the agent invoke it for a suitable audit.
- **Trigger boundary.** Review a diff, existing module, proposal or fresh transposition handoff.
  Formatting-only and prose-only work are excluded. Use review-design-patterns for architecture.

## Prerequisites

Install the transpose companion and matching references. The freeze must name the four
MT-23 layers (compiler version + target, lib, emit, runtime); a missing layer is
incomplete execution. Standalone code needs no historical
record; transposition completion does. Work the reviewer authored needs a fresh context.

## Evidence before verdict

Coverage includes everyday syntax, helpers, collections, resource lifetime, lazy production,
browser capabilities and type guarantees. Findings show rule, location, evidence, expected/
recorded/actual, impact, defense, refutation and correction. Useful existing choices are
defended; catalog gaps are listed without changing the verdict.

SOUND means complete with zero findings. SMELLS means findings without a Blocker; VIOLATIONS
means at least one Blocker. File them through `ai-engineering-gate attest` or `report` after
`begin`. Fixes belong to the builder and require another fresh review.
See [the suite contract guide](../skill-suite.md) for verdict expiry and the gate.
