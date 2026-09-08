Quickstart:

```bash
npx skills add hellraisercenobit/skills --skill=review-comments
```

```bash
npx skills update review-comments
```

[Source](https://github.com/hellraisercenobit/skills/tree/main/skills/engineering/review-comments)

**Author:** Guillaume Mongin ([@hellraisercenobit](https://github.com/hellraisercenobit)) · **License:** [MIT](https://github.com/hellraisercenobit/skills/blob/main/skills/engineering/review-comments/LICENSE)

## What it does

Audits every comment in a diff, MR, or file against the shared comment rules and gives each one a verdict: a why is a **keep**, narration is a **delete**, a why with weak wording is a **tighten** into Simplified Technical English (ASD-STE100). It then scans the same hunks for an unexplained why and adds one line only where the code cannot say it. The defining constraint: this skill owns no rules — it judges against the rules bundled in `transpose-comments`, so writing and review never drift apart.

## When to reach for it

- **Invocation mode.** Type `/review-comments`, or the agent reaches for it automatically when reviewing comments.
- **Trigger boundary.** Reach for this when reviewing comments in a diff, MR, or file, deciding whether a comment belongs, or checking a comment against STE. To apply the rules while writing, use [transpose-comments](./transpose-comments.md).

## Prerequisites

Install [transpose-comments](./transpose-comments.md) beside it: the rules file `references/comment-rules.md` is resolved from the companion skill's folder.

## Verdicts

Directives (`eslint-disable`, `biome-ignore`, `@ts-expect-error`, `noqa`) and tooling-required docblocks stay as a technical constraint; only the prose beside or inside them is judged. The run closes with four counts: kept, tightened, deleted, added.
