This is the maintainer guide for composing and extending the transpose/review suite.
Start with the [README](../README.md#how-the-suite-works) for the strategy, [CLI workflow](../README.md#the-workflow-and-the-cli),
[environments](../README.md#how-it-fits-the-environment) (local hooks, no-mistakes, direct PR + CI) and setup.
[Contract 1.1.0](../contracts/suite-contract.md)
is the authoritative execution protocol; this guide explains how to maintain pairs that follow it. Adding a dimension never adds a hook: SessionStart, PreToolUse and Stop stay generic, and optional PostToolUse / SubagentStop never decide validity.

## Members and responsibilities

| Pair | Domain | Protocol status |
| --- | --- | --- |
| [transpose-design-patterns](engineering/transpose-design-patterns.md) / [review-design-patterns](engineering/review-design-patterns.md) | Architectural forces and framework wiring | Implemented; schema 1.0.0 with enumerated forces |
| [transpose-modern-typescript](engineering/transpose-modern-typescript.md) / [review-modern-typescript](engineering/review-modern-typescript.md) | Language, types, collections, consumption, lifetime and platform | Implemented; catalog 1.1.0, schema 2.0.0 |
| [transpose-testing-patterns](engineering/transpose-testing-patterns.md) / [review-testing-patterns](engineering/review-testing-patterns.md) | Test form, seam, oracle, doubles, TDD and TypeScript evidence | Implemented; Vitest adapter, schema 2.0.0 |

The [member manifest](../contracts/members.json) is the registry. `nuke-review`,
`transpose-comments` and `review-comments` are outside it; installing them alongside the
suite does not make them members, prerequisites or substitutes for a suite verdict.

Transpose owns its domain catalog, schema and guides. Review consumes those references;
it does not maintain a competing catalog. The named reviewer agent is a thin wrapper with
no additional rules. Keep procedural requirements in the shared contract and domain
requirements in the relevant catalog.

## Execution contract

Follow the [README installation and first-task steps](../README.md#1-install-the-suite)
to use a pair. Implementations must satisfy all [C01-C12 requirements](../contracts/suite-contract.md#guarantees),
including the [neutral brief](../contracts/suite-contract.md#neutral-brief) and
[composition and expiry rules](../contracts/suite-contract.md#composition-and-expiry).
Installed companions must resolve their references without a maintainer checkout. A missing
catalog or unavailable independent reviewer leaves execution incomplete.

A justified `none` is not a skipped decision. In modern-typescript it means no specialized
transposition is useful and can still involve simple new code. Retaining existing code is
an independent action. A dimension with no applicable site is documented as non-applicable.

## Compose dimensions

Use one builder and only the dimensions the change needs. A local JS guard does not require
a design-pattern record. Testing owns observation and process evidence; design owns an architectural response to
a real testability force; modern-typescript owns idioms and platform choices. When dimensions
apply together, architecture constrains implementation, while a
runtime constraint can reopen architecture. Keep separate records and compatible invariants.

Run any separate tools that edit files before final independent reviews. Final reviewers can
run in parallel against the same frozen state without sharing rationale. An edit to a
shared file invalidates all covering verdicts, including a prose-only edit. No verdict
averaging: every applicable dimension needs current SOUND and successful checks.

An external execution index can list scopes, hashes, reference versions, record paths,
checks and responses. The design schema is versioned like the other two. No generic
orchestration engine is required. Repeating conflicts between domain requirements go to
the user after identifying their incompatible invariants.

## Gate and portable mode

`ai-engineering-gate` is the suite's own gate. It validates record shape against the
envelope and the dimension schema, stores evidence, computes the three fingerprints and
binds a reviewer attestation to the state of the reviewer's window. It does not judge
semantics. A new dimension is a registry member plus that qualification; the gate does
not hard-code `modern-typescript` or `testing-patterns`.

A repository without the marker is portable mode: validated records, checks and independent
state-bound reports, with no automatic enforcement. Opt in with `.ai-engineering-suite.json`.
Load only the references the applicable axes need; a local TS idiom does not pull the
design catalog.

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
5. Qualify both subsets on [the smoke page](../tests/README.md): D through the gate seam in CI, J through the documented live fixtures. Change the manifest status to `qualified` in the same change.
6. Register members, metadata, plugin/index/docs, agent fallback and a changeset; regenerate
   contract bundles and verify installed companions resolve their references. The gate discovers
   members from the registry, never from a hardcoded list.
7. Run small complete fixtures, including retain, a detected defect followed by correction
   and fresh review, missing companion and overlap/invalidation with another dimension.
8. Describe observed evidence and limits before claiming conformity. Version incompatible
   contract changes explicitly and document each member's required migration.

Read [the glossary](../CONTEXT.md) for marker, declaration, fingerprint, envelope, gate, verdict and attestation.

## Add a testing runner adapter

Keep the testing catalog runner-neutral. Add a transpose-owned guide declaring detection,
version/capabilities, catalog mapping, recommended APIs, setup/cleanup, runtime/type
commands, environments, limits and executed examples. Update the domain schema deliberately
when admitting a new adapter, its routing and compatible versions. Qualify a complete
fixture flow, retained choices, defects and unsupported capabilities before claiming support.
The reviewer consumes the same guide. No runtime registry or duplicated catalog is needed.
Vitest Browser Mode with its Playwright provider is part of the Vitest adapter.
