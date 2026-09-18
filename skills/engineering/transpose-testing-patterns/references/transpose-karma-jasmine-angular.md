# Karma + jasmine-core + Angular TestBed adapter 1.0.0

Read alongside the applicable catalog rules. Identity is **Karma + jasmine-core +
Angular TestBed**, not generic Jasmine and not a pinned Angular patch. Detect the
family from lockfile, karma config and Angular project signals, then map capabilities
from the **installed** profile. Neighbouring majors that still use TestBed plus Karma
stay on this adapter.

Reference profile 1 (a test target, not a supported-version list): Angular 10.2.5,
Karma 6.3.4, jasmine-core 3.5, TypeScript 4.0.5, with
`strict` / `noImplicitAny` / `strictNullChecks` / `noImplicitThis` off, ChromeHeadless
when that launcher is configured, and optional drifted-spec quarantine when the project
already has one. Record the derived compiler target, majors, browser and unavailable
families before opening records. An unknown major that still looks like this family is
incomplete execution or a conservative mapping with named unknowns, never a Vitest
fallback.

## Detect and route

Require Karma, jasmine-core, `@angular/core`, a karma config and an Angular project.
Plain jasmine-core without TestBed/Karma does not route here. Vitest lockfiles route to
the Vitest adapter. Missing required signals are unknown or `complete: false`, never
Vitest.

Inspect lockfile versions, `karma.conf`, `test.ts` / `include` discovery, tsconfig
target and strictness, browserslist / `customLaunchers`, and npm scripts. Compiler and
runtime layers come from the project's tsconfig and installed TypeScript, not a
hardcoded 4.0.5 / ES2015 line.

## Capability table

Predicates follow the detected profile. Do not copy a recipe that the installed
stack cannot honor.

| Catalog families | Profile predicates |
| --- | --- |
| TP-01/02/15 | `describe` / `it` or the installed Jasmine/Angular equivalents. No Vitest `test.for`. |
| TP-06 | Snapshots unavailable unless the profile already has a snapshot tool. |
| TP-03/04/08 | `jasmine.createSpy` / `spyOn` / `spyOnProperty`. Untyped `jasmine.createSpy` when types or strictness cannot honor generics; typed spies only when the compiler profile supports them. `vi.fn` is forbidden. |
| TP-05 | Property testing unavailable unless already in the lockfile. |
| TP-07/16 | The project's actual Karma/Angular command (`ng test`, `npm run test-headless`, or equivalent). Pass `NODE_OPTIONS=--openssl-legacy-provider` only when that app's Node/webpack already needs it. Discovery: `require.context` when `test.ts` uses it, otherwise the project's Karma files pattern. When a quarantine or skip list is present (`DRIFTED_SPECS`, `*.spec.ts.drifted`, or the project's equivalent), a green total that excludes those specs is not coverage. |
| TP-09 | Existing TestBed modules and spec factories. No Vitest `test.extend`. |
| TP-11 | TestBed resource ownership when tests use TestBed. |
| TP-12 | Unavailable while `strict`, `noImplicitAny`, `strictNullChecks` and `noImplicitThis` are off; do not turn them on to make a type test pass. `satisfies` / `expectTypeOf` only when the compiler profile allows them. |
| TP-13 | Angular async clock APIs present in the installed `@angular/core/testing` (`fakeAsync` / `tick` / `flush` / `waitForAsync` on the reference profile). Do not mix with `jasmine.clock()`. Mixing two clocks is a finding. If a later profile replaces that clock, map the installed clock, still without mixing. |
| TP-14 | Detected browser launcher (often ChromeHeadless). jsdom, happy-dom and Vitest Browser Mode are the wrong guarantee when Karma launches a real Chrome. |

## Doubles, types and TestBed

Keep doubles on the installed jasmine-core API. Do not invent Vitest spies to satisfy
TP-03. When the reference profile's TypeScript strictness is off, untyped spies are the
honest mapping; enabling strict flags to unlock TP-12 is out of scope.

Arrange through existing TestBed modules or spec factories. TestBed owns component,
module and HTTP testing resources that the spec creates; reset or close them according
to the installed TestBed API, including failure paths.

## Async clock and execution

Use one clock. On the reference profile that is Angular `fakeAsync` / `tick` / `flush` /
`waitForAsync`. `jasmine.clock()` in the same spec is a mixing finding. Await
`waitForAsync` work; a swallowed rejection is a false green.

Run the detected non-interactive command. If CI cannot launch ChromeHeadless, stay on
this adapter as `implemented` and record the skip; do not substitute Vitest. Map
required scenario IDs to executed identities and disclose skipped, quarantined and
retried specs. A suite that hides drifted specs behind a green total has not proven
TP-16.

Sources: [Karma](https://karma-runner.github.io/),
[jasmine](https://jasmine.github.io/),
[Angular testing](https://angular.dev/guide/testing).
