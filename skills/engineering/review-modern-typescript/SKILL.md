---
name: review-modern-typescript
description: "Independently audit TS/JS idioms, types, collections, generators, lifetime and native platform choices. Detect verbose legacy idioms, redundant helpers, missed native capabilities, unsafe type claims and incompatible modernization; freeze expectations blind, compare decisions and code, then steelman findings. Use for a diff, existing module, proposal or fresh transpose-modern-typescript handoff. Read-only companion to transpose-modern-typescript. Excludes prose-only and formatting-only edits."
license: MIT
metadata:
  author: Guillaume Mongin (@hellraisercenobit)
---

# Review modern TypeScript

Run the audit yourself. Edit no files and delegate no review. The transpose companion owns
all normative rules. These [smell signatures](references/smell-signatures.md) are detection
leads, never standalone rules or findings.

## Prerequisites

Resolve the installed /transpose-modern-typescript through the harness skill locations.
Read its `references/suite-contract.md`, `catalog.md`, `compatibility.md` and
`decision-record.schema.json`, then applicable families only. This reviewer requires
contract 1.1.0, catalog 1.1.0 and record schema 2.0.0. Missing or conflicting references
mean incomplete execution, without verdict. Do not download substitutes, reconstruct rules
from memory or depend on the maintainer's checkout.

For transposition, require a fresh context, neutral brief and accessible records. Check
paths exist without opening contents. A contaminated brief requires a new neutral dispatch
before completion. A standalone audit needs no historical record.

Open the window before step 1: `ai-engineering-gate begin --dimension modern-typescript` freezes
the state the verdict binds to, captures who you are and refuses the builder of the task.

## Blind audit, then comparison

1. **Facts.** Establish scope with git diff against the stated base, staged/unstaged changes
   and relevant untracked files. Never git log, PR rationale or author analysis. State
   standalone/proposal mode when applicable. Derive compiler/types/build/runtime/browser
   profile independently. Identify dirty and untracked contents as well as HEAD. Report
   significant author justification encountered in source; do not use it to choose outcomes.
2. **Inventory.** Walk catalog axes at every site, including retained choices. Use signatures
   to locate repeated guards, helpers, lookups, retention, eager work and manual platform
   mechanisms. Read context; a search hit is not evidence.
3. **Freeze.** Emit the immutable expected matrix in your response **before opening any
   record**: site, constraints, rule IDs, acceptable alternatives, support prerequisites
   and invariants. Include sites needing no specialized choice. Freeze acceptable outcomes,
   not exact syntax. Changed verified premises require reframing and a fresh reviewer,
   retaining the old matrix.
4. **Compare.** Now open records and check evidence. Check schema, catalog membership,
   profiles, alternatives, revisions and invariants. Compare expected / recorded / actual
   at every site. Independently verify support claims. A reassuring record is not proof.
   A proposal review judges intended artifacts, not a runtime implementation.
5. **Steelman.** Defend each candidate using concrete compatibility, public contract, domain
   behavior, framework effects, workload or simplicity. Drop it if the defense holds.
   Otherwise cite exact rule and evidence, refute the defense and propose a scoped fix.
   Demonstrated simplification can be Minor; age, missing fashionable syntax or taste
   cannot. No applicable rule means a catalog gap without severity or verdict impact.
   Apply the contract's severity clause for Blocker, Major and Minor; do not restate it.
6. **Report.** File through the window you opened, never beside it. Pipe a
   [review envelope](../transpose-modern-typescript/references/review-envelope.schema.json) to
   `ai-engineering-gate attest --dimension modern-typescript --stdin` for SOUND, and to
   `ai-engineering-gate report --dimension modern-typescript --stdin` otherwise. Type each finding:
   `judgment` carries the correction, `evidence` carries a remedy the builder can execute.
   Put no fingerprint in the envelope - the gate computes all three and accepts none. A refusal
   of `state-moved` means the code moved while you read it: the review is void, say so and stop.
   Edit neither code, records, fixtures nor catalogs; filing the envelope is the only exception.
   The builder corrects or disputes; a fresh reviewer reassesses.

## Report

- Scope/base/examined state, profile and reference versions/hashes.
- Coverage and the previously emitted frozen matrix, unchanged.
- Every site's expected / recorded (or absent in standalone mode) / actual comparison.
- Confirmed findings: severity, location, rule, evidence, comparison, impact, strongest
  defense, refutation and correction.
- Defended choices, rejected candidates, separate catalog gaps, check evidence and limits.
- One verdict: SOUND (complete, zero findings), SMELLS (findings, no Blocker), or VIOLATIONS
  (a Blocker). Missing prerequisites are incomplete execution, not a fourth quality verdict.

SOUND expires on audited file or pinned reference changes: the gate recomputes the source,
reference and decision fingerprints and reports `stale-source`, `stale-reference` or
`stale-decision` rather than keeping a verdict alive. Portable evidence is not an automatic
gate lock. Completion needs every applicable dimension on the same final state, passing checks
and resolved disputes; `ai-engineering-gate can-stop` is what answers that question.
