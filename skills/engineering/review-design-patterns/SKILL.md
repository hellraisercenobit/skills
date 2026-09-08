---
name: review-design-patterns
description: Independently audit design-pattern decisions against the shared pattern catalog — re-derive each choice blind, then put every finding through a steelman gate — so each pattern is confirmed sound or flagged with evidence. USE WHEN reviewing existing code, a diff, or a PR for pattern soundness and anti-patterns (switch-on-type-tag, DTO leaking to UI, Command folded into a store, missing Strategy/Registry), or challenging a not-yet-built design proposal. Companion to transpose-design-pattern. EXAMPLES - "review the design patterns in this lib", "is this Strategy correct?", "audit this PR's architecture", "did I apply Registry right?".
license: MIT
author: Guillaume Mongin (@hellraisercenobit)
---

# Review Design Patterns

An **independent**, adversarial audit of the design-pattern decisions in any codebase. It is the mirror of
`transpose-design-pattern`: that skill picks a pattern and transposes it; this one judges whether the code
that exists actually did so — and is willing to say it did not.

The review is worthless if it is not **independent**. Two failures kill it equally: rubber-stamping the
author's choice, and manufacturing findings to look thorough. The protocol below defends against both — you
re-derive every decision **blind**, then make each finding survive a **steelman** before it ships.

## What "independent" means here

- **The catalog is the standard, not the author's intent.** A comment, commit message, or PR description
  saying "this is the Strategy pattern" is never evidence the design is right. The code carries the burden
  of proof.
- **Re-derive blind.** For each site, work out what the catalog says the design *should* be **before** you
  read the author's rationale. Form your own verdict first, then compare.
- **If you wrote it, you are not independent.** When auditing code you authored earlier in this session,
  dispatch the audit to a **fresh subagent** (the `Agent` tool) given only the file paths and this skill —
  it judges with no stake in the code. This is the strongest realization of independence; the blind
  re-derivation below is the floor.

## Shared standard — read, do not duplicate

This skill owns no catalog. It judges against the bundled sources of its companion, `transpose-design-pattern`:

- **Catalog (the rules):** [`../transpose-design-pattern/references/pattern-catalog.md`](../transpose-design-pattern/references/pattern-catalog.md)
  — each pattern's _Use when / Best practices / **Avoid**_, the _Core Principles_, the _Decision Rules_ table.
  The **Avoid** clauses are your violation checklist.
- **Transposition (per framework):** the `transpose-<framework>.md` guide for the project's framework — its
  _Decision Matrix_ and _Anti-Patterns to Avoid_ tell you what *correct* wiring looks like. Resolve the
  framework and pick the guide from the table in
  [`../transpose-design-pattern/SKILL.md`](../transpose-design-pattern/SKILL.md).
- **Detection layer (this skill):** [`references/smell-signatures.md`](references/smell-signatures.md) — per
  pattern, how a violation *looks in code*, the steelman that might excuse it, and what confirms it as real.

## Audit procedure

Run every step. The discipline is in steps 3 and 5 — do not skip from "I spotted something" to "here are my findings".

1. **Frame the audit.** State that the standard is the catalog, not author intent. Fix the **scope** (a diff,
   a lib, the whole codebase) and resolve the **framework**. If you authored the code in scope this session,
   dispatch to a fresh subagent now. _Done when:_ scope, framework, and independence stance are explicit.

2. **Inventory the pattern-shaped sites.** Find every site with a pattern-shaped decision — interchangeable
   behavior, plugin/extensibility, object-creation logic, a DTO/domain boundary, shared state, a composable
   action, a cross-cutting concern. Locate them by search, never by eyeballing: in an Nx repo use the recon
   layer (architecture-map / graphify / Nx graph) per the agents-router; elsewhere grep for the signatures in
   `references/smell-signatures.md`. For a not-yet-built design proposal, sites come from the design doc
   instead of code, and "location" in the report below becomes the doc section. _Done when:_ every site in
   scope is listed — exhaustive, not a sample.

3. **Re-derive blind.** For each site, derive from the catalog the pattern it *should* use and from the guide
   the *correct* transposition — **before** reading the author's comments, commit message, or rationale.
   _Done when:_ each site carries a written "expected" verdict you reached on your own.

4. **Confront.** Compare actual code to your expected verdict. Label each site `match` or `candidate finding`,
   where a candidate is: wrong pattern, missing pattern (a pattern-shaped need solved ad-hoc), an **Avoid**-clause
   anti-pattern, a mis-transposition (right pattern, wrong framework wiring), or a misplaced artifact (e.g. a
   Command folded into a store, a DTO leaking into a template). _Done when:_ every site is labeled.

5. **Steelman gate.** This is what makes the review challenging instead of noisy. For each candidate, build the
   **strongest** defense of the current code — YAGNI over ceremony, deliberate simplicity, a sanctioned framework
   idiom, only two variants that never grow. Then test it: does a catalog rule still get violated, and does it
   still matter? _Done when:_ every candidate is either **dropped** (steelman held → move it to the
   "challenged, survived" list) or **confirmed** with a written refutation of its steelman.

6. **Verdict.** Emit the report (format below). _Done when:_ every confirmed finding carries location, quoted
   rule, steelman + refutation, severity, and a fix; and the audit ends on one overall verdict.

## Severity

Tie severity to impact, not to how clever the finding is.

- **Blocker** — an **Avoid**-clause anti-pattern with concrete bite: `switch`/`constructor.name` on a type tag,
  a DTO leaking into UI/template, global mutable state, exposed writable state, a reuse-bound Command folded
  into a store. Correctness or maintainability will pay for it.
- **Major** — wrong or missing pattern: a pattern-shaped need solved ad-hoc, or a pattern misapplied (giant
  strategy class, a factory with no creation logic, a hand-maintained enum where a Registry belongs).
- **Minor** — transposition / idiom drift that survives the steelman as "works, not idiomatic" (e.g. constructor
  injection over `inject()`, TS `private` over `#`).

## Report format

```
## Design-pattern audit — <scope>

**Verdict:** <SOUND | SMELLS | VIOLATIONS> — <n> findings (<x> blocker, <y> major, <z> minor)

### Findings
#### [SEVERITY] <title> — `path/to/file.ts:line`
- **Site:** what the code does (the evidence)
- **Rule:** <catalog pattern → Avoid clause, quoted verbatim>
- **Steelman:** the strongest case for the current code
- **Why it fails:** why that defense does not hold here
- **Fix:** need → pattern → <framework guide section to follow>

### Challenged, survived
- `path:line` — considered <pattern>; current choice stands because <the steelman that held>
```

The "Challenged, survived" section is not optional padding — it is the proof the audit was independent and
balanced rather than a hit job. An audit that finds nothing is a valid outcome **only** when this section
shows you re-derived and steelmanned each site.

## Hard rules

- **Independence is non-negotiable.** Never cite the author's stated intent as evidence the design is right.
- **No rule, no finding.** Every finding quotes a specific catalog **Avoid** clause or guide anti-pattern. A
  preference with no rule behind it is taste — drop it.
- **No steelman survived, no finding.** If the strongest defense of the code holds, it is not a finding.
- **Never invent rules** absent from the catalog or the framework guide.
- **Findings are framework-checked.** Judge the transposition against the project's `transpose-<framework>.md`,
  not against another framework's idioms.
