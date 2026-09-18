---
name: review-design-patterns
description: Independently audit design-pattern decisions against the shared pattern catalog - re-derive each site blind and freeze the expected design, then compare it with the recorded decision and the actual code, and put every finding through a steelman gate - so each pattern is confirmed sound or flagged with evidence. USE WHEN reviewing existing code, a diff, or a PR for pattern soundness and anti-patterns (switch-on-type-tag, DTO leaking to UI, Command folded into a store, missing Strategy/Registry, a lazy none), when a transpose-design-patterns task hands its code to a fresh reviewer, or when challenging a not-yet-built design proposal. Companion to transpose-design-patterns. EXAMPLES - "review the design patterns in this lib", "is this Strategy correct?", "audit this PR's architecture", "did I apply Registry right?".
license: MIT
author: Guillaume Mongin (@hellraisercenobit)
---

# Review Design Patterns

An **independent**, adversarial audit of the design-pattern decisions in any codebase. It is the mirror of
`transpose-design-patterns`: that skill decides a pattern (or `none`) and records it; this one judges whether
the code that exists realizes the right design - and is willing to say it does not.

The review is worthless if it is not **independent**. Two failures kill it equally: rubber-stamping the
author's choice, and manufacturing findings to look thorough. The protocol below defends against both - you
re-derive every decision **blind** and **freeze** it, then make each finding survive a **steelman** before
it ships.

## What "independent" means here

- **The catalog is the standard, not the author's intent.** A comment, commit message, PR description or
  design decision record saying "this is the Strategy pattern" is never evidence the design is right. The
  code carries the burden of proof.
- **Re-derive blind, then freeze.** For each site, write down what the catalog says the design *should* be
  **before** you read the author's rationale, the design decision record, comments or commit messages.
  Once written, the expected design does not move: you compare against it, you do not revise it to fit
  what you find.
- **If you wrote it, you are not independent.** When auditing code you authored earlier in this session,
  dispatch the audit to a fresh reviewer - the `design-pattern-reviewer` agent when the harness defines
  one, else a fresh subagent (the `Agent` tool) - with the brief `transpose-design-patterns` prescribes. The
  fresh reviewer never authored anything in scope, so it runs this skill itself and does not dispatch
  again. This is the strongest realization of independence; the blind re-derivation below is the floor.

## Shared standard - read, do not duplicate

This skill owns no catalog. It judges against the bundled sources of its companion, `transpose-design-patterns`:

- **Shared procedure:** resolve `/transpose-design-patterns` and read its `references/suite-contract.md` (contract 1.1.0). Apply its dependency, read-only, neutral-context, composition and state-expiry guarantees alongside this domain protocol. Missing required references mean incomplete execution, never `SOUND`.
- **Catalog (the rules):** [`../transpose-design-patterns/references/pattern-catalog.md`](../transpose-design-patterns/references/pattern-catalog.md)
  - the _Structural forces_ table (with the _Extension-cost test_) and each entry's _Invariants_ are the
  **positive** checklist (what must be observable when the design is right); each entry's **Avoid** clause
  is the **negative** one (your violation checklist); the _Core Principles_ and the table's _Decision_ column
  settle which pattern a force points at, `None` included.
- **Record shape:** [`../transpose-design-patterns/references/design-decision-record.schema.json`](../transpose-design-patterns/references/design-decision-record.schema.json)
  - what a design decision record contains, so you know what to compare against in step 4.
- **Transposition (per framework):** the `transpose-<framework>.md` guide for the project's framework - its
  _Decision Matrix_ and _Anti-Patterns to Avoid_ tell you what *correct* wiring looks like. Resolve the
  framework and pick the guide from the table in
  [`../transpose-design-patterns/SKILL.md`](../transpose-design-patterns/SKILL.md). No guide for the stack:
  judge on the catalog alone.
- **Detection layer (this skill):** [`references/smell-signatures.md`](references/smell-signatures.md) - per
  pattern, how a violation *looks in code*, the steelman that might excuse it, and what confirms it as real.

## Audit procedure

Run every step. The discipline is in steps 3 and 5 - do not skip from "I spotted something" to "here are my
findings".

1. **Frame the audit.** Open your window first: `ai-engineering-gate begin --dimension design-patterns` freezes
   the state your verdict will bind to, captures who you are and refuses you outright if you are the builder of
   this task. State that the standard is the catalog, not author intent. Fix the **scope** - a diff, a lib, the
   whole codebase - and establish a diff with `git diff --stat <base>...HEAD` plus the working tree, **never
   with `git log`**: commit subjects carry the author's intent. Resolve the **framework**. Note whether a
   **design decision record** exists - its path comes from the brief; checking that the path exists is fine,
   reading its content is not. If you authored the code in scope this session, dispatch to a fresh reviewer
   now. _Done when:_ the window is open and scope, framework, record presence and independence stance are
   explicit.

2. **Inventory the pattern-shaped sites.** Find every site with a pattern-shaped decision - interchangeable
   behavior, plugin/extensibility, object-creation logic, a DTO/domain boundary, shared state, a composable
   action, a cross-cutting concern. Locate them by search, never by eyeballing: a small scope is read file by
   file, in full; a large one starts from the repo's dependency graph when it has one (Nx graph, graphify,
   Deptrac layers in PHP) and greps the signature shapes - a `switch`/`if` on a tag, `constructor.name`,
   `instanceof`, `extends`/`abstract`, module-level `let`, `*Dto` or snake_case fields in UI code,
   `as SomeDto` casts, `Map`/`Record`/`satisfies` tables - then reads each hit in context. For a not-yet-built
   design proposal, sites come from the design doc instead of code, and "location" in the report below
   becomes the doc section. _Done when:_ every site in scope is listed - exhaustive, not a sample.

3. **Re-derive blind and freeze the matrix.** For each site write one row in your report, under _Frozen
   matrix_: the site, the structural forces present (catalog _Structural forces_, extension-cost test
   applied), the expected pattern or `none`, the expected transposition (the guide section; for `none`, the
   catalog's `None` _Best practices_), and the expected invariants (the catalog entry's _Invariants_, made
   concrete). Derive from the code, the catalog and the guide only - **before** reading the record, comments,
   commit messages or rationale. Then freeze it: the matrix is the reference for every later step and is
   never edited. _Done when:_ every site has its row and the record is still unopened.

4. **Open the record and confront three ways.** Now read the design decision record when there is one. For
   each site compare **expected** (your row) against **recorded** (the author's decision, or `not covered`
   when the record does not address the site) against **actual** (the code), and label it `match` or
   `candidate finding`. A candidate is: a wrong pattern; a missing pattern (a pattern-shaped need solved ad
   hoc); a wrong `none` (a force present, or the extension-cost test failing); an **Avoid**-clause
   anti-pattern; a mis-transposition (right pattern, wrong framework wiring); a misplaced artifact (a Command
   folded into a store, a DTO leaking into a template); a recorded invariant not observable in the code; a
   recorded `extensionCost` your own count contradicts. Two shapes matter equally: a bad decision
   implemented faithfully, and a good decision implemented wrong. Without a record, expected against actual
   suffices. _Done when:_ every site is labeled.

5. **Steelman gate.** This is what makes the review challenging instead of noisy. For each candidate, build
   the **strongest** defense of the current code - YAGNI over ceremony, deliberate simplicity, a sanctioned
   framework idiom, a closed set that never grows. Then test it: does a catalog rule still get violated, and
   does it still matter? _Done when:_ every candidate is either **dropped** (the steelman held → move it to
   the "Challenged, survived" list) or **confirmed** with a written refutation of its steelman.

6. **Verdict.** Emit the report (format below). _Done when:_ every confirmed finding carries location,
   quoted rule, steelman + refutation, severity, and a fix; catalog gaps are listed apart; and the audit
   ends on one overall verdict.

## Severity

The [contract](../transpose-design-patterns/references/suite-contract.md) owns Blocker, Major and Minor.
Apply that clause. Tie the chosen tier to impact, not to how clever the finding is. A catalog gap has
no severity: it is not a finding (see _Catalog gaps_).

Each finding is also typed. A **judgment** finding says a recorded decision is wrong against the catalog and
carries the `correction` to make. An **evidence** finding says an artifact the record planned is not on file
and carries a `remedy` the builder can execute - `produce` the artifact, or `rerun` the check that proves it.
A finding a builder believes wrong is disputed, never argued in prose: the builder files
`dispute --dimension design-patterns` with counter-evidence, and only the user arbitrates it.

## Verdict

- **SOUND** - zero confirmed findings. The only verdict that completes a `transpose-design-patterns` task.
- **SMELLS** - confirmed findings, none of them a blocker.
- **VIOLATIONS** - at least one blocker.

Open the window before the audit and file through it afterwards, so the verdict binds to the state you read:

```bash
ai-engineering-gate begin --dimension design-patterns          # prints the three fingerprints you bind to
ai-engineering-gate attest --dimension design-patterns --stdin  # SOUND only
ai-engineering-gate report --dimension design-patterns --stdin  # SMELLS and VIOLATIONS
```

Both read a [review envelope](../transpose-design-patterns/references/review-envelope.schema.json) on stdin:
the verdict, the records examined, the checks you saw executed, your independence claim and every finding with
its type, severity and remedy or correction. Never put a fingerprint in it - the gate computes all three and
accepts none - and never file for a dimension you were not dispatched for. If the state moved while you were
reading, `attest` refuses with `state-moved` and the review is void: say so and stop rather than filing on
code you did not read. `SMELLS` and `VIOLATIONS` are reported, never attested: the builder corrects, then a
fresh reviewer reassesses. An implementer never attests its own code, and the gate refuses it by identity.

## Catalog gaps

"No rule, no finding" stays. But a credible structural smell the catalog does not cover is not discarded
silently: list it under **Catalog gaps** with the location, the smell, why the current catalog does not cover
it, and the candidate rule or pattern family for a human to consider. A catalog gap never changes the
verdict and never carries a severity - it feeds the catalog, it does not let the reviewer invent a rule.

## Report format

```
## Design-pattern audit - <scope>

**Verdict:** <SOUND | SMELLS | VIOLATIONS> - <n> findings (<x> blocker, <y> major, <z> minor)
**Compared against record:** <path> | none

### Frozen matrix
| Site | Forces | Expected | Expected transposition | Expected invariants |
| --- | --- | --- | --- | --- |
| `path:line` <what it does> | ... | <pattern | none> | <guide section> | ... |

### Findings
#### [SEVERITY] <title> - `path/to/file.ts:line`
- **Site:** what the code does (the evidence)
- **Expected / recorded / actual:** <your frozen row> / <the author's decision | not covered> / <what the code does>
- **Rule:** <catalog Avoid clause, Invariant, Core Principle, or guide anti-pattern, quoted verbatim>
- **Steelman:** the strongest case for the current code
- **Why it fails:** why that defense does not hold here
- **Fix:** need → pattern → <framework guide section to follow>

### Challenged, survived
- `path:line` - considered <pattern>; current choice stands because <the steelman that held>

### Catalog gaps
- `path:line` - <smell>; not covered because <reason>; candidate: <rule or pattern family>
```

The "Frozen matrix" section is the proof of the blind pass: it is written before the record is opened and is
not edited afterwards. The "Challenged, survived" section is not optional padding - it is the proof the audit
was independent and balanced rather than a hit job. An audit that finds nothing is a valid outcome **only**
when both sections show you re-derived and steelmanned each site.

## Hard rules

- **Independence is non-negotiable.** Never cite the author's stated intent as evidence the design is right.
- **Freeze before you compare.** The expected design is written before the record is opened, and never
  revised afterwards.
- **No rule, no finding.** Every finding quotes a specific catalog **Avoid** clause, **Invariant** or
  **Core Principle**, or a guide anti-pattern. A preference with no rule behind it is taste - drop it; a
  credible smell with no rule goes to _Catalog gaps_, not to _Findings_.
- **No steelman survived, no finding.** If the strongest defense of the code holds, it is not a finding.
- **Never invent rules** absent from the catalog or the framework guide.
- **Findings are framework-checked.** Judge the transposition against the project's `transpose-<framework>.md`,
  not against another framework's idioms.
- **Never modify code in scope.** The review's output is judgment; the fix belongs to the author, and a fresh
  review follows it.
