---
name: agent-instruction-doctor
description: "Diagnose why a coding agent ignores its instructions - rules, skills, hooks, settings, subagents, MCP - and apply only the repairs you select."
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash, Edit, Write, AskUserQuestion
---

# Agent Instruction Doctor

Audit the effective instruction system that controls a coding agent. Reconstruct what can influence behavior, determine what actually applies, then explain the smallest plausible cause of the reported symptom.

Default to diagnosis plus selectable repair candidates. Stay read-only during discovery and diagnosis. Treat the user selecting one or more proposed repair IDs as explicit authorization to apply exactly those patches. Always finish a completed audit with concrete minimal patch candidates when safe textual/configuration repairs can be expressed.

## Output

Keep diagnosis, repair choices, patch previews, and verification inline in the current terminal/conversation. Do not delegate presentation or create/open report artifacts.

## Core principle

Treat agent configuration as an executable instruction graph, not a collection of Markdown files.

Analyze together:

- `AGENTS.md`, `AGENTS.override.md`, `CLAUDE.md`, and equivalent instruction files
- nested/local instructions and parent/global instructions
- rules and their matchers
- skills, their descriptions, references, and scripts
- hooks and transitively invoked commands/scripts
- settings and permission/sandbox constraints
- custom agents/subagents
- MCP/tool configuration and tool availability
- custom commands/prompts when present
- environment-dependent behavior that materially changes execution

Do not report a contradiction merely because two sentences differ. Report only differences capable of changing agent behavior.

## Interpret the user's invocation

The text supplied with this skill is usually a symptom, complaint, or hypothesis.

Examples:

- `audit this repo`
- `my rules about comments are not applied, audit that`
- `the TDD skill sometimes does not trigger`
- `Claude and Codex behave differently on tests`
- `a hook seems to fight the formatter`

If the user provides a symptom, make it the investigation focus. Keep discovery broad enough to find indirect causes outside the named surface.

Example: for `comments keep appearing although my rules forbid them`, inspect not only rules containing the word `comment`, but also skills that request explanation, code-generation templates, formatters/generators, hooks, subagent prompts, conflicting documentation requirements, rule scope, precedence, and reachability.

Do not mechanically filter discovery by keywords from the symptom.

If no symptom is supplied, run a general audit.

Read [references/targeted-audit.md](references/targeted-audit.md) for the symptom-driven method.

## Workflow

### 1. Establish audit root

Use the current working directory unless the user names another path.

Determine the repository root when possible, but preserve the current working directory because nested instruction scope may depend on it.

Record:

- current working directory
- repository root
- user home directory if accessible
- detected harnesses: Claude Code, Codex, both, or uncertain

### 2. Discover instruction sources

Run:

```sh
scripts/discover-agent-config.sh --root "$PWD" --include-global --format markdown
```

Use the manifest as candidate discovery, not as proof that every file is active.

Also inspect repository-specific locations revealed by config files, symlinks, plugin manifests, scripts, or pointers.

Read only the harness reference(s) needed for sources that actually participate in the effective configuration or symptom:

- Claude Code: [references/claude-code-sources.md](references/claude-code-sources.md)
- Codex: [references/codex-sources.md](references/codex-sources.md)

Do not perform a Claude-vs-Codex comparison by default. If the user is debugging Claude, diagnose Claude plus shared/global sources. If the user is debugging Codex, diagnose Codex plus shared/global sources. Compare harnesses only when the symptom spans both, duplicated configuration across them is a plausible cause, or the user explicitly asks for comparison.

### 3. Build the effective instruction graph

For every relevant source, extract nodes with these fields when known:

- `source`: file and line/range
- `kind`: instruction, rule, skill, hook, setting, tool, agent, command, script, pointer
- `harness`: claude, codex, shared, unknown (record for routing; do not compare harnesses unless relevant)
- `scope`: global, repo, subtree, file-pattern, task-specific, runtime
- `activation`: why/when it becomes applicable
- `precedence`: what can override or refine it
- `effect`: the behavior it requires, permits, prevents, or causes
- `dependencies`: pointers, scripts, tools, skills, agents, environment
- `authority`: authoritative source versus duplicated/cache copy
- `reachability`: whether the agent can actually reach or execute it

Normalize prose into atomic behavioral assertions. Preserve the original wording as evidence.

Do not flatten all sources into one bag. Scope and activation are part of the meaning.

### 4. Follow context pointers

A pointer is an instruction that sends the agent to another source, such as:

- a skill description
- `Follow docs/testing.md for tests`
- a rule referencing another file
- a hook invoking a script
- a plugin manifest exposing skills or MCP configuration

Audit both the target and the pointer.

A correct target behind an ambiguous trigger is still a configuration defect.

For each pointer, ask:

1. Is the target reachable?
2. Is the trigger precise enough to fire when required?
3. Is the pointer broader or narrower than the target's real scope?
4. Does another pointer compete for the same branch?
5. Does the target duplicate an already authoritative source?

### 5. Inspect executable behavior

Hooks and scripts are first-class instruction sources.

For each relevant hook:

1. Identify event/trigger and matcher.
2. Identify scope and settings level.
3. Resolve command/script path.
4. Read directly invoked local scripts when safe and relevant.
5. Follow obvious local indirection such as shell script -> package script -> local script.
6. Stop at external/dynamic boundaries and state the uncertainty.
7. Determine observable effects: mutate files, reject tool use, inject context, run validation, format, generate code, spawn another agent, etc.

Do not execute project hooks merely to understand them unless the user explicitly asks for runtime verification and execution is safe.

### 6. Check three dimensions

Perform all three unless the user's symptom clearly makes one irrelevant.

#### Static consistency

Can simultaneously applicable instructions be interpreted without ambiguity or contradiction?

#### Reachability

Can the requested instruction actually be discovered and satisfied with the available skill, tool, agent, permission, path, environment, and runtime configuration?

#### Execution consistency

Can the resulting workflow terminate in a stable state, or do hooks/rules/actions create cycles, ordering conflicts, or completion invalidation?

Read [references/finding-taxonomy.md](references/finding-taxonomy.md) for finding types.

### 7. Trace the symptom

When the user provides a symptom, form competing causal hypotheses before concluding.

Example symptom: `comments are still generated`.

Possible hypotheses include:

- the prohibition has the wrong scope
- a more specific instruction overrides or qualifies it
- the wording does not cover docstrings/JSDoc/generated comments
- the skill containing the rule is not reliably triggered
- a code generator or hook adds comments after the agent edits
- a subagent does not receive the same instruction
- another rule positively asks for documentation/explanatory comments
- examples/templates demonstrate commented code
- the rule is duplicated and divergent
- the rule is unreachable because its pointer is weak
- the behavior is produced by a formatter/generator, not by the model

Seek evidence that distinguishes these hypotheses.

Prefer a causal chain such as:

```text
user symptom
  -> applicable rule
  -> trigger/scope failure
  -> competing instruction or executable effect
  -> observed behavior
```

Do not require the user's hypothesis to be correct.

### 8. Minimize findings

Prefer the smallest causal set that explains the problem.

Do not flood the report with unrelated cleanup findings during a targeted audit. Put materially relevant secondary issues under `Related risks` only when they help explain recurrence.

For a general audit, group findings by severity and causal theme rather than file order.

### 9. Design the smallest repair

Use this remediation order:

1. delete a redundant or misleading instruction
2. choose one authoritative source
3. sharpen a trigger or context pointer
4. narrow or clarify scope
5. make precedence explicit only when the harness does not already define it
6. reconcile/merge conflicting instructions
7. fix reachability or runtime capability
8. fix hook ordering/cycles
9. add new explanatory text only when the previous moves cannot solve the problem

Prefer references to authoritative runtime/project configuration over stale prose copies.

Never invent precedence semantics. If harness behavior cannot be established from local configuration or bundled references, mark it `uncertain` and recommend verification.

### 10. Build selectable patch candidates

After diagnosis, turn each independently actionable repair into a stable candidate ID such as `F01`, `F02`, `F03`.

Each candidate must include:

- finding ID and short title
- evidence-backed root cause
- exact files affected
- smallest repair
- concrete unified diff or exact replacement
- dependencies or conflicts with other candidates, if any

Patch rules:

1. Patch the authoritative source, not every duplicate.
2. Prefer deletion/consolidation over adding another compensating rule.
3. Keep the change limited to findings that explain the symptom or materially prevent recurrence.
4. Preserve unrelated user configuration.
5. Show exact file paths.
6. Use a unified diff when practical. For new/replacement snippets where a diff would be misleading, show the exact replacement block.
7. Separate evidence-backed edits from optional hardening.
8. If multiple findings require one inseparable change, combine them into one candidate instead of pretending they can be selected independently.
9. If two candidates are alternatives, mark them mutually exclusive.
10. If evidence is insufficient, do not create an applyable candidate; state what must be verified.

For a targeted audit, repair candidates are part of the normal output, not an optional appendix.

### 11. Ask which repairs to apply

After presenting candidates, let the user choose before modifying files.

- If a native structured multi-select/question tool is available, use it with one option per applyable candidate. Keep each option concise and preserve the full diff inline above it.
- Otherwise render a Markdown checklist and ask the user to reply with candidate IDs, for example `F01 F03`.
- Do not apply unselected candidates.
- Do not interpret silence as approval.
- Treat selection of candidate IDs as explicit authorization to apply those exact patches; do not ask for a second confirmation unless the selected patches have become stale or unsafe since presentation.
- If the user asks to adjust a candidate first, revise its patch and present the changed candidate before applying it.

A fallback checklist should look like:

```text
Select repairs to apply:
[ ] F01 - Narrow the no-comments rule scope
[ ] F02 - Remove the conflicting documentation instruction
[ ] F03 - Restrict the PostToolUse hook matcher

Reply with IDs, e.g. F01 F03.
```

### 12. Apply selected repairs

For each selected candidate:

1. Re-read the affected file immediately before editing.
2. Ensure the evidence and patch context are still current.
3. Apply only the selected diff.
4. Preserve unrelated formatting and configuration.
5. If a candidate can no longer be applied cleanly, stop that candidate and report it as stale instead of improvising a different repair.

Do not execute project hooks merely because configuration changed.

### 13. Verify selected repairs

After editing, re-run only the narrow static/reachability checks needed to verify the selected causes.

Report each selected candidate as:

- `applied` - patch landed and the configuration now reflects the intended repair
- `stale` - source changed before application; nothing improvised
- `failed` - edit could not be completed
- `needs-runtime-verification` - static repair is present but runtime behavior still requires an explicit experiment

Keep unselected findings visible as unresolved when they still matter.

### 14. Report

Use [references/report-format.md](references/report-format.md). Prefer an inline unified diff for the patch.

For every finding, include evidence from concrete files/lines whenever possible.

Distinguish:

- **Observed**: directly established from files/configuration
- **Inferred**: causal interpretation supported by evidence
- **Unverified**: runtime behavior that would require execution or external documentation

Do not assign arbitrary numeric scores.

## Severity

Use severity based on behavioral impact:

- **Critical**: instructions cannot be jointly satisfied, security/permission behavior is unexpectedly changed, or a cycle can prevent completion.
- **Important**: likely to cause inconsistent or incorrect agent behavior for normal tasks.
- **Moderate**: ambiguity, duplication, weak pointer, or divergence that can cause variance but has a narrower blast radius.
- **Low**: maintainability risk with little current behavioral effect.

Do not inflate severity merely because a file is global.

## Targeted audit behavior

When the user gives a specific problem, report:

1. the most likely root cause(s)
2. the evidence chain
3. alternative plausible causes that remain unverified
4. the smallest repair
5. the proposed patch
6. an optional verification experiment

A verification experiment must be narrow and reversible, for example:

- invoke a skill explicitly versus relying on auto-triggering
- rerun the smallest failing scenario with only the suspected instruction path active
- temporarily disable one hook locally
- ask the agent to state which instruction source it followed

Do not modify configuration to perform the experiment unless explicitly authorized.

## General audit behavior

When no symptom is supplied:

1. inventory effective sources
2. audit static consistency
3. audit reachability
4. audit execution consistency
5. identify duplicated authority and stale-cache risks
6. inspect cross-harness divergence only when it is materially relevant
7. report only material findings

## Important constraints

- Remain read-only until the user selects repair candidate IDs.
- Never execute arbitrary hooks merely because they are present.
- Never expose secrets from settings, environment files, credentials, or MCP configuration. Redact secret values and report only their existence/relevance.
- Do not assume a file is active solely because it exists.
- Do not assume a skill is reachable solely because `SKILL.md` exists.
- Do not assume two different instructions conflict if their scopes never overlap.
- Do not assume comments, docstrings, JSDoc, generated headers, TODOs, and explanatory prose are the same category; infer the user's intended category from context and state ambiguity when material.
- Prefer deletion and one source of truth over adding meta-rules about other rules.
