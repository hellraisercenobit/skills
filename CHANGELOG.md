# Changelog

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

## 0.5.0

### Minor Changes

- [#13](https://github.com/hellraisercenobit/skills/pull/13) [`84dbde6`](https://github.com/hellraisercenobit/skills/commit/84dbde6b811b6a2ff599ec41da0869b8e91c817b) Thanks [@hellraisercenobit](https://github.com/hellraisercenobit)! - Add transpose-testing-patterns and review-testing-patterns as the third suite dimension, with a runner-neutral testing catalog, a Vitest adapter, TypeScript and TDD evidence guidance, an independent reviewer and executable qualification fixtures. Extend installation, strategy and delivery documentation for the six companions.

## 0.4.2

### Patch Changes

- [#10](https://github.com/hellraisercenobit/skills/pull/10) [`6323ffa`](https://github.com/hellraisercenobit/skills/commit/6323ffae954a7a5578d4c969d367c70266774db7) Thanks [@hellraisercenobit](https://github.com/hellraisercenobit)! - Make the README the suite's entry point with its decision and independent-review workflow,
  a Mermaid diagram, the value beyond project rules, scaling through qualified dimensions,
  and explicit enforcement limits. Focus the suite guide on maintenance and extension.

## 0.4.1

### Patch Changes

- [#8](https://github.com/hellraisercenobit/skills/pull/8) [`725797b`](https://github.com/hellraisercenobit/skills/commit/725797beac153074bfae5ae4135f25c54047bfa8) Thanks [@hellraisercenobit](https://github.com/hellraisercenobit)! - Generalize the design catalog's derived-value and replacement-set wording, and remove
  project-specific terminology from the PHP guide. Preserve the reviewed exceptions for
  materialized values, intentional negative caching, distinct contexts and explicit cache resets.

## 0.4.0

### Minor Changes

- [#6](https://github.com/hellraisercenobit/skills/pull/6) [`7131488`](https://github.com/hellraisercenobit/skills/commit/71314887a0a285b95e33150295e6eb76a2a34295) Thanks [@hellraisercenobit](https://github.com/hellraisercenobit)! - Rename `transpose-design-pattern` to `transpose-design-patterns` to align the design-pattern pair.
  Update the plugin, companion references, schema URL, suite manifest, agent, documentation and
  installation commands. Existing installations must install the plural name, remove the old entry
  and update project or pipeline instructions; there is no compatibility alias.
  
  Allow model invocation of the separate `nuke-review` tool in both Claude Code and Codex, with
  matching discovery metadata and documentation. It remains outside the transpose/review suite.
  
  Extend the PHP/Symfony guide and reviewer with unit-of-work cache lifetimes, authorized scoped
  reads, legacy service substitution, docblock integrity and independent test expectations. Add
  catalog rules for derived-value ownership and shared replacement-set builders, with explicit
  exceptions for materialization, intentional negative caching and distinct contexts.
  
  Document reproducible Claude Code and Codex hook wiring, its verification and limits, plus
  the no-mistakes Git hook and a direct GitHub PR workflow without no-mistakes.

## 0.3.0

### Minor Changes

- [#4](https://github.com/hellraisercenobit/skills/pull/4) [`dba0413`](https://github.com/hellraisercenobit/skills/commit/dba0413d36b5b30331e96b9a742d7434809ba219) Thanks [@hellraisercenobit](https://github.com/hellraisercenobit)! - Make the design-pattern pair an enforced pipeline. `transpose-design-pattern` now detects the eight structural forces, runs the extension-cost test, decides a pattern or an explicit `none`, records a JSON design decision record before the first implementation write (piped to `ai-engineering-gate` when that command exists), and hands the code to a fresh blind reviewer with a fixed brief. `review-design-patterns` freezes its expected design before opening the record, compares expected / recorded / actual, defines `SOUND` / `SMELLS` / `VIOLATIONS`, reports catalog gaps apart, attests only `SOUND`, and never modifies code. The catalog gains a _Structural forces_ table with a two-question extension-cost test and a Strategy-or-Registry tie-breaker, an _Invariants_ line per pattern and a `None` entry; the record's shape ships as `references/design-decision-record.schema.json`; the smell signatures gain a `None` section and a Vanilla TS line. A read-only `design-pattern-reviewer` subagent ships with the plugin and is linked by `npm run link-skills`.

- [#4](https://github.com/hellraisercenobit/skills/pull/4) [`a611b0e`](https://github.com/hellraisercenobit/skills/commit/a611b0e19b005306d09729da557c878c47ff77c2) Thanks [@hellraisercenobit](https://github.com/hellraisercenobit)! - Add modern TypeScript transpose/review companions covering language idioms, types, collections,
  resource lifetime and native platform APIs with independent validation.
  
  Document the shared transpose/review contract, generate portable contract bundles and add
  small behavioral, type, schema and distribution smoke checks. Add reproducible installation,
  project setup and delivery-pipeline recipes. Keep nuke-review and the comments pair outside
  the suite, with their existing behavior unchanged.

- [#4](https://github.com/hellraisercenobit/skills/pull/4) [`5c77bf7`](https://github.com/hellraisercenobit/skills/commit/5c77bf77f731e13988e470d7af00653edc2057b1) Thanks [@hellraisercenobit](https://github.com/hellraisercenobit)! - Add a PHP 8.2 / Symfony 6.4 transposition guide to `transpose-design-pattern` (tagged-service Strategy and Registry, `factory:` and `#[When]` + `#[AsAlias]` Factory, command + invokable handler Command, `readonly` DTO Adapter, decorator / event Composition, shared-nothing Singleton with `ResetInterface`, cross-cutting PHP 8.2 practice, Decision Matrix and anti-patterns), make the catalog's typing and validation principles language-neutral, and teach `review-design-patterns` the PHP smell signatures and recon tooling.

## 0.2.0

### Minor Changes

- [#1](https://github.com/hellraisercenobit/skills/pull/1) [`3dfd362`](https://github.com/hellraisercenobit/skills/commit/3dfd3622e38027c8da045ef959d7166266fd47a1) Thanks [@hellraisercenobit](https://github.com/hellraisercenobit)! - Add `nuke-review`, a user-invoked fork of Cursor's `thermo-nuclear-code-quality-review` skill (cursor-team-kit, MIT, Copyright (c) 2026 Cursor): Cursor's standards, threshold, finding order and approval bar, restructured for agents with the writing-for-agents levers (four-step procedure with completion criteria, one signal/remedy table, positive wording). Provenance recorded in the skill LICENSE, the docs page and the root NOTICE.

## 0.1.1

### Patch Changes

- [`f7b5199`](https://github.com/hellraisercenobit/skills/commit/f7b519965616b6c8aeef7aa3018d0ba46d20089b) Thanks [@hellraisercenobit](https://github.com/hellraisercenobit)! - Quote the `review-comments` description so strict YAML parsers (skills.sh) discover the skill, and rename the skill template to `SKILL.template.md` so installers no longer list it as `example-skill`.

## 0.1.0

### Minor Changes

- [`cf4bf62`](https://github.com/hellraisercenobit/skills/commit/cf4bf6297207df818b121b13827155acfdc2aa2b) Thanks [@hellraisercenobit](https://github.com/hellraisercenobit)! - Add authored skills `transpose-comments` and `review-comments` (MIT, Guillaume Mongin / @hellraisercenobit): shared comment rules in Simplified Technical English (ASD-STE100), applied at write time and audited in review.

- [`cf4bf62`](https://github.com/hellraisercenobit/skills/commit/cf4bf6297207df818b121b13827155acfdc2aa2b) Thanks [@hellraisercenobit](https://github.com/hellraisercenobit)! - Add authored skills `transpose-design-pattern` and `review-design-patterns` (MIT, Guillaume Mongin / @hellraisercenobit) with ownership NOTICE and per-skill LICENSE.

- [`cf4bf62`](https://github.com/hellraisercenobit/skills/commit/cf4bf6297207df818b121b13827155acfdc2aa2b) Thanks [@hellraisercenobit](https://github.com/hellraisercenobit)! - Initial scaffolding: skill buckets and template, changesets versioning with version sync into the plugin manifests, Claude Code plugin and marketplace, skills.sh compatible layout, local link scripts.
