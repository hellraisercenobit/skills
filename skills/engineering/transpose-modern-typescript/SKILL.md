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

- [Shared contract 1.0.0](references/suite-contract.md): C01-C12, neutral brief, independence,
  composition, verdicts and gate/portable execution. Read once per execution.
- [Catalog 1.0.0](references/catalog.md): inventory axes and rule routing; load applicable families only.
- [Compatibility](references/compatibility.md): compiler, declarations, build and runtime are separate.
- [Record schema 1.0.0](references/decision-record.schema.json) and
  [record guidance](references/record.md): validate before the first affected write.

Resolve /review-modern-typescript before claiming completion. Both companions require
contract/catalog/schema 1.0.0. Missing or conflicting references make execution incomplete.
No framework guide is required by this catalog.

## Procedure

1. **Frame.** Identify raw need, exact scope/base and actual compiler/lockfile, tsconfig,
   build, runtimes and browsers. Do not pin projects to the test compiler. In JS, use
   runtime rules and existing JSDoc/checkJs without requiring a TS migration. Respect
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
4. **Record before editing.** Save outside the repository and validate with a JSON Schema
   2020-12 validator plus catalog membership checks. Group coherent choices only if all
   sites remain identifiable. `none` means no specialized transposition helps; simple code
   can still be written. `retain` is a separate action and can retain a named native idiom.
   Preserve revisions and reasons. Follow the shared gate protocol and inspect real
   support for `modern-typescript`; never substitute `design`.
5. **Implement and check.** Follow recorded invariants. Run proportional existing checks
   and small behavioral/type checks where needed. Types do not prove runtime support.
   Verify touched browser behavior in a real browser with the project's required tooling.
   Report commands, outcomes and remaining limits separately.
6. **Dispatch fresh review.** Use `modern-typescript-reviewer`, otherwise a fresh general
   subagent without inherited conversation. Fill the shared neutral brief with scope/base,
   raw request, factual constraints, record paths and check evidence. No chosen idiom,
   rationale, expected verdict or test oracle. The reviewer runs /review-modern-typescript
   itself. Without an independent context, report incomplete execution.
7. **Close the loop.** The builder fixes findings, then dispatches a new fresh reviewer.
   Disputes go to the user. Edits invalidate overlapping verdicts. Finish only with checks
   passing and current SOUND in every applicable dimension, plus required gate attestation.

## Deliverable

Summarize scope/profile, decisions, artifacts, benefits/trade-offs, records/revisions,
checks, independent report and examined state. State portable mode honestly. Do not
implicitly install polyfills, upgrade TS or extend a gate. Catalog gaps are separate
from findings. Missing evidence is not successful completion.
