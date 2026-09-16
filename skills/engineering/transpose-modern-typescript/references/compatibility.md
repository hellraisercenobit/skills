# Compatibility and modules

## MT-22 - Match emitted modules to their consumers

**Intent/use:** import type for type-only dependencies where appropriate; explicit ESM/CJS
and module resolution choices aligned with package consumers. Consider import defer only
where compiler, emit, bundler and executing loader actually support its semantics.
**Alternatives/trade-offs:** preserve deliberate side-effect imports, existing loaders or
library distribution contracts. A compiler preset such as node20 describes specific module
behavior, not a promise that any deployed Node supports every new API.
**Avoid:** deleting runtime side effects by converting an import blindly, choosing a new
TS option independently of the build chain, importing browser globals into server startup.
**Invariants:** emitted entry points load on actual consumers; required effects still run;
type-only boundaries and package exports are correct.
**Sources/support:** [TS modules](https://www.typescriptlang.org/docs/handbook/modules/reference.html),
[TS config](https://www.typescriptlang.org/tsconfig/),
[import defer](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html).
Check current stable compiler documentation when adopting a newer feature.

## MT-23 - Prove support across the deployment path

**Intent/use:** every proposed idiom/API needs a project-specific support decision.
Separate four layers: (1) parser/compiler syntax, (2) lib/type declarations, (3) emitted
code and bundler/transforms, (4) actual runtime/platform. Passing tsc proves neither (3)
nor (4). target/lib changes do not install runtime implementations.
**Alternatives/trade-offs:** retain compatible code, use an existing library, or propose an
explicitly costed polyfill/fallback when the user scope supports it. Do not silently raise
targets or add polyfills.
**Avoid:** a fixed TS minimum for all projects, a preview recommended as stable, npm version
treated as market share, or browser support used as Node/Bun/Deno evidence.
**Invariants:** identify exact supported targets and dated evidence for the feature; verify
all required contexts (browser/worker/server/SSR), platform prerequisites and fallback paths.
Unknown required targets remain an unresolved prerequisite for dependent adoption.

## Build the profile

Read the project lockfile and compiler command/version, tsconfig inheritance and relevant
strictness, target/lib/module/moduleResolution, package engines/type/exports, bundler,
Browserslist or equivalent product target policy, CI and deployment runtimes. Record
unknowns explicitly. In a library, inspect consumer support, not just the maintainer machine.

Sources of evidence: project files, runtime feature probes, official runtime release/API
docs, TypeScript release/config docs, and MDN compatibility data for the exact feature.
Record source, checked date, claim and targets covered. A single local browser probe only
proves that browser/version, not the whole supported fleet.

Baseline distinguishes newly available from widely available (30 months after interoperability
in its browser set). A page saying a capability has existed across browsers since March
2024 does not mean it was already Baseline widely available in March 2024. Object.groupBy
and Promise.withResolvers are useful examples to re-check, not permanent universal support
assertions. Baseline is not a substitute for actual product targets.

Use stable modern features supported by the project. This repository's smoke compiler is
locked for reproducibility and is not a language baseline imposed by the skills. Recheck
stable releases and their actual toolchain support when upgrading the fixture dependency.

**Sources:** [Baseline definition](https://web.dev/baseline),
[MDN compatibility data](https://github.com/mdn/browser-compat-data),
[TypeScript releases](https://www.typescriptlang.org/docs/handbook/release-notes/overview.html),
[Node API documentation](https://nodejs.org/api/), [Bun](https://bun.sh/docs),
[Deno](https://docs.deno.com/runtime/).
