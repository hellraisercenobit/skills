# @hellraisercenobit/ai-engineering-gate

## 0.9.1

### Patch Changes

- [#46](https://github.com/hellraisercenobit/skills/pull/46) [`44b54ce`](https://github.com/hellraisercenobit/skills/commit/44b54ce1e94cafecdd7cdcab0cfba75f9d6010fa) Thanks [@hellraisercenobit](https://github.com/hellraisercenobit)! - The `agent-instruction-doctor` guardrail arms in well under a second outside a repository: discovery stops two levels down there, reads only the instruction folders of `.codex`, follows linked skills, fingerprints each real file once, leaves out the skills Claude Code syncs, and is cut at its timeout. Its checks hold tighter: an edit may only remove and add the lines its selected patch holds, the selection question shows the manifest patches it will enforce, a source changed through Bash is reported on that call, the discovery counts only when it printed its manifest, a note typed next to the selected options never selects anything, the manifest is revised with Write only, and each status must follow its id.

- [#48](https://github.com/hellraisercenobit/skills/pull/48) [`132b1e4`](https://github.com/hellraisercenobit/skills/commit/132b1e4d519eeffa63a218a5efe00a1042ee02f0) Thanks [@hellraisercenobit](https://github.com/hellraisercenobit)! - `agent-instruction-doctor` audits now end: hypotheses are the read list, the always-loaded sources and the skill frontmatters are the inventory, and writing the candidates manifest closes the search. The discovery manifest lists one row per skill and leaves the files inside skill folders out with their count, so a machine with hundreds of skills hands the agent an index it can hold. The guardrail releases a turn it blocked twice in one phase whatever ran in between; a discovery re-run or a rewritten manifest no longer resets that counter.

## 0.9.0

### Minor Changes

- [#41](https://github.com/hellraisercenobit/skills/pull/41) [`4c66ba3`](https://github.com/hellraisercenobit/skills/commit/4c66ba3807d5deef118c6a2fd332d12352caa652) Thanks [@hellraisercenobit](https://github.com/hellraisercenobit)! - `agent-instruction-doctor` ships a hook guardrail on Claude Code (`hooks/guardrail.mjs`): writes are denied until you select candidate ids, the turn cannot end before the discovery ran and the candidates manifest is written, an edit is allowed only on a selected file re-read and unchanged since, a stale candidate is refused, and the final message must report a status per selected repair. Evidence is an append-only ledger of content hashes; the guardrail is fail-visible and never blocks on its own errors.

## 0.8.0

### Minor Changes

- [#32](https://github.com/hellraisercenobit/skills/pull/32) [`24ac388`](https://github.com/hellraisercenobit/skills/commit/24ac3882bf462dcfa78c277b59c430ae85bb391d) Thanks [@hellraisercenobit](https://github.com/hellraisercenobit)! - `agent-instruction-doctor` lists repair candidates (`F01`, `F02`...) and applies only the ones you select, then reports each as applied, stale, failed or needs-runtime-verification. It is now user-invoked only: type `/agent-instruction-doctor`.

## 0.7.0

### Minor Changes

- [#28](https://github.com/hellraisercenobit/skills/pull/28) [`fcc7993`](https://github.com/hellraisercenobit/skills/commit/fcc79936b035577b9ccb0a8e3f2339222143485c) Thanks [@hellraisercenobit](https://github.com/hellraisercenobit)! - Add `agent-instruction-doctor`: diagnose ignored, conflicting or unreachable agent instructions, skills, hooks and settings, then propose the smallest patch. Remove `nuke-review`, `transpose-comments` and `review-comments` from the plugin; uninstall them if you installed them with `npx skills`.

- [#25](https://github.com/hellraisercenobit/skills/pull/25) [`7773743`](https://github.com/hellraisercenobit/skills/commit/7773743505d79013fd247241383d47c6000a3f98) Thanks [@hellraisercenobit](https://github.com/hellraisercenobit)! - Add an adaptive Codeception testing-pattern adapter selected from the lockfile, without pinning identity to 5.0.0.

- [#23](https://github.com/hellraisercenobit/skills/pull/23) [`053b3c9`](https://github.com/hellraisercenobit/skills/commit/053b3c9dc1c8010be93337d34ec8f376a495e866) Thanks [@hellraisercenobit](https://github.com/hellraisercenobit)! - Add an adaptive Karma + jasmine-core + Angular TestBed testing adapter. Routing follows the family, not a pinned 10.2.5 stack; reference profiles stay test targets.

### Patch Changes

- [#24](https://github.com/hellraisercenobit/skills/pull/24) [`459e8a2`](https://github.com/hellraisercenobit/skills/commit/459e8a235201292a284dd56864c1a3d8a9ce670e) Thanks [@hellraisercenobit](https://github.com/hellraisercenobit)! - The testing reviewer recales compiler and runtime profile independently. TypeScript tests must name the ES target in declaration constraints; a missing layer is incomplete execution, not SOUND.

## 0.6.0

### Minor Changes

- [#16](https://github.com/hellraisercenobit/skills/pull/16) [`04d9b13`](https://github.com/hellraisercenobit/skills/commit/04d9b13717361174b3c0356022f099ef6cb0294d) Thanks [@hellraisercenobit](https://github.com/hellraisercenobit)! - Ship the engineering suite gate: a registry, per-task evidence, three fingerprints, and the commands that enforce them. The plugin installs the hooks; the npm package is a byte-identical distribution root.

### Patch Changes

- [#19](https://github.com/hellraisercenobit/skills/pull/19) [`305fe32`](https://github.com/hellraisercenobit/skills/commit/305fe32171beb0f292456f21005fe80f93261666) Thanks [@hellraisercenobit](https://github.com/hellraisercenobit)! - Stop injects compact status into the builder conversation. Dispatch briefs stay behind an explicit `--full`. Compact `next:` names the registered reviewer.
