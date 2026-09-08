# Writing docs pages

Every skill in `engineering/` and `productivity/` gets a human-facing **docs page** at `docs/<bucket>/<skill-name>.md`. The docs tree mirrors those two buckets. Non-promoted buckets (`misc/`, `personal/`, `in-progress/`, `deprecated/`) get **no** docs page.

Act whenever a promoted skill is added, renamed, or has its behaviour changed: create or re-sync its docs page. A rename moves the file too. A skill leaving a promoted bucket loses its page; one entering gains one.

Prefer absolute GitHub links when publishing docs outside the repo.

There is no H1 — the page title comes from the skill name / slug.

## Page structure

```markdown
Quickstart:

\`\`\`bash
npx skills add hellraisercenobit/skills --skill=<name>
\`\`\`

\`\`\`bash
npx skills update <name>
\`\`\`

[Source](https://github.com/hellraisercenobit/skills/tree/main/skills/<bucket>/<name>)

## What it does

One or two plain-language paragraphs. Lead with the skill's one-sentence job, then the defining constraint that makes it different from the obvious default.

## When to reach for it

- **Invocation mode.** User-invoked: "You type `/<name>` — the agent won't reach for it on its own." Model-invoked: "Type `/<name>`, or the agent reaches for it when a task fits."
- **Trigger boundary.** "Reach for this when …". If confusable with a sibling, point to the sibling.

## Prerequisites

Optional — only when something must already be in place. Omit the heading otherwise.

## <free-form middle>

One to three short sections in the skill's own vocabulary that make it click.
```
