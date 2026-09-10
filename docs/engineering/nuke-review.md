Quickstart:

```bash
npx skills add hellraisercenobit/skills --skill=nuke-review
```

```bash
npx skills update nuke-review
```

[Source](https://github.com/hellraisercenobit/skills/tree/main/skills/engineering/nuke-review)

**Author:** Cursor (upstream), adapted by Guillaume Mongin ([@hellraisercenobit](https://github.com/hellraisercenobit)) · **License:** [MIT](https://github.com/hellraisercenobit/skills/blob/main/skills/engineering/nuke-review/LICENSE), Copyright (c) 2026 Cursor

## Origin

Fork of [`thermo-nuclear-code-quality-review`](https://github.com/cursor/plugins/blob/main/cursor-team-kit/skills/thermo-nuclear-code-quality-review/SKILL.md) from the Cursor team's `cursor-team-kit` plugin in [cursor/plugins](https://github.com/cursor/plugins), MIT licensed, taken at upstream commit [`6e3d2ea`](https://github.com/cursor/plugins/commit/6e3d2ea56d7d446b955eaae6ac4c8eef8bf504cf) (2026-05-28). Cursor's part: the eight standards, the 1000-line threshold, the finding order and the approval bar. This fork's part, applied with the `writing-for-agents` levers:

- one procedure of four steps, each with a completion criterion, where upstream had a baseline prompt plus rules
- each standard stated once in a signal/remedy table, where upstream restated them across five sections (standards, questions, flags, remedies, approval bar)
- positive wording throughout, where upstream steered by prohibition
- the name `nuke-review`, typed as `/nuke-review`, and a one-line description per this repo's user-invoked convention

About a third of the upstream length. The original text is at the link above; the modifications are MIT as well.

## What it does

Runs an unusually strict code quality audit of the current branch's changes, focused on maintainability rather than correctness: abstraction quality, modularity, files pushed past 1000 lines, ad-hoc conditionals bolted onto unrelated flows, thin wrappers, cast-heavy boundaries, logic living outside its canonical layer. The defining constraint: the reviewer must be ambitious and look for "code judo" moves, restructurings that keep behavior and delete whole categories of complexity, instead of settling for local cleanups.

## When to reach for it

- **Invocation mode.** You type `/nuke-review`; the agent will not reach for it on its own.
- **Trigger boundary.** Reach for this before merging a branch whose structure you want challenged hard, or when a PR "works" but leaves the codebase messier. For design-pattern soundness specifically, use [review-design-patterns](./review-design-patterns.md); for comments, [review-comments](./review-comments.md).

## Approval bar

The skill does not approve on "behavior seems correct". Presumptive blockers: a file crossing 1000 lines because of the PR, new special-case branches in an existing flow, feature checks scattered across shared code, unnecessary wrappers or casts, a duplicated helper where a canonical one exists, and incidental complexity that a visible code-judo move would delete. Findings come out ordered by structural impact, few and high-conviction rather than a list of nits.
