---
name: review-comments
description: Review code comments against the shared comment rules: keep the why, delete narration, rewrite the rest in Simplified Technical English (ASD-STE100). Use when reviewing comments in a diff, MR, or file, deciding whether a comment belongs, or checking a comment against STE. Companion to transpose-comments.
license: MIT
author: Guillaume Mongin (@hellraisercenobit)
---

# review-comments

The audit half of the pair: `transpose-comments` applies the rules while code is written, this skill judges what was written. Default is silence: code that is clear on its own gets no comment.

## Rules

This skill owns no rules. It judges against the bundled source of its companion: [`../transpose-comments/references/comment-rules.md`](../transpose-comments/references/comment-rules.md) (the test, Why, Narration, Wording with STE). Read it before step 3, do not paraphrase from memory.

## Steps

1. **Scope.** Take the files or diff the user named. Otherwise take every comment added or changed in `git diff develop...HEAD` plus uncommitted changes. When a file is named, every comment in it is in scope.
2. **Enumerate.** List every comment in scope: line comments, block comments, docblocks. Directives (`eslint-disable`, `oxlint-disable`, `biome-ignore`, `@ts-expect-error`, `noqa`) and docblocks that tooling requires stay as a technical constraint; only the prose beside or inside them is judged.
3. **Judge.** Put each comment through the test and give it one verdict: a why is a keep, narration is a delete, a why whose wording fails the Wording rules is a tighten. Then scan the same hunks for an unexplained why (a workaround, a magic value, a counter-intuitive branch) and add one line only where the code cannot say it.
4. **Apply.** Edit the working tree in place. If the scope is read-only (a remote MR you cannot check out), report the verdicts as a list with `file:line` and the replacement text.

## Completion criterion

Done when every comment in scope has a verdict and, after applying them, every remaining comment passes the test, holds to one line, and meets every STE rule in Wording, with no why removed. Close with the counts: kept, tightened, deleted, added.
