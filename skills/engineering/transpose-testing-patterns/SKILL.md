---
name: transpose-testing-patterns
description: "Choose and record a testing strategy before writing tests or affected implementation, then guide observable RED/GREEN/refactor and independent review. Use for behavior changes, regression tests, test doubles, testability seams, static TypeScript contracts or unreliable tests. Runner-neutral catalog with a qualified Vitest adapter. Companion to review-testing-patterns. Excludes prose-only and formatting-only changes."
license: MIT
metadata:
  author: Guillaume Mongin (@hellraisercenobit)
---

# Transpose testing patterns

Choose tests that discriminate a plausible defect and survive a legitimate internal
refactor. A direct test, an existing factory or no new abstraction can be the best choice.

## Resolve first

Read [contract 1.0.0](references/suite-contract.md), [catalog 1.0.0](references/catalog.md)
and [record guidance](references/record.md). Resolve /review-testing-patterns and the
[schema 1.0.0](references/decision-record.schema.json). For Vitest, read the
[adapter 1.0.0](references/transpose-vitest.md) and check the installed capabilities.
Missing/conflicting required references leave execution incomplete. Other runners permit
catalog analysis only; do not claim qualified transposition or silently migrate them.

## Procedure

1. **Frame.** Establish raw need, scope/base, public contracts, actual runner/compiler,
   configuration and runtimes. Include relevant tests, production, helpers and new files.
   Select TDD, characterization, existing coverage or audit mode honestly.
2. **Inventory and compare.** Walk every catalog axis, including retained choices and
   uncovered risks. For each site name behavior, risk, public seam and independent oracle.
   Compare current tests, direct tests and plausible alternatives. Family, level, double
   and arrangement are separate decisions. Read [doubles/data](references/doubles-data.md),
   [TDD](references/tdd.md) and [TypeScript](references/typescript.md) where applicable.
   Testing owns observation; use /transpose-design-patterns for a real architectural
   response and /transpose-modern-typescript for substantial language/platform choices.
3. **Record before writing.** Validate a record outside the repository before the first
   affected test, helper, configuration or production write. Preserve revisions. `none`
   means no specialized pattern helps; `retain` is an independent action. Group coherent
   scenarios without hiding their identity. Gate support for `testing-patterns` must be
   inspected; never submit its record as `design`.
4. **Execute vertical slices.** Follow the TDD guide when claiming TDD. Observe the intended
   failure, freeze the oracle through GREEN and name pressure before refactoring. Keep
   tool output and reinspectable states in a separate append-only journal. Run runtime,
   compilation and relevant consumer-type checks separately. Match required scenarios
   to tests actually run; disclose skips, expected failures and retries.
5. **Dispatch fresh review.** Use `testing-pattern-reviewer` or a fresh general subagent
   without inherited conversation. Send the shared neutral brief: raw request, exact
   scope/base, factual constraints, record/evidence paths. No builder rationale, expected
   verdict or harness oracle. It runs /review-testing-patterns itself in read-only mode.
   Without an independent context, report incomplete execution.
6. **Close the loop.** The builder fixes findings, revises decisions before changed
   strategy, and dispatches a new fresh reviewer. Preserve prior reports. Complete only
   with current SOUND for every applicable dimension, passing checks and no dispute.
   Covered edits or changed records/references expire affected verdicts.

## Deliverable

Report profile, scope/base/state, decisions and trade-offs, artifacts, observed cycles,
commands/results, scenario coverage, independent report and limitations. Portable evidence
provides no automatic lock. Do not infer process history from final code or commit messages.
