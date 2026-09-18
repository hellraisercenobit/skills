Quickstart:

```bash
npx skills add hellraisercenobit/skills --skill transpose-testing-patterns review-testing-patterns
npx skills update transpose-testing-patterns review-testing-patterns
```

[Source](https://github.com/hellraisercenobit/skills/tree/main/skills/engineering/transpose-testing-patterns)

## What it does

Turns behavior and risk into an explicit testing decision before affected writes. It
chooses the public seam, independent oracle, test form, doubles and arrangement, guides
observed TDD when appropriate, then requests a fresh read-only review under C01-C12.

## When to reach for it

- **Model-invoked:** type `/transpose-testing-patterns`, or let the agent select it for a matching task.
- Use for behavior changes, regressions, legacy characterization, testability, test doubles,
  TypeScript consumer guarantees or unreliable tests. Prose-only changes do not activate it.

## Prerequisites

Install both companions from the same revision and provide a fresh reviewer context.

## Choose by behavior

Direct examples, state, interaction, contract, property and characterization tests are
alternatives with different guarantees. Doubles follow the detected adapter (`vi.fn` on
Vitest, `jasmine.createSpy` on Karma + Angular TestBed). A factory or useful hook can be
retained. Builders and ports require a concrete benefit; no specialized pattern is a valid choice.

## Runner adapters

Runner families are adaptive: Vitest, and Karma + jasmine-core + Angular TestBed. Reference
profiles (Vitest 5 / Vitest 4, and the Angular 10 / Karma 6.3 / jasmine 3.5 / TS 4.0 pin)
are test targets, not the adapter's supported-version list. Neighbouring majors that still
use the same runner shape stay on that adapter. An undocumented major stays on the family
with `complete: false`. Unknown runners permit catalog analysis, not a qualified
transposition. Existing compatible versions can remain in use.

## Evidence and delivery

Keep decisions outside the checkout before writes. Preserve actual RED/GREEN output and
inspectable states separately, compile production and tests, and map required scenarios to
executed tests. Historical coverage must not be presented as observed TDD.
See [how it fits the environment](../../README.md#how-it-fits-the-environment) for Claude
Code/Codex hooks, no-mistakes and direct PRs. `ai-engineering-gate can-stop` is the lock;
hooks are advisory.
