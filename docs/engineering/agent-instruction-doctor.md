Quickstart:

```bash
npx skills add hellraisercenobit/skills --skill=agent-instruction-doctor
```

```bash
npx skills update agent-instruction-doctor
```

[Source](https://github.com/hellraisercenobit/skills/tree/main/skills/engineering/agent-instruction-doctor)

**Author:** Guillaume Mongin ([@hellraisercenobit](https://github.com/hellraisercenobit)) · **License:** [MIT](https://github.com/hellraisercenobit/skills/blob/main/skills/engineering/agent-instruction-doctor/LICENSE)

## What it does

Diagnoses why a coding agent does not behave as its instructions say: a rule that is ignored, a skill that does not trigger, a hook that fights another step, two instructions that contradict each other. It rebuilds the effective configuration from the current directory up to the user's global settings, finds the smallest cause that explains the symptom, and ends with a minimal patch. The defining constraint: configuration is read as an executable instruction graph, not a bag of Markdown files. Scope, activation, precedence and reachability are part of every instruction's meaning, and a hook or script counts as much as a sentence.

It stays read-only unless you ask it to apply the patch.

## When to reach for it

- **Invocation mode.** Type `/agent-instruction-doctor`, or the agent reaches for it when a task fits.
- **Trigger boundary.** Reach for this when an agent ignores a rule, keeps producing a style you forbade, skips a skill, is blocked by a hook, or drifts after delegating to a subagent, or when you want a general audit of `AGENTS.md`, `CLAUDE.md`, rules, skills, hooks, settings and MCP configuration. It compares Claude Code and Codex only when the symptom spans both harnesses.

## Symptom first, not keyword first

The text you pass is the symptom to explain, not a search filter. "Comments keep appearing" leads to the no-comment rule, and also to its scope, the skills and templates that ask for explanations, the subagents that never receive the rule, and the formatters or hooks that write comments after the agent. The skill forms competing hypotheses across those layers before it concludes, and it labels each claim as observed, inferred or unverified.

## Smallest repair

The report follows a fixed remediation order. Delete a redundant or misleading instruction first, then choose one authoritative source, sharpen a trigger, narrow a scope. Add new text only when nothing smaller works. Findings use one taxonomy (contradictions, scope gaps, weak or broken pointers, unreachable skills, hook collisions, execution cycles, harness divergence), and the patch edits the authoritative source instead of every duplicate.

`scripts/discover-agent-config.sh` lists candidate instruction and configuration files, read-only. A file that exists is a candidate, not proof that it is active.
