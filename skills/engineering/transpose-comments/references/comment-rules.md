# Comment rules

Single source of truth for `transpose-comments` (writing) and `review-comments` (audit). A comment earns its place only by carrying a **why** the code cannot show. Everything else is **narration**: it restates the code. Every comment that exists is written in **STE** (ASD-STE100, Simplified Technical English).

## The test

> Does this comment explain why something is done, rather than what the code does?

No: no comment. Yes: one comment, held to the Wording rules below.

## Why

A comment carries a why when it states one of:

- a decision that is non-obvious or counter-intuitive
- a business or technical constraint that shapes the code
- a behaviour required to avoid a bug or a regression
- a temporary workaround or an external limitation
- a complex point whose reason cannot be derived from the code

## Narration

A comment is narration when it:

- describes what an obvious line does
- paraphrases the name of a function or variable
- explains standard syntax
- walks through each step of a simple algorithm
- exists to make the code look documented
- is commented-out code

## Wording

A comment is short and factual. It sits at the one level that needs it, directly above the block or line it explains. One line. One short sentence, or two when STE splits the topic. Multiple lines only when the why genuinely needs them.

Write it in STE:

- **Active voice.** Imperative for an instruction (`Keep the null check.`), simple present for a description (`The API returns null for deleted users.`). The -ing form appears only inside a technical name (`logging level`).
- **One topic per sentence.** 20 words at most for an instruction, 25 for a description.
- **Approved words in their approved meaning.** Identifiers and domain terms are technical names and stay as written. For general words, choose the plain one: `use` not utilize, `before` not prior to, `make sure` not ensure, `start` not commence, `to` not in order to. The dictionary is Part 2 of the standard at asd-ste100.org; when unsure, the shorter and more common word is the approved one.
- **`must` for a requirement, `can` for a possibility.** These two replace should, may, and shall.
- **Full sentences.** Keep the articles and `that`; a short sentence never drops them. Three nouns at most in a row.
- **Specific over vague.** Name the component, the value, the condition. `as required` and `as needed` say nothing.
- **A warning is a command first, then the condition.** `Do not reorder these imports. The polyfill must load before React.`

Before and after:

```
// Ensuring the cache gets invalidated prior to refetching in order to avoid serving stale data
// Clear the cache before the refetch. The upstream API can serve stale data for 30 seconds.
```
