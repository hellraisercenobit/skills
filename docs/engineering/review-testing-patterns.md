Quickstart:

```bash
npx skills add hellraisercenobit/skills --skill transpose-testing-patterns review-testing-patterns
npx skills update transpose-testing-patterns review-testing-patterns
```

[Source](https://github.com/hellraisercenobit/skills/tree/main/skills/engineering/review-testing-patterns)

## What it does

Audits tests against the transpose-owned catalog in a fresh read-only context. It freezes
expected guarantees before records, compares expected/recorded/actual and defends each
suspected defect before confirmation. A persuasive record cannot establish a missing guarantee.

## When to reach for it

- **Model-invoked:** type `/review-testing-patterns`, or the agent selects it for a matching review.
- Use for a diff, existing suite, proposal or transpose handoff. An old suite can be audited
  without historical records; its TDD chronology cannot be inferred from final code.

## Prerequisites

Install the transpose companion and matching references. Route the reviewer to the adapter
for the detected family. SOUND on Karma + Angular TestBed needs the pin under
`tests/testing-patterns/karma-jasmine-angular/`. A handoff needs an
independent context with the [neutral brief](../../contracts/suite-contract.md#neutral-brief).
If the named `testing-pattern-reviewer` agent is unavailable, a fresh general session is
the fallback.

## Results

The reviewer detects false green, weak or coupled oracles, fake drift, unchecked types,
unobserved concurrency, environment mismatch and unsupported process claims. It modifies
no files and does not delegate. The builder fixes; a new reviewer checks the result.

Use the suite's SOUND, SMELLS and VIOLATIONS verdicts. Missing prerequisites mean incomplete
execution. File them through `ai-engineering-gate attest` or `report` after `begin`. Edits to
covered sources, records or references expire the report. See the
[suite guide](../skill-suite.md) for composition and the gate.
