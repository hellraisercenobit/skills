---
name: transpose-comments
description: Apply the comment rules while writing code - no comment by default, one STE line where a why exists, placed in the target language's idiom. Use BEFORE writing or editing any code. Companion to review-comments.
license: MIT
author: Guillaume Mongin (@hellraisercenobit)
---

# transpose-comments

Mandatory on every code write or edit: the comment rules are applied as the code is written, so `review-comments` finds nothing to delete. Default is silence.

## Bundled source (this skill owns it)

- **Rules:** [`references/comment-rules.md`](references/comment-rules.md): the test, the Why list, the Narration list, the Wording rules with STE. Read it, do not paraphrase from memory.

## Procedure

1. **Read the rules.** Open `references/comment-rules.md` once per task.
2. **Write with the default.** No comment. At each point where a comment tempts you, ask the test; a no means write nothing.
3. **Write the why.** Where the code carries a decision, constraint, workaround, or regression guard it cannot show, write one line per the Wording rules, directly above it.
4. **Transpose.** Put the line in the target's idiom. A directive carries its why on the same line (table below). Write a docblock only where the toolchain consumes it (typedoc, Javadoc, Sphinx, a lint rule); check the lint config before writing one.
5. **Justify.** In your summary, list each comment written with the Why bullet it satisfies. Zero comments is a valid and common result.

## Transposition: where the why goes on a directive

| Target     | Directive with its why                                 |
| ---------- | ------------------------------------------------------ |
| ESLint     | `// eslint-disable-next-line <rule> -- <why>`          |
| oxlint     | `// oxlint-disable-next-line <rule> -- <why>`          |
| Biome      | `// biome-ignore lint/<group>/<rule>: <why>`           |
| TypeScript | `// @ts-expect-error <why>`                            |
| Stylelint  | `/* stylelint-disable-next-line <rule> -- <why> */`    |
| mypy       | `# type: ignore[<code>]  # <why>`                      |

Biome rejects a suppression without its why. The other tools accept a bare directive, so the why is on you.

For any other target, the why goes in a line comment directly above the directive.

## Completion criterion

Done when every comment in the code you wrote maps to one Why bullet, holds to one line in STE, and sits directly above what it explains, and no directive stands without its why.
