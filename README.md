# Skills

Personal agent skills by **Guillaume Mongin** ([@hellraisercenobit](https://github.com/hellraisercenobit)). Licensed under [MIT](./LICENSE); ownership is recorded in [NOTICE](./NOTICE).

The **transpose/review suite** records decisions before implementation, then checks the result through an independent review. Its four skills are **model-invoked** and can also be selected by the user. It has exactly two dimensions:

| Dimension | Before implementation | Independent review |
| --- | --- | --- |
| Design patterns | [transpose-design-patterns](./skills/engineering/transpose-design-patterns/SKILL.md) | [review-design-patterns](./skills/engineering/review-design-patterns/SKILL.md) |
| Modern TS/JS | [transpose-modern-typescript](./skills/engineering/transpose-modern-typescript/SKILL.md) | [review-modern-typescript](./skills/engineering/review-modern-typescript/SKILL.md) |

`nuke-review`, `transpose-comments` and `review-comments` are **separate tools, outside this suite**. The whole plugin also installs them; that does not make them suite members or prerequisites.

## 1. Install the suite

You need Git, Node.js/npm and a configured coding agent. Use Node 24 for this repository's own checks. The skills follow the target project's compiler and runtime; they do not require a TypeScript upgrade.

Choose one method. Always install both companions of a dimension from the same revision.

### Project installation with skills.sh

From the root of the project where you want to use the skills:

```sh
npx skills add hellraisercenobit/skills \
  --skill transpose-design-patterns review-design-patterns transpose-modern-typescript review-modern-typescript \
  --agent codex claude-code --yes
npx skills list
```

Keep only the agent names you use. Add `--global` for a personal installation shared by projects, then verify with `npx skills list --global`. The [skills CLI](https://github.com/vercel-labs/skills#options) supports both scopes. This installs the four suite skills, without the optional named reviewer agents.

For a team, keep the project skill files, relative links and `skills-lock.json` produced by the installer under version control; verify from a fresh checkout. To pin the source, clone this repository, check out the chosen tag or commit, then use that local checkout path instead of `hellraisercenobit/skills` above. Record `npx skills --version` too. Avoid absolute links into another developer's home directory.

### Claude Code plugin

This installs all promoted skills and the `design-pattern-reviewer` and `modern-typescript-reviewer` agents:

```sh
claude plugin marketplace add hellraisercenobit/skills
claude plugin install hellraisercenobit-skills@hellraisercenobit
claude plugin list
```

Restart Claude Code afterwards. Use the installed name shown by the harness; plugin skills can have a `hellraisercenobit-skills:` prefix. Avoid installing a second copy through skills.sh for the same harness and scope.

### Local development from this repository

```sh
git clone https://github.com/hellraisercenobit/skills.git agent-skills
cd agent-skills
npm ci
npm test
npm run check:contract
npm run link-skills
```

`link-skills` links all non-deprecated skills into `~/.claude/skills` and `~/.agents/skills`, and reviewers into `~/.claude/agents`. It reflects this checkout, including uncommitted edits. **Back up same-named personal skill directories first: the script replaces them.** Existing real agent files are skipped. Use a pinned checkout when reproducibility matters.

### Verify discovery

Start a new session in your target project and ask:

```text
Without editing files, resolve transpose-design-patterns, review-design-patterns,
transpose-modern-typescript and review-modern-typescript. List their installed
paths, shared contract version and catalogs/schemas. Confirm that you can start
a fresh reviewer without inheriting this conversation.
```

Expected: four skills, accessible companion references and shared contract `1.0.0`. Missing companions or independent context must be reported. Codex supports project `.agents/skills` and user `~/.agents/skills`, including symlinks; use `/skills` or `$` to select a skill. See [OpenAI's skill documentation](https://learn.chatgpt.com/docs/build-skills).

## 2. Configure the target project

Add this policy to the existing project `AGENTS.md`, preserving its other rules. For another harness, use its project instructions; for Claude Code, ensure `CLAUDE.md` loads the policy. [Codex reads AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) when a session starts.

```markdown
## Transpose/review suite

- Identify scope/base, actual compiler/runtime targets and applicable dimensions.
  Use transpose-design-patterns for architectural forces and
  transpose-modern-typescript for TS/JS implementation choices.
- Resolve both companions and their shared contract. Record and validate decisions
  outside the repository before the first affected implementation write.
- Run project checks. Give each applicable review skill to a fresh read-only
  reviewer with no builder history. Use the shared contract's neutral brief:
  raw request, scope/base, factual constraints, record paths and check evidence.
- The reviewer freezes expectations before opening records. The builder fixes;
  a new reviewer checks. Keep reviewer reports separate from builder rationale.
- Finish only with passing checks and current SOUND in every applicable dimension.
  Changes to covered files or references expire affected verdicts. A dimension
  without an applicable site is non-applicable, with a reason.
- nuke-review, transpose-comments and review-comments are separate tools and
  cannot supply or replace a suite verdict.
```

Also document the project's actual typecheck, test, lint/build commands and runtime/browser targets. Use its existing scripts and support policy, not this repository's test compiler as an application requirement.

Choose a persistent evidence directory outside the Git checkout, with a subdirectory per task. Builder and reviewers must be able to access it, including from pipeline worktrees. Keep records, revisions, check results and reports there. A valid schema proves record shape, not decision quality. Each transpose skill supplies its validation instructions.

## 3. Run a first task

Give the builder a concrete need and public constraints:

```text
Modernize src/catalog.ts while preserving its public behavior. Use the installed
transpose-modern-typescript skill and the project's actual deployment targets.
Consider design-pattern transposition only if architectural forces apply.
Use an external evidence directory, run project checks and obtain the required
fresh independent reviews before reporting completion.
```

The suite skills support implicit invocation; a named request makes the first run easier to inspect. When a named reviewer agent is unavailable, use a fresh general subagent or separate session with the same neutral brief. Reusing the builder's conversation does not provide independence.

Expect decisions, checks, a frozen review matrix, comparison and verdict. `SOUND` means zero confirmed findings after a complete audit. `SMELLS` and `VIOLATIONS` require correction or explicit resolution; missing prerequisites leave execution incomplete. Retaining an existing implementation can be the right decision.

The [suite guide](./docs/skill-suite.md) explains composition, fingerprints and extension. The [shared contract](./contracts/suite-contract.md) owns the full protocol.

## 4. Integrate with a delivery pipeline

The suite supplies instructions, catalogs and schemas. The pipeline supplies execution, evidence access and publication controls. A generic code-review success does not establish the suite's independent verdicts.

### Connect Claude Code and Codex hooks

Installing these skills does **not** install hooks. A skill describes a procedure; a hook runs a command at an agent event. Printing `/transpose-design-patterns` from a hook does not execute that skill. The runnable setup below adds a session reminder; the project policy in step 2 still owns the workflow. See [Claude Code's hook guide](https://code.claude.com/docs/en/hooks-guide).

1. In the **target project**, create `.agent-hooks/suite-context.json` with:

   ```json
   {
     "hookSpecificOutput": {
       "hookEventName": "SessionStart",
       "additionalContext": "Follow the project's transpose/review policy. Before applicable edits, use transpose-design-patterns and/or transpose-modern-typescript and record decisions. After checks, obtain fresh read-only review-design-patterns and/or review-modern-typescript reviews. Keep their verdicts separate and current. Respect read-only reviewer roles. nuke-review and the comments skills are outside the suite."
     }
   }
   ```

2. For **Claude Code**, merge this into `.claude/settings.json`, preserving existing settings and hook arrays:

   ```json
   {
     "hooks": {
       "SessionStart": [{
         "matcher": "startup|resume|clear|compact",
         "hooks": [{
           "type": "command",
           "command": "cat \"$CLAUDE_PROJECT_DIR/.agent-hooks/suite-context.json\"",
           "timeout": 5
         }]
       }]
     }
   }
   ```

   Restart, open `/hooks`, and confirm the command is registered. It returns structured context to the model. The [hook reference](https://code.claude.com/docs/en/hooks#sessionstart) defines the event and output format.

3. For **Codex**, create or merge `.codex/hooks.json`:

   ```json
   {
     "hooks": {
       "SessionStart": [{
         "matcher": "startup|resume|clear|compact",
         "hooks": [{
           "type": "command",
           "command": "cat \"$(git rev-parse --show-toplevel)/.agent-hooks/suite-context.json\"",
           "timeout": 5
         }]
       }]
     }
   }
   ```

   Start Codex in this Git project, trust its project configuration, then inspect and trust the hook through `/hooks`. New or changed definitions require review. Use either `hooks.json` or inline hooks per config layer to avoid duplicates. Current [Codex hook documentation](https://learn.chatgpt.com/docs/hooks) covers supported versions, events and trust. `codex features list` reports local hook support.

4. Smoke-test the wiring before a real task. From the project root, run each configured command and parse its output:

   ```sh
   CLAUDE_PROJECT_DIR="$PWD" sh -c 'cat "$CLAUDE_PROJECT_DIR/.agent-hooks/suite-context.json"' | python3 -m json.tool
   sh -c 'cat "$(git rev-parse --show-toplevel)/.agent-hooks/suite-context.json"' | python3 -m json.tool
   ```

   Then start a fresh session in each harness. Ask it to report the hook context and resolve the four skills without editing. Check the hook log if context is absent. Repeat from a subdirectory and from the worktree used for delivery. Commit the three configuration files so that new worktrees receive them. These POSIX examples need `cat`, Git and a shell; adapt the command for a Windows-only environment.

The event determines what a **separately implemented verifier** could enforce:

| Event | Purpose for this suite |
| --- | --- |
| `SessionStart` | Reminder and discovery, as configured above |
| `PreToolUse` | Validate prior records before covered writes; return a supported denial to block |
| `PostToolUse` | Invalidate evidence after changes; it cannot undo the write |
| `Stop` / publication check | Verify current independent verdicts; a turn ending alone does not prove completion |

Agent hooks receive JSON on stdin and return event-specific output. `PreToolUse` supports `permissionDecision: "deny"` in `hookSpecificOutput`; a reminder supplies no permission decision. Match actual tool names: Claude edits use `Edit`/`Write`, Codex patches use `apply_patch` (also matched by `Edit`/`Write`), and shell tools match `Bash`. Shell scripts, MCP writes and external edits need coverage too. See [Claude events](https://code.claude.com/docs/en/hooks#pretooluse) and [Codex tool coverage](https://learn.chatgpt.com/docs/hooks#tool-coverage).

No verifier or automatic review launcher ships here. A real blocker needs validated records, trusted reviewer identity, scope and reference hashes, and invalidation after changes. File existence or a builder-written `SOUND` is insufficient. `ai-engineering-gate` is an optional external integration named by the design pair, **not** an alias for no-mistakes and not installed by this repository. Verify its supported dimensions before connecting it. Keep independent reviewers outside the builder's context; a generic prompt hook cannot establish that independence by itself.

### With no-mistakes

1. Install and authenticate [no-mistakes and a supported agent](https://kunchenguid.github.io/no-mistakes/start-here/installation/). Install the suite for that same agent and operating-system user; repeat discovery in its execution environment.
2. Initialize once inside the target Git repository and check setup:

   ```sh
   no-mistakes init
   no-mistakes doctor
   ```

   `init` creates a local bare gate repository, installs its `post-receive` Git hook and configures the `no-mistakes` remote. Confirm with `git remote -v`. This hook starts delivery validation when that gate receives a push; it is separate from the agent hooks above. Let no-mistakes own its generated hook. See [installation](https://kunchenguid.github.io/no-mistakes/start-here/installation/) and the installed `no-mistakes init --help`.

3. Keep the project policy and validation commands in place. Merge this guidance into the existing `.no-mistakes.yaml`:

   ```yaml
   review:
     path_instructions:
       - path: "*"
         instructions: |
           For applicable design-pattern and modern-TypeScript dimensions,
           obtain separate fresh read-only suite reviews with neutral briefs.
           Freeze expectations before records. Missing companions, contaminated
           context or unavailable independent sessions leave the suite incomplete.
           Preserve separate domain reports and the pipeline's required output.
           Do not infer suite SOUND from the generic pipeline review verdict.
   ci:
     revalidate_repairs: true
   ```

   These fields take effect from the **trusted default branch**, not only the branch under review. `*` matches basenames at any depth. Merge with existing settings and check installed-version support in the [configuration reference](https://kunchenguid.github.io/no-mistakes/reference/repo-config/#reviewpath_instructions).

4. Implement through transpose, then commit on a feature branch. Hand a **fresh driver session** the goal, scope/base, constraints, decisions/trade-offs and evidence paths. Driver context is not the neutral brief for a suite reviewer. The driver starts:

   ```sh
   no-mistakes axi
   no-mistakes axi run --intent "Describe the original task, constraints and accepted trade-offs here"
   ```

5. The driver handles active gates through `no-mistakes axi respond`; the pipeline owns fixes. A validation-step agent must not start another pipeline or push. Corrections invalidate overlapping reports and require fresh review. Inspect `no-mistakes axi status` and `no-mistakes axi logs --step review`.

The fresh driver starts the run after the branch is committed. Do not launch `axi run` from `PreToolUse`, `PostToolUse` or `Stop`: pipeline agents trigger agent events too, which can create nested runs. The session reminder preserves the reviewer's read-only role and starts no pipeline.

This is an **instruction-based integration**, not a bundled adapter or per-dimension attestation API. Verify neutral reviewer context and matching final hashes after documentation, formatting or CI repairs. The YAML does not enforce that correspondence automatically. Machine-enforced attestation requires an explicit supported gate interface or trusted verifier; an unsupported dimension leaves that workflow incomplete. This repository does not implement that adapter.

### With another pipeline or a manual workflow

Use **frame -> record -> implement -> checks -> fresh reviews -> verify final state -> publish**. Transfer complete companion bundles and external evidence to the execution environment. Run dimensions independently on the same frozen state, with separate verdicts and the [neutral brief](./contracts/suite-contract.md#neutral-brief).

The coordinator checks coverage, reference versions, source fingerprints, records and results before publication. A shared-file edit invalidates every covering review. Without an enforcement mechanism this is portable evidence, not an automatic lock. An automated verifier must reject missing, stale or non-SOUND evidence and must not trust builder-written verdicts. Keep CI deterministic; live model evaluations are separate development checks.

### Direct GitHub PR, without no-mistakes

Keep the same agent hooks and project policy. After implementation, run the target project's checks and obtain the applicable fresh independent reviews. Verify that the reviewed source and reference hashes still match after the final commit. Then publish the feature branch directly:

```sh
git push -u origin HEAD
gh pr create --base main --fill
gh pr checks --watch
```

Replace `main` with the actual PR target. Confirm the expected CI checks appear; an empty check list is not a pass. No no-mistakes initialization or remote is needed for this route. In the PR body, include scope/base, checks run, applicable dimensions, reviewer verdicts and the reviewed revision. Provide reviewer-accessible evidence links; a path under your own home directory is not accessible to other reviewers. Refresh affected reviews after any repair.

Use the repository's existing `pre-push` hook manager for fast deterministic checks if desired, and configure required CI checks on the target branch. Do not replace an existing hook or start a live LLM review from every push. Local hooks can be bypassed; the required CI checks and merge policy protect the direct-PR route. Neither passing tests nor the session reminder proves a suite verdict. If machine-enforced suite validation is required, add a trusted verifier to CI before claiming that guarantee.

## Updates and troubleshooting

### Migrate the design-pattern skill name

`transpose-design-patterns` replaces `transpose-design-pattern`. There is no alias. For an existing skills.sh installation, install the four companions with the new names using step 1, then remove the old entry in the same scope:

```sh
npx skills remove transpose-design-pattern --yes
npx skills list
```

Add `--global` to both commands for a personal install. Back up local edits before removing an installed copy. For a plugin installation, update the plugin and restart. For local development links, run `npm run link-skills`, inspect the old singular link in `~/.agents/skills` and `~/.claude/skills`, then unlink only that obsolete link; the script does not remove renamed entries.

Replace the old invocation in your project's `AGENTS.md`, `CLAUDE.md`, pipeline prompts and saved commands. Verify that discovery finds only the plural name and that the reviewer resolves its catalog and schema. Keep historical decision records unchanged; obtain fresh reviews against the renamed bundle.

### Update installed companions

Update the four companions together in the chosen scope:

```sh
npx skills update transpose-design-patterns review-design-patterns transpose-modern-typescript review-modern-typescript --project --yes
```

Use `--global` instead of `--project` for personal installs. For the plugin, run `claude plugin update hellraisercenobit-skills@hellraisercenobit`, then restart. For a local checkout, pull or select the desired revision, run `npm ci`, `npm test` and `npm run check:contract`, then relink if paths changed. Changed references expire affected reviews.

| Symptom | Check |
| --- | --- |
| Skill missing | Installation scope, selected agent and a new harness session |
| Duplicate names | Multiple installations; retain the intended revision |
| Missing companion or schema | Reinstall the complete pair from the same revision |
| Works locally, not in a gate | Agent user, sandbox permissions, worktree and evidence paths |
| no-mistakes ignores guidance | Trusted default-branch settings and matched rules in the review log |
| Code changed after SOUND | Invalidate overlapping reports and obtain fresh reviews |

## Other engineering tools - outside the suite

### Model-invoked

- **[nuke-review](./skills/engineering/nuke-review/SKILL.md)** - Strict maintainability audit. Fork of Cursor's [thermo-nuclear-code-quality-review](https://github.com/cursor/plugins/blob/main/cursor-team-kit/skills/thermo-nuclear-code-quality-review/SKILL.md) (MIT).

- **[transpose-comments](./skills/engineering/transpose-comments/SKILL.md)** - Write necessary explanations in concise Simplified Technical English.
- **[review-comments](./skills/engineering/review-comments/SKILL.md)** - Edit comments to remove narration and tighten useful explanations. This transforming review is separate from the suite's read-only review protocol.

If these tools are used in the same workflow, finish their edits before final suite reviews.

## Repository layout and releases

| Bucket | Purpose | Promoted |
| --- | --- | --- |
| [`skills/engineering/`](./skills/engineering/) | Daily code work | yes |
| [`skills/productivity/`](./skills/productivity/) | Daily non-code workflows | yes |
| [`skills/misc/`](./skills/misc/) | Rarely used | no |
| [`skills/personal/`](./skills/personal/) | Personal setup only | no |
| [`skills/in-progress/`](./skills/in-progress/) | Drafts | no |
| [`skills/deprecated/`](./skills/deprecated/) | Retired | no |

Start a skill from [the template](./skills/in-progress/_template/) and follow [AGENTS.md](./AGENTS.md). Suite membership also requires [contract qualification](./docs/skill-suite.md#maintain-and-extend). After changing the canonical contract, run `npm run sync:contract`, `npm test` and `npm run check:contract`. See [smoke validation](./tests/README.md) for the complete development evaluation.

Add a changeset for a release-worthy change. Once changes reach `main`, the [release workflow](./.github/workflows/release.yml) opens or updates the version PR; merging it advances versioning and tagging. Do not edit generated changelogs or manifest versions by hand. A feature-branch push alone does not publish a version.
