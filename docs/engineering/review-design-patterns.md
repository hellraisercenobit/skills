Quickstart:

```bash
npx skills add hellraisercenobit/skills --skill=review-design-patterns
```

```bash
npx skills update review-design-patterns
```

[Source](https://github.com/hellraisercenobit/skills/tree/main/skills/engineering/review-design-patterns)

**Author:** Guillaume Mongin ([@hellraisercenobit](https://github.com/hellraisercenobit)) · **License:** [MIT](https://github.com/hellraisercenobit/skills/blob/main/skills/engineering/review-design-patterns/LICENSE)

## What it does

Independently audits design-pattern decisions against the shared catalog: re-derives each site blind and freezes the expected design, then compares it with the recorded decision and the actual code, and puts every finding through a steelman gate. The defining constraint: author intent is never evidence - the catalog is the standard, the expected design is written before the record is opened and never revised afterwards, and each finding must survive the strongest defense of the current code.

## When to reach for it

- **Invocation mode.** Type `/review-design-patterns`, or the agent reaches for it automatically when a task fits.
- **Trigger boundary.** Reach for this when reviewing code, a diff, or a PR for pattern soundness / anti-patterns, when a `transpose-design-pattern` task hands its code over, or when challenging a not-yet-built design. To *choose and apply* a pattern before coding, use [transpose-design-pattern](./transpose-design-pattern.md).

## Prerequisites

Optional: the `design-pattern-reviewer` subagent, shipped by the Claude Code plugin and linked by `npm run link-skills`. It runs this skill read-only (Read, Grep, Glob, Bash, Skill; no Write or Edit). Without it, the companion skill dispatches a fresh general subagent with the same brief.

## Three-way comparison

For every pattern-shaped site the reviewer writes one row - forces, expected pattern or `none`, expected transposition, expected invariants - and freezes the matrix. Only then does it open the design decision record and confront **expected** against **recorded** against **actual**. That catches both a bad decision implemented faithfully and a good decision implemented wrong.

## Verdicts and catalog gaps

`SOUND` is zero confirmed findings and the only verdict that completes a task; `SMELLS` is findings without a blocker; `VIOLATIONS` is at least one blocker. Only `SOUND` is attested (to `ai-engineering-gate` when the harness provides it). A credible structural smell the catalog does not cover is reported apart, under _Catalog gaps_, with no severity and no effect on the verdict: it feeds the catalog instead of letting the reviewer invent a rule.

## Companion

Judges against the catalog and guides owned by [transpose-design-pattern](./transpose-design-pattern.md); detection signatures live in `references/smell-signatures.md`.
