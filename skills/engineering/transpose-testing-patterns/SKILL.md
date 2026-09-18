---
name: transpose-testing-patterns
description: "Choose and record a testing strategy before writing tests or affected implementation, then guide observable RED/GREEN/refactor and independent review. Use for behavior changes, regression tests, test doubles, testability seams, static TypeScript contracts or unreliable tests. Runner-neutral catalog with a qualified Vitest adapter and an implemented Codeception adapter. Companion to review-testing-patterns. Excludes prose-only and formatting-only changes."
license: MIT
metadata:
  author: Guillaume Mongin (@hellraisercenobit)
---

# Transpose testing patterns

Choose tests that discriminate a plausible defect and survive a legitimate internal
refactor. A direct test, an existing factory or no new abstraction can be the best choice.

## Resolve first

Read [contract 1.1.0](references/suite-contract.md), [catalog 1.0.0](references/catalog.md)
and [record guidance](references/record.md). Resolve /review-testing-patterns and the
[schema 2.0.0](references/decision-record.schema.json). Detect the actual runner from the
lockfile ([detect-adapter](references/detect-adapter.mjs)). For Vitest, read the
[adapter 1.0.0](references/transpose-vitest.md) and check the installed capabilities. If
Codeception is the runner, read the
[Codeception adapter 1.0.0](references/transpose-codeception.md) instead; version
differences stay in that adapter's profile table, and an exact `5.0.0` string is not
required. The shared shapes sit beside the contract: [declaration](references/declaration.schema.json),
[decision envelope](references/decision-envelope.schema.json),
[evidence append](references/evidence-append.schema.json),
[journal event](references/journal-event.schema.json) and [dispute](references/dispute.schema.json).
Missing/conflicting required references leave execution incomplete. Other runners permit
catalog analysis only; do not claim qualified transposition or silently migrate them to
Vitest.

## Procedure

0. **Declare.** Pipe a [declaration](references/declaration.schema.json) to
   `ai-engineering-gate declare --dimension testing-patterns --stdin` before any record: applicability
   and its reason, the requester's own wording, the factual constraints, the base and the protected
   paths. `non-applicable` with its reason is a complete answer, and the reviewer's brief is rendered
   from this document alone.
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
3. **Record before writing.** File it with
   `ai-engineering-gate record --dimension testing-patterns --stdin` before the first affected test,
   helper, configuration or production write. Every site whose action applies a test change names its
   `oracle` - kind, independence and the statement itself - and the `plausibleDefect` the test
   discriminates; a `retain` action is the only exemption. Name in `plans` what the record will produce,
   with the `test` and `production` roles, which is what makes a replay possible later. `none` means no
   specialized pattern helps; `retain` is an independent action. Group coherent scenarios without hiding
   their identity.
4. **Execute vertical slices.** Follow the TDD guide when claiming TDD. Observe the intended failure,
   freeze the oracle through GREEN and name pressure before refactoring. File each cycle as a
   [journal event](references/journal-event.schema.json) through
   `ai-engineering-gate evidence append --dimension testing-patterns --stdin`: the phase, the command,
   the exit code, the raw output and, for a red, its cause and its `failureClass`. The gate stamps every
   append with the content hashes of the planned test and production artifacts, which is what turns a
   claimed red into an inspectable one. Run runtime, compilation and relevant consumer-type checks
   separately. Match required scenarios to tests actually run; disclose skips, expected failures and
   retries.
5. **Dispatch fresh review.** Run `ai-engineering-gate status --full` for the dispatch plan and the
   neutral brief. Use `testing-pattern-reviewer` or a fresh general subagent without inherited
   conversation. Send the brief as printed - raw request, exact scope and base, factual constraints,
   record and evidence paths - and no builder rationale, expected verdict or harness oracle. It runs
   /review-testing-patterns itself in read-only mode. Without an independent context, report incomplete
   execution.
6. **Close the loop.** Corrections are batched across dimensions, then all applicable reviews reopen
   together on one state. A missing red is an evidence finding whose remedy is a replay the gate runs
   itself - `ai-engineering-gate replay --dimension testing-patterns --record <ref> --scenario <name>
   --command <command>` - never a transcript you supply. A finding you contest goes to
   `ai-engineering-gate dispute --dimension testing-patterns --stdin` with counter-evidence, and only
   the user arbitrates it. Prior reports are preserved. Complete when `ai-engineering-gate can-stop`
   exits 0; covered edits or changed records and references expire affected verdicts.

## Deliverable

Report profile, scope/base/state, decisions and trade-offs, artifacts, observed cycles,
commands/results, scenario coverage, independent report and limitations. Portable evidence
provides no automatic lock. Do not infer process history from final code or commit messages.
