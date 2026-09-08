# Domain language

Shared vocabulary for agents working in this repo. Add terms as skills and workflows introduce jargon worth pinning down.

## Language

**Skill**:
A folder under `skills/<bucket>/` with a `SKILL.md` (and optional `agents/openai.yaml`, scripts, or reference docs).

**Bucket**:
A category folder under `skills/` — `engineering`, `productivity`, `misc`, `personal`, `in-progress`, or `deprecated`.

**Promoted**:
Skills in `engineering/` or `productivity/`. They appear in the top-level `README.md` and in `.claude-plugin/plugin.json`.

## Relationships

- A **Bucket** holds many **Skills**
- Only **Promoted** skills ship in the Claude Code plugin

## Flagged ambiguities

_None yet._
