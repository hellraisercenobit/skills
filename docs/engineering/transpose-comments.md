Quickstart:

```bash
npx skills add hellraisercenobit/skills --skill=transpose-comments
```

```bash
npx skills update transpose-comments
```

[Source](https://github.com/hellraisercenobit/skills/tree/main/skills/engineering/transpose-comments)

**Author:** Guillaume Mongin ([@hellraisercenobit](https://github.com/hellraisercenobit)) · **License:** [MIT](https://github.com/hellraisercenobit/skills/blob/main/skills/engineering/transpose-comments/LICENSE)

## What it does

Applies the comment rules while code is written: no comment by default, one line where the code carries a **why** it cannot show (a decision, a constraint, a workaround, a regression guard), written in Simplified Technical English (ASD-STE100) and placed in the target language's idiom. The defining constraint: the rules are read from the bundled `references/comment-rules.md` on every task, never paraphrased from memory, and every comment written must map to one Why bullet — zero comments is a valid and common result.

## When to reach for it

- **Invocation mode.** Type `/transpose-comments`, or the agent reaches for it automatically before writing or editing code.
- **Trigger boundary.** Reach for this at write time, before any code lands. To judge comments that already exist in a diff, MR, or file, use [review-comments](./review-comments.md).

## Transposition

A lint or type directive carries its why on the same line, in the syntax each tool expects (`eslint-disable-next-line <rule> -- <why>`, `biome-ignore lint/<group>/<rule>: <why>`, `@ts-expect-error <why>`, `# type: ignore[<code>]  # <why>`, …). Docblocks are written only where the toolchain consumes them.

## Bundled references

- `references/comment-rules.md` — the test, the Why list, the Narration list, the Wording rules with STE. Single source of truth, also used by `review-comments`.
