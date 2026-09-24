# Claude Code source map

Use this as a discovery guide, not as immutable precedence documentation. Claude Code evolves; local configuration and current official documentation remain authoritative.

## Common source classes to inspect

### Project/user instruction files

Inspect `CLAUDE.md` files that can apply to the current repository/worktree and relevant parent/user locations.

Record whether a file is:

- repository-wide
- nested under a subtree
- user/global
- referenced/imported by another instruction file

Do not assume two `CLAUDE.md` files conflict until their effective scopes overlap.

### Rules

Inspect project and user Claude rule directories when present, especially `.claude/rules/` and corresponding user-level configuration.

For each rule, capture:

- file path
- any path/file matcher metadata
- instruction body
- references to other docs/skills
- whether its matcher covers the user's failing example

Treat rule matchers as executable scope conditions, not documentation.

### Settings

Inspect Claude Code settings files visible in project/local/user scopes, commonly including files under `.claude/` and `~/.claude/`.

Settings can materially affect:

- hooks
- permissions
- enabled/disabled capabilities
- environment
- plugins or extensions
- model/runtime behavior

Redact secret values.

### Hooks

Hooks are first-class behavior sources.

Extract:

- event
- matcher/condition
- command or hook implementation
- scope/settings level
- exit/decision behavior when understandable
- files or scripts invoked
- whether the hook mutates files or injects context

Read local script targets rather than judging only the hook declaration.

Do not execute hooks during a static audit.

### Skills

Inspect discovered project and user skill directories, commonly `.claude/skills/` and `~/.claude/skills/`, plus plugin-provided skills when their manifests expose them.

For each skill inspect at least:

- `SKILL.md` frontmatter
- description/trigger wording
- main workflow
- relevant references/scripts
- overlap with other skills

A skill existing on disk does not prove it is discoverable in the active harness.

### Agents/subagents

Inspect project/user agent definitions when present, commonly under `.claude/agents/` and user equivalents.

Capture:

- agent description/selection trigger
- instructions
- tools/capabilities
- model/runtime restrictions
- whether material parent instructions remain effective after delegation

### Commands/prompts/plugins

Inspect custom commands/prompts and plugin manifests when present if they participate in the reported workflow.

A command invoked manually can introduce task-specific instructions that override the user's expectation without appearing in repository rules.

## Claude-specific audit questions

1. Is the expected instruction loaded for the affected path/task?
2. Is a rule matcher narrower than the user assumes?
3. Is the behavior delegated to an agent with different instructions/tools?
4. Does a hook run before/after the model action and change the final state?
5. Is a skill behind a weak description/pointer?
6. Do project-local and user-global settings create different behavior?
7. Is a plugin providing an additional skill/hook/tool surface?
