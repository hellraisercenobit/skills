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

Diagnoses why a coding agent does not behave as its instructions say: a rule that is ignored, a skill that does not trigger, a hook that fights another step, two instructions that contradict each other. It rebuilds the effective configuration from the current directory up to the user's global settings, finds the smallest cause that explains the symptom, and ends with repair candidates you choose from. The defining constraint: configuration is read as an executable instruction graph, not a bag of Markdown files. Scope, activation, precedence and reachability are part of every instruction's meaning, and a hook or script counts as much as a sentence.

Discovery and diagnosis are read-only. Each repair comes as a candidate with its own ID (`F01`, `F02`...) and its exact diff; the skill applies only the IDs you select, re-checks each one and reports it as `applied`, `stale`, `failed` or `needs-runtime-verification`. Unselected findings stay listed as open.

## When to reach for it

- **Invocation mode.** You type `/agent-instruction-doctor`, with a symptom or none for a general audit. The agent won't reach for it on its own.
- **Trigger boundary.** Reach for this when an agent ignores a rule, keeps producing a style you forbade, skips a skill, is blocked by a hook, or drifts after delegating to a subagent, or when you want a general audit of `AGENTS.md`, `CLAUDE.md`, rules, skills, hooks, settings and MCP configuration. It compares Claude Code and Codex only when the symptom spans both harnesses.

## Symptom first, not keyword first

The text you pass is the symptom to explain, not a search filter. "Comments keep appearing" leads to the no-comment rule, and also to its scope, the skills and templates that ask for explanations, the subagents that never receive the rule, and the formatters or hooks that write comments after the agent. The skill forms competing hypotheses across those layers before it concludes, and it labels each claim as observed, inferred or unverified.

## Smallest repair

The report follows a fixed remediation order. Delete a redundant or misleading instruction first, then choose one authoritative source, sharpen a trigger, narrow a scope. Add new text only when nothing smaller works. Findings use one taxonomy (contradictions, scope gaps, weak or broken pointers, unreachable skills, hook collisions, execution cycles, harness divergence), and each patch edits the authoritative source instead of every duplicate. Candidates that must land together are merged into one; alternatives are marked mutually exclusive.

`scripts/discover-agent-config.sh` lists candidate instruction and configuration files, read-only. A file that exists is a candidate, not proof that it is active.

## Guardrail

On Claude Code, the skill registers its own hooks when you invoke it (`hooks/guardrail.mjs`, Node, no dependency). They prove each step of the workflow with content hashes instead of trusting the prose:

- **Read-only diagnosis.** Every file write is denied until you select candidate ids, and the turn cannot end while a discovered instruction source has a different sha256 than at invocation.
- **Discovery and manifest.** The turn cannot end before `discover-agent-config.sh` ran and the candidates manifest (`candidates.json`, validated against `hooks/candidates.schema.json`) was written; the reference reads are reported to you as a warning only.
- **Selection and application.** An edit is allowed only on a file listed by a selected candidate, re-read after the selection and unchanged since, whose patch is still the one you saw. A candidate whose patch changed is stale and must be presented again.
- **Verification.** After applying, the final message must carry a status per selected id (`applied`, `stale`, `failed`, `needs-runtime-verification`).

The guardrail is fail-visible, not fail-closed: if `node` or the script cannot be found, the invocation tells Claude to say so; an internal error never blocks. Evidence lives in an append-only ledger under the system temp directory (digests, paths and ids, never file content) and is purged after 24 hours. `node hooks/guardrail.mjs self-check` prints where the guardrail runs and whether `hooks/contract.json` still matches `SKILL.md`. Limits: Claude Code only (Codex, Cursor and Copilot ignore the frontmatter hooks), a resumed session does not re-register the hooks until you invoke the skill again, the resolver needs a POSIX `sh`, and the source fingerprint covers what `discover-agent-config.sh` lists, which skips skills installed as symlinks because `find -type f` does not follow them.
