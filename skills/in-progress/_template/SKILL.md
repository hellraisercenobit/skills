---
name: example-skill
description: Short human-facing summary (user-invoked) OR rich trigger phrasing (model-invoked). Replace before promoting.
disable-model-invocation: true
---

# Example skill

Replace this body with the workflow the agent should follow.

## Steps

1. Clarify the goal with the user if anything is ambiguous.
2. Do the work in small, reviewable steps.
3. Summarize what changed and what remains.

## Notes

- Prefer invoking other skills with `/skill-name` prose rather than cross-folder file links.
- Read `CONTEXT.md` when domain vocabulary matters.
- Delete this template copy (or rename it) once your real skill exists — `_template` itself is not linked by `npm run link-skills`.
