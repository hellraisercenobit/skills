---
name: transpose-modern-typescript
description: "Translate implementation intent into modern idiomatic TS/JS: everyday syntax, types, collections, generators, resource lifetime and native browser APIs. Compare native, library, custom and existing choices; record before editing, then obtain a fresh blind review. Use when writing or refactoring TS/JS with verbose extraction, nullish guards, redundant helpers, repeated lookups, eager production, unsafe casts or manual platform mechanisms. Companion to review-modern-typescript. Excludes prose-only and formatting-only edits."
license: MIT
metadata:
  author: Guillaume Mongin (@hellraisercenobit)
---

# Transpose modern TypeScript

Choose the simplest supported implementation that expresses intent and protects invariants.
Actively seek useful language and platform capabilities: working code can still contain
avoidable complexity. Justify readability, maintenance, safety, work avoided or lifetime.
Keep an existing choice when it wins.

## Read first, then disclose by need

- [Shared contract 1.1.0](references/suite-contract.md): C01-C12, the declaration, the three
  fingerprints, neutral brief, independence, composition, verdicts and gate/portable execution.
  Read once per execution.
- [Catalog 1.1.0](references/catalog.md): inventory axes and rule routing; load applicable families only.
- [Compatibility](references/compatibility.md): compiler, declarations, build and runtime are separate.
- [Record schema 2.0.0](references/decision-record.schema.json) and
  [record guidance](references/record.md): validate before the first affected write.
- Shared shapes beside the contract: [declaration](references/declaration.schema.json),
  [decision envelope](references/decision-envelope.schema.json),
  [evidence append](references/evidence-append.schema.json) and [dispute](references/dispute.schema.json).

Resolve /review-modern-typescript before claiming completion. Both companions require contract
1.1.0, catalog 1.1.0 and record schema 2.0.0. Missing or conflicting references make execution
incomplete. No framework guide is required by this catalog.

## Procedure

0. **Declare.** Pipe a [declaration](references/declaration.schema.json) to
   `ai-engineering-gate declare --dimension modern-typescript --stdin` before any record: whether the
   dimension applies, the reason, the requester's own wording, the factual constraints, the comparison
   base and the protected paths. `non-applicable` with its reason is a complete answer. The reviewer's
   brief is rendered from this document, so it carries no chosen idiom and no rationale.
1. **Frame.** Identify raw need, exact scope/base and actual compiler/lockfile, tsconfig,
   build, runtimes and browsers. Put the ES/compiler target in declaration `constraints`
   when this dimension applies; a tsconfig path is not a substitute. Do not pin projects to
   the test compiler. In JS, use runtime rules and existing JSDoc/checkJs without requiring
   a TS migration. Respect
   framework reactivity, DOM ownership and cleanup. Invoke /transpose-design-patterns only
   for architectural decisions; a local idiom does not automatically need a pattern.
2. **Inventory.** Walk every catalog axis across relevant sites, including retained code.
   Record applicable axes and reasoned exclusions at scope level. Searches suggest
   candidates; read context. Examine access, amount consumed, lifetime, asynchrony,
   platform services, transformations and type guarantees.
3. **Compare.** Read applicable rules. Compare current code, native, library and custom
   constructions wherever plausible. Prefer a supported native capability satisfying the
   whole contract. Explain semantics, complexity, maintenance and compatibility. Preserve
   business meaning in helpers. No blanket bans on loops, reduce, classes, enums,
   libraries or assertions. Distinguish algorithmic benefits from measured timings;
   benchmark only when the decision depends on timing.
4. **Record before editing.** File it: `ai-engineering-gate record --dimension modern-typescript --stdin`,
   which stores it outside the repository, validates it against the envelope and this catalog's schema, and
   refuses a `cites` path that does not exist. Name in `plans` what the record commits to produce. State
   each site's `semanticDelta` - what the change is expected to alter, what it must preserve - and, where a
   type guarantee moves, its `consumption`, so MT-24 is answered rather than assumed. Group coherent choices
   only if all sites remain identifiable. `none` means no specialized transposition helps; simple code can
   still be written. `retain` is a separate action and can retain a named native idiom. A revision names the
   cited paths it `changed`, and the gate refuses one whose citations are byte-identical. Without the gate,
   validate with a JSON Schema 2020-12 validator plus catalog membership checks yourself.
5. **Implement and check.** The first write inside the declared scope is allowed once the record is on file;
   `ai-engineering-gate can-write --path <path>` answers it. Follow recorded invariants. Run proportional
   existing checks and small behavioral/type checks where needed. Types do not prove runtime support. Verify
   touched browser behavior in a real browser with the project's required tooling. Report commands, outcomes
   and remaining limits separately, and file each planned artifact and check output through
   `ai-engineering-gate evidence append --dimension modern-typescript --stdin`.
6. **Dispatch fresh review.** Run `ai-engineering-gate status --full`: once the records and the planned
   evidence are on file it prints the dispatch plan and the neutral brief for each reviewer. Use
   `modern-typescript-reviewer`, otherwise a fresh general subagent without inherited conversation. Send the
   brief as printed - scope and base, raw request, factual constraints, record paths, check evidence - and no
   chosen idiom, rationale, expected verdict or test oracle. The reviewer runs /review-modern-typescript
   itself. Without an independent context, report incomplete execution.
7. **Close the loop.** Corrections are batched: address every pending finding of every dimension, then
   dispatch all applicable reviews together on one state. An evidence finding is closed by its remedy, a
   judgment finding by a revision that `addresses` it. A finding you contest goes to
   `ai-engineering-gate dispute --dimension modern-typescript --stdin` with counter-evidence, and only the
   user arbitrates it. Edits invalidate overlapping verdicts. Finish when `ai-engineering-gate can-stop`
   exits 0.

## Deliverable

Summarize scope/profile, decisions, artifacts, benefits/trade-offs, records/revisions,
checks, independent report and examined state. State portable mode honestly. Do not
implicitly install polyfills, upgrade TS or extend a gate. Catalog gaps are separate
from findings. Missing evidence is not successful completion.
