# Domain language

Shared vocabulary for agents working in this repo. Add terms as skills and workflows introduce jargon worth pinning down.

## Language

**Skill**:
A folder under `skills/<bucket>/` with a `SKILL.md` (and optional `agents/openai.yaml`, scripts, or reference docs).

**Bucket**:
A category folder under `skills/` — `engineering`, `productivity`, `misc`, `personal`, `in-progress`, or `deprecated`.

**Promoted**:
Skills in `engineering/` or `productivity/`. They appear in the top-level `README.md` and in `.claude-plugin/plugin.json`.

**Agent**:
A Claude Code subagent definition under `agents/`, shipped by the plugin and linked into `~/.claude/agents`. It runs a skill with a fixed tool set; it owns no rules of its own.

**Companion pair**:
A `transpose-*` skill that decides and writes, and its `review-*` twin that audits blind against the reference files the first one owns.

## Relationships

- A **Bucket** holds many **Skills**
- Only **Promoted** skills ship in the Claude Code plugin
- A **Companion pair** shares one reference set, owned by the `transpose-*` half
- An **Agent** runs one skill of a pair with a restricted tool set

## Flagged ambiguities

_None yet._
