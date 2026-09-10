---
name: nuke-review
description: Run an extremely strict maintainability review for abstraction quality, giant files, and spaghetti-condition growth.
disable-model-invocation: true
license: MIT
author: Cursor (upstream, MIT); adapted by Guillaume Mongin (@hellraisercenobit)
---

# Nuke Review

> Fork of Cursor's [`thermo-nuclear-code-quality-review`](https://github.com/cursor/plugins/blob/main/cursor-team-kit/skills/thermo-nuclear-code-quality-review/SKILL.md) from the `cursor-team-kit` plugin (MIT, Copyright (c) 2026 Cursor, upstream commit [`6e3d2ea`](https://github.com/cursor/plugins/commit/6e3d2ea56d7d446b955eaae6ac4c8eef8bf504cf)). The standards, the 1000-line threshold, the finding order and the approval bar are Cursor's. This fork restructures them for an agent: one procedure with completion criteria, each standard stated once, positive wording. See the `LICENSE` beside this file.

A maintainability review of the current branch held to a thermo-nuclear bar: correct code still fails it when the structure got worse. The reviewer hunts for the **code judo** move, a restructuring that keeps behavior and deletes whole categories of complexity, before it settles for local cleanups.

## Procedure

1. **Scope.** Take the diff the user named. Otherwise take `git diff <base>...HEAD` plus the uncommitted changes, with `<base>` the branch the PR targets. Note each touched file's line count before and after. _Done when_ every hunk is on your list.
2. **Hunt the code judo move.** Restate what the change must achieve, then look for the shape that needs fewer concepts, branches, or layers: the ownership boundary moved so the feature becomes a natural extension of an existing abstraction, the state model reframed so the conditionals vanish, the special case turned into the default flow. _Done when_ you hold either a concrete reframing (what disappears, what remains) or the reason the current shape is already the simple one.
3. **Apply the standards.** Put every hunk through every row of the table below. Record each breach as `file:line`, standard, evidence, remedy. _Done when_ every hunk has met every row.
4. **Verdict.** Write the report in the format below. Approve only when step 2 came back empty and no row is breached; every breach is a presumptive blocker until the author justifies it. _Done when_ each finding carries its four fields and the report ends on approve or block.

## Standards

| Standard | Signal in the hunk | Remedy to ask for |
| --- | --- | --- |
| **Code judo** | Incidental complexity kept when a reframing would delete it; a refactor that moves complexity around and leaves the reader holding as many concepts as before | Delete the layer of indirection; reframe the state model so the conditionals disappear; move the ownership boundary |
| **File size** | This PR pushes a file from under 1000 lines to over | Decompose first: extract helpers, subcomponents, modules. Waive only for a compelling structural reason, with the file still clearly organized |
| **Spaghetti growth** | New ad-hoc conditionals, one-off booleans, nullable modes, special cases, or "temporary" branching inserted into unrelated or already busy flows; a narrow edge case handled in the middle of a large function | A dedicated abstraction, helper, state machine, policy object, or module; duplicate branches collapsed into one flow |
| **Design over working code** | Behavior is right and the surrounding code got harder to reason about, less modular, or less readable | Keep the behavior, restructure the implementation; prefer the change that removes moving pieces over one that spreads them |
| **Direct over magical** | Brittle or "magic" generic mechanisms hiding simple data shapes; thin wrappers, identity abstractions, pass-through helpers | Keep the direct flow; delete the wrapper that clarifies nothing |
| **Type and boundary cleanliness** | Unnecessary optionality, `unknown`, `any`, casts, ad-hoc object shapes; a silent fallback papering over an unclear invariant | An explicit typed model or shared contract; a boundary made explicit so the control flow simplifies |
| **Canonical layer** | Feature logic leaking into shared paths, implementation details leaking through an API, copy-pasted logic, a bespoke helper beside an existing canonical one | Reuse the canonical helper; move the logic to the package, service, or module that owns the concept |
| **Orchestration and atomicity** | Independent work serialized for no reason; related updates that can leave state half-applied | Parallelize when it also simplifies the orchestration; restructure related updates into one atomic flow |

## Report

Order the findings by impact: structural regressions, missed code judo moves, spaghetti and branching growth, boundary and type-contract problems, file size and decomposition, modularity, legibility. A few high-conviction findings; a cosmetic note appears only once nothing structural is open.

Each finding: `file:line`, the standard, the evidence, the remedy. The tone is direct, serious, and demanding, and a structural problem is named as one:

- `this pushes the file past 1k lines. can we decompose this first?`
- `this adds another special-case branch into an already busy flow. can we move this behind its own abstraction?`
- `i think there's a code-judo move here that makes this much simpler. can we reframe this so these branches disappear?`

End on the verdict: **approve**, or **block** with the blockers listed first.
