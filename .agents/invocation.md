# Model-invoked vs user-invoked

Every `SKILL.md` in this repo is a skill. The axis that splits them is **invocation** — who can reach it:

- **User-invoked** — reachable **only by the human typing its name**. Set `disable-model-invocation: true` in the frontmatter (Claude Code) and `policy.allow_implicit_invocation: false` in `agents/openai.yaml` (Codex). The `description` is **human-facing**: a one-line summary. Strip trigger lists ("Use when the user says…").
- **Model-invoked** — reachable by **model or user**. Omit `disable-model-invocation` and the `policy` block. The `description` is **model-facing** and keeps rich trigger phrasing ("Use when the user wants…, mentions…, asks for…") so auto-invocation can fire. Test: _could the model usefully reach for this autonomously?_

Each harness excludes a user-invoked skill from the model's reach in its own way. A user-invoked skill may invoke model-invoked skills, but it can never reach another user-invoked skill.

Every skill also carries an `agents/openai.yaml` beside its `SKILL.md` for Codex UI metadata (`interface.display_name`, `interface.short_description`) and, for user-invoked skills, the `policy` block. Keep both harnesses in sync: user-invoked in both or neither.

Bucket `README.md`s and the top-level `README.md` group entries into **User-invoked** and **Model-invoked**.

## Dependencies

Express dependencies as **`/skill`-style prose** ("Run the `/other-skill` skill"), not deep cross-folder file links. Shared reference docs live inside the skill that owns them.
