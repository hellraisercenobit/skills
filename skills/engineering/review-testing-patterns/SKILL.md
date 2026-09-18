---
name: review-testing-patterns
description: "Independently audit test strategy, oracles, doubles, TypeScript guarantees and TDD evidence. Detect false green, implementation coupling and environment or execution gaps; freeze expectations before records, compare every site and steelman findings. Use for a diff, existing suite, proposal or fresh transpose-testing-patterns handoff. Read-only companion to transpose-testing-patterns."
license: MIT
metadata:
  author: Guillaume Mongin (@hellraisercenobit)
---

# Review testing patterns

Run this audit yourself. Modify no files, including fixtures, records and catalogs, and
delegate no review. [Signatures](references/smell-signatures.md) locate candidates; they
are not an independent rule catalog.

## Prerequisites

Resolve installed /transpose-testing-patterns through harness skill locations, without a
maintainer checkout. Read its `references/suite-contract.md`, `catalog.md`,
`decision-record.schema.json`, `journal-event.schema.json` and applicable guides. This
reviewer requires contract 1.1.0, catalog 1.0.0 and record schema 2.0.0. Apply
`assessTestingProfile` from `references/compiler-profile.mjs`. Missing or conflicting
references mean incomplete execution, without verdict; do not download substitutes or invent
rules. A Vitest adapter compatible with 1.0.0 qualifies Vitest transposition. Other runners
still receive catalog recale, including compiler profile and wrong-runner APIs. SOUND
for a qualified Vitest transposition still needs the Vitest adapter.

A transposition requires a fresh context and neutral brief. Check record paths exist but
do not open them before freezing. Contamination requires a new dispatch. Standalone audits
need no historical decision record and must not manufacture a process claim.

Open the window before step 1: `ai-engineering-gate begin --dimension testing-patterns` freezes
the state the verdict binds to, captures who you are and refuses the builder of the task.

## Blind audit and comparison

1. **Facts.** Establish scope/base with git diff, reads and relevant untracked files, never
   git log, PR descriptions or author analysis. Identify source/configuration/reference
   state as well as HEAD. Derive runner, checker and compiler/runtime profile independently
   from project files; do not copy the builder's record or trust constraints alone. When any
   in-scope test is TypeScript or JavaScript emitted by tsc, the profile has four layers:
   parser/compiler syntax (installed TypeScript version + target), lib/types, emit/runner
   transform, and actual runtime. Constraints must contain the ES/compiler target; a
   tsconfig path is not a substitute, and derived `compiler.target` is a second independent
   layer. Apply `assessTestingProfile` to that derived profile and the actual syntax/APIs.
2. **Derive.** Inventory behaviors and risks from the request and public contracts.
   Builder-written names, assertions and helpers are not independent requirements. Defer
   detailed assertion reading until freeze when possible; disclose significant exposure
   to author rationale. Consider direct, state, interaction, contract, property and
   characterization tests, including defensible existing choices.
3. **Freeze.** Publish an immutable matrix in your response before the next tool call
   opening records or builder evidence: site, behavior/risk, rule IDs, acceptable seams
   and alternatives, runtime/type guarantees, the four compiler/runtime layers and
   discriminating cases. Freeze acceptable outcomes, not exact syntax. An unknown required
   layer is incomplete execution: leave it unresolved and do not issue SOUND. Changed
   verified premises require a new framing/reviewer, preserving this matrix.
4. **Compare.** Open records and evidence. Validate shape/membership separately from
   semantic judgment. Compare expected / recorded / actual for every site, including
   uncovered risks. Inspect actual assertions, production, helpers and configuration.
   Verify scenario-to-executed-test mapping and skips/fails/retries, checker file coverage,
   failure causes, oracle hashes, raw output and resolvable RED/GREEN states. Read the state
   the journal derives rather than a process claim: `observed` when the builder's own events
   carry the red, `replayed` when the gate ran the scenario itself, `incomplete` when a phase
   or its failure class is missing, and `non-TDD` when the record never claimed the mode. A
   missing red is an evidence finding whose remedy is a replay, not a judgment about intent.
   Hashes alone are not inspectable evidence. A reassuring record or global green is not proof.
   Recale syntax the installed compiler/`target` cannot parse, APIs not in `lib` and not proven
   on the runtime, and runner APIs from a different adapter family (for example `vi.fn` on
   karma-jasmine-angular). Incompatible modernization is a finding (MT-23), not taste. A
   constraints versus derived target mismatch is a finding. Tests-only work with
   `modern-typescript` non-applicable still recales too-modern spec TypeScript here.
5. **Steelman.** Defend every candidate by contract, fidelity, compatibility, diagnostic
   value, cost or simplicity. Drop it if that defense holds. Confirm only with an exact
   applicable rule, observed evidence, impact and refutation. Report catalog gaps
   separately without severity or verdict impact. Missing old TDD history is not a bug;
   missing required evidence prevents completing a claimed TDD transposition.
6. **Report.** Give scope/base/state, references/profile, coverage, unchanged matrix,
   each site's comparison, findings, defended choices, gaps, checks and limits. Each
   finding includes location, rule, severity, expected/recorded/actual, evidence, strongest
   defense, refutation and scoped correction. Builder performs mutations/experiments and
   fixes; a new fresh reviewer reassesses.

## Completion

Use exactly SOUND (complete audit, no findings), SMELLS (findings without Blocker), or
VIOLATIONS (a Blocker). Apply the contract's severity clause for Blocker, Major and Minor;
do not restate it. Missing prerequisites or an unknown required compiler/runtime layer are
incomplete execution, not a fourth verdict. Findings from `assessTestingProfile` prevent
SOUND. A proposal verdict does not qualify runtime behavior.

File through the window you opened. Pipe a
[review envelope](../transpose-testing-patterns/references/review-envelope.schema.json) to
`ai-engineering-gate attest --dimension testing-patterns --stdin` for SOUND, and to
`ai-engineering-gate report --dimension testing-patterns --stdin` otherwise. Filing the envelope is the sole
permitted external mutation. Type each finding: `judgment` carries the correction, `evidence`
carries a remedy - `produce` an artifact, `rerun` a check, or `replay` a scenario the gate
runs itself. Put no fingerprint in the envelope; the gate computes all three. A refusal of
`state-moved` means the suite or the production code moved while you read it, so the review is
void: say so and stop. Portable reports have no automatic lock. Covered source, record or
reference changes expire the report, which the gate reports as `stale-source`,
`stale-reference` or `stale-decision`; `can-stop` is what answers whether every applicable
dimension and check agrees on one final state.
