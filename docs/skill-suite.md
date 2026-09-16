The transpose/review suite turns a scoped intention into an explicit decision, implementation
and independent judgment. Each pair owns a different dimension; all complete pairs share
[contract 1.0.0](../contracts/suite-contract.md).

## Members and responsibilities

| Pair | Domain | Protocol status |
| --- | --- | --- |
| [transpose-design-patterns](engineering/transpose-design-patterns.md) / [review-design-patterns](engineering/review-design-patterns.md) | Architectural forces and framework wiring | Existing precedent, linked to the common contract; existing record schema preserved |
| [transpose-modern-typescript](engineering/transpose-modern-typescript.md) / [review-modern-typescript](engineering/review-modern-typescript.md) | Language, types, collections, consumption, lifetime and platform | Implemented companion protocol; see [smoke validation](../tests/README.md) for evidence and limits |

`nuke-review`, `transpose-comments` and `review-comments` are separate tools, outside the
suite. They are not members, prerequisites or substitutes for a suite verdict. The comments
review edits files; its behavior remains unchanged. See the
[README setup guide](../README.md#1-install-the-suite) for installation, project policy and
integration with no-mistakes or another pipeline.

Transpose owns its catalog, schema and guides, makes decisions before editing and runs
checks. Review derives expectations in a fresh context, freezes them before reading records,
compares expected/recorded/actual and defends every potential finding before confirming it.
The named reviewer agent is a thin wrapper with no additional rules.

## Use a pair

Install companions together; a review-only installation cannot recreate its missing catalog.

```sh
npx skills add hellraisercenobit/skills --skill transpose-modern-typescript --skill review-modern-typescript
```

The plugin also ships reviewer agents. Other installers can use a fresh general subagent
without builder history. If the harness cannot provide independent context, completion is
pending. Each bundle contains local required references; no maintainer checkout is needed.

1. Establish original need, scope/base, targets and pinned reference versions.
2. Inventory applicable sites and alternatives, including the existing implementation.
3. Validate decision records and preserve revisions outside the repository before editing.
4. Implement and execute appropriate deterministic checks.
5. Send the contract's neutral brief to a fresh read-only reviewer.
6. Fix confirmed findings as the builder, then dispatch a new fresh reviewer.

The report covers every relevant site, includes defended choices and lists catalog gaps
separately. `SOUND` means complete audit with no confirmed finding; `SMELLS` means findings
without a Blocker; `VIOLATIONS` includes a Blocker. Only current SOUND completes a transposition.
Missing prerequisites are incomplete execution, not a fourth quality verdict.

A justified `none` is not a skipped decision. In modern-typescript it means no specialized
transposition is useful and can still involve simple new code. Retaining existing code is
an independent action. A dimension with no applicable site is documented as non-applicable.

## Compose dimensions

Use one builder and only the dimensions the change needs. A local JS guard does not require
a design-pattern record. When both apply, architecture constrains implementation, while a
runtime constraint can reopen architecture. Keep separate records and compatible invariants.

Run any separate tools that edit files before final independent reviews. Final reviewers can
run in parallel against the same frozen state without sharing rationale. An edit to a
shared file invalidates all covering verdicts, including a prose-only edit. No verdict
averaging: every applicable dimension needs current SOUND and successful checks.

An external execution index can list scopes, hashes, reference versions, record paths,
checks and responses. Do not add fields to the existing closed design schema. No generic
orchestration engine is required. Repeating conflicts between domain requirements go to
the user after identifying their incompatible invariants.

## Gate and portable mode

A compatible gate validates record shape/catalog membership and binds a reviewer attestation
to a state it fingerprints itself. It does not judge semantics. Inspect its real CLI first:
support for `modern-typescript` has not been assumed or implemented in an external gate.

Without a required gate, validated records, checks and independent state-bound reports allow
portable completion. They provide no automatic enforcement. If the project requires gate
attestation and the dimension is unsupported or the gate absent, that workflow remains
incomplete. Never substitute the design dimension or silently bypass a rejection.

## Maintain and extend

The maintainer owns [the canonical contract](../contracts/suite-contract.md); domain rules
belong to each transpose. [The member manifest](../contracts/members.json) lists only suite
members. `npm run sync:contract` generates local
contract copies; `npm run check:contract` verifies them without writing. CI checks distribution
and reference resolution. Never maintain these copies by hand.

1. Define a distinct dimension, triggers, exclusions and overlap with existing dimensions.
2. Put stable rule IDs, intent, use conditions, alternatives/trade-offs, avoid cases,
   invariants, compatibility and sources in the transpose-owned catalog.
3. Define a domain schema and meaningful absence-of-specialization decision. Do not copy
   irrelevant fields from another dimension. Pin versions/hashes for each execution.
4. Implement C01-C12 using the bundled contract, neutral brief and read-only review wrapper.
   Declare compatible versions. Missing required guides block; explicitly optional ones do not.
5. Qualify portable behavior and real gate integration separately.
6. Register members, metadata, plugin/index/docs, agent fallback and a changeset; regenerate
   contract bundles and verify installed companions resolve their references.
7. Run small complete fixtures, including retain, a detected defect followed by correction
   and fresh review, missing companion and overlap/invalidation with another dimension.
8. Describe observed evidence and limits before claiming conformity. Version incompatible
   contract changes explicitly and document each member's required migration.

Read [the glossary](../CONTEXT.md) for dimension, record, frozen matrix, verdict and attestation.
