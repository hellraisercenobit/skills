# Codex source map

Use this as a discovery guide, not as immutable precedence documentation. Codex evolves; current official documentation and the installed runtime remain authoritative.

## AGENTS instruction chain

Inspect `AGENTS.md` and `AGENTS.override.md` files that may apply from relevant ancestors through the working directory/subtree.

For each file capture:

- directory scope
- whether it is an override versus normal instruction source
- relative specificity to the target file/task
- instructions and pointers it contains

Also inspect configuration that changes project instruction discovery, including custom fallback filenames or instruction-size limits when present.

Never assume a repository `AGENTS.md` is the only source.

## Skills

Inspect repository and user skill locations exposed to Codex, including `.agents/skills/` or other capability/skill directories configured by the environment.

For each skill inspect:

- `SKILL.md` name and description
- trigger branches implied by the description
- body workflow
- supporting references/scripts relevant to the symptom
- whether the directory is actually exposed/discoverable

Codex skill discovery depends on the harness/environment exposing the skill directory; a `SKILL.md` file alone is insufficient evidence of reachability.

## Configuration

Inspect Codex configuration files such as relevant `config.toml` files and repository/plugin configuration when present.

Potentially material settings include:

- model/runtime selection
- sandbox/approval policy
- tool/MCP servers
- project instruction discovery settings
- plugin/capability directories
- environment/network constraints

Redact credentials and secret values.

## Plugins and MCP

When plugin manifests or MCP configuration exist, capture:

- exposed skills
- MCP servers/tools
- paths to configuration
- whether referenced capabilities are available in the relevant environment

A skill requiring an MCP tool can be semantically correct but ineffective when the tool is unavailable.

## Agents and orchestration

When the Codex environment defines specialized agents/subagents or orchestration configuration, inspect their instructions and capabilities just like Claude subagents.

## Codex-specific audit questions

1. Which AGENTS/override sources actually apply to the target path?
2. Does a more-specific instruction change a repository-wide invariant?
3. Is a fallback instruction filename unexpectedly participating?
4. Is the skill directory exposed to the harness?
5. Does the skill description cover the user's intended trigger?
6. Does sandbox/approval/network configuration make an instruction impossible?
7. Does MCP/plugin configuration add a competing workflow or missing dependency?
