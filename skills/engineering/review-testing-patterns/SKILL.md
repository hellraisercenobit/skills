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
`decision-record.schema.json` and applicable guides. Contract/catalog/schema and the
required Vitest adapter must be compatible with 1.0.0. Missing or conflicting references
mean incomplete execution, without verdict; do not download substitutes or invent rules.
Other runners allow catalog-only analysis, not qualified transposition completion.

A transposition requires a fresh context and neutral brief. Check record paths exist but
do not open them before freezing. Contamination requires a new dispatch. Standalone audits
need no historical decision record and must not manufacture a process claim.

## Blind audit and comparison

1. **Facts.** Establish scope/base with git diff, reads and relevant untracked files, never
   git log, PR descriptions or author analysis. Identify source/configuration/reference
   state as well as HEAD. Derive runner, checker and runtime profile independently.
2. **Derive.** Inventory behaviors and risks from the request and public contracts.
   Builder-written names, assertions and helpers are not independent requirements. Defer
   detailed assertion reading until freeze when possible; disclose significant exposure
   to author rationale. Consider direct, state, interaction, contract, property and
   characterization tests, including defensible existing choices.
3. **Freeze.** Publish an immutable matrix in your response before the next tool call
   opening records or builder evidence: site, behavior/risk, rule IDs, acceptable seams
   and alternatives, runtime/type guarantees and discriminating cases. Freeze acceptable
   outcomes, not exact syntax. Changed verified premises require a new framing/reviewer,
   preserving this matrix.
4. **Compare.** Open records and evidence. Validate shape/membership separately from
   semantic judgment. Compare expected / recorded / actual for every site, including
   uncovered risks. Inspect actual assertions, production, helpers and configuration.
   Verify scenario-to-executed-test mapping and skips/fails/retries, checker file coverage,
   failure causes, oracle hashes, raw output and resolvable RED/GREEN states. Hashes alone
   are not inspectable evidence. A reassuring record or global green is not proof.
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
VIOLATIONS (a Blocker). Apply the shared severities. Missing prerequisites are incomplete
execution, not a fourth verdict. A proposal verdict does not qualify runtime behavior.

Only the reviewer can attest SOUND via an inspected, supported gate operation. That is the
sole permitted external mutation. Do not invent testing-patterns support. Required but
unavailable attestation leaves that workflow incomplete. Portable reports have no automatic
lock. Covered source, record or reference changes expire the report; all applicable
dimensions and checks must agree on the same final state.
