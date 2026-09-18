# Testing-patterns qualification

These fixtures qualify decisions and evidence, not an application framework. Runner
families are adaptive. Vitest fixtures below pin two reference profiles (Vitest 5 and
Vitest 4). Karma + jasmine-core + Angular TestBed is a separate family. Its routing pin
lives in `tests/testing-patterns/karma-jasmine-angular/` (package.json versions + karma
config). That pin is not a live `ng test` app; ChromeHeadless remains optional. Routing
probes also live in `tests/testing-adapter-route.test.mjs`. Playwright is only Vitest's provider for the
real-browser fixture; users of the skills do not need to install it. Node handles
pure/domain and infrastructure cases. Vitest also supports happy-dom for DOM simulation
when that fidelity is sufficient. Simulation does not establish a native browser
guarantee.

## Reproduce deterministic checks

From the repository root, with Node 24:

```sh
npm ci
npm ci --prefix tests/testing-patterns/project
npm ci --prefix tests/testing-patterns/compat
npm test
npm run check:contract
npm run test:testing-patterns
cd tests/testing-patterns/project
npx --no-install playwright install chromium
cd ../../..
npm run test:testing-browser
```

On Linux CI, use `playwright install --with-deps chromium`. The lockfiles pin the primary
profile to Vitest 5.0.1, TypeScript 7.0.2, Vite 8.3.0, fast-check 4.10.1 and Playwright
1.63.0. The conservation profile uses Vitest 4.1.11, TypeScript 6.0.3 and Vite 7.3.6.
Both compile their tests. These versions are qualification targets, not consumer requirements.
Routing probes for the Karma + jasmine-core + Angular TestBed family live in
`tests/testing-adapter-route.test.mjs`: Angular 10.2.5 and a neighbouring id must select
the same adapter; Vitest and jasmine without Angular must not.

For raw evidence, use Vitest's JSON reporter and a directory outside the checkout:

```sh
npm --prefix tests/testing-patterns/project test -- --reporter=json --outputFile=/tmp/testing-runtime.json
TESTING_EVIDENCE_DIR=/tmp/testing-probes node --test tests/testing-patterns/probes.test.mjs
```

The second command creates a unique run directory and preserves each executed phase's
source state, command, result and tool output before the next mutation. The harness
rejects import/setup failures as behavioral mutant detection. Baseline runs have no
skips, todos, expected failures or retries. The cleanup probe intentionally runs a failing
case in a child runner and checks the next case; its failure is an experiment outcome,
not passing product coverage. No coverage threshold is configured for this skills repository.
Consumers must honor their own configured thresholds.
CI sets the evidence directory and uploads these snapshots even when a check fails;
compiler failures also include the child diagnostics in the failing assertion.

## Scenario map

| Guarantee | Executed seam | Discriminating probe |
| --- | --- | --- |
| Direct examples | `domain.test.ts`, three threshold cases | Strict/inclusive threshold change fails; helper extraction passes |
| Public state transitions | `state.test.ts` | Cancellation after submission fails without guard |
| Sociable policy and interaction | `orchestration.test.ts` | Real shipping calculation, typed output spy; omission and duplicate send fail |
| Fake/real contract | `storage.test.ts` | Same contract on memory and real temporary files; replacement mutation fails |
| TypeScript consumer contract | `consumer-types.ts` plus all runtime test source | Widening literal inference keeps runtime green but fails checker; negative calls yield intended diagnostics |
| Unknown boundary | `contracts.test.ts` | Cast replacing validation fails at runtime |
| Error oracle | `errors.test.ts` on both profiles | Wrong class/same message, no rejection and accidental error are refused; action runs once |
| Vitest API lifecycle | `lifecycle.test.ts` on both profiles | Clear/reset/restore semantics and named fixture cleanup; failed-body child probe detects omitted cleanup |
| Time and scheduling | `async.test.ts` | Controlled clock, cancellation, deadline and pre-aborted input |
| Actual overlap | `async.test.ts` | Held first effect plus second request; removing serialization fails peak-active assertion |
| Partial consumption | `iteration.test.ts` | Eager production and missing close fail; consumer error still closes |
| Properties | `properties.test.ts` | Duplicate mutant shrinks and replays with seed/path |
| Characterization | `legacy.test.ts` | Real reference passes before refactor; equivalent rewrite passes; changed default fails |
| Failure cleanup | Child runners in `probes.test.mjs` | Timer hook and actual file fixture clean after a thrown test; removing teardown is detected |
| Browser APIs | `native.browser.test.ts` in Chromium | Native events, disposal on normal/failure path, pre-aborted native fetch |
| Record/distribution | Root schema/distribution tests | Closed schema rejects unknown IDs/versions, incomplete choices and extra fields; copied companions resolve |

Fixtures intentionally retain direct literals, a typed `vi.fn`, a resource fixture and a
useful hook. Counts/order are asserted where they are the public contract. Builder/object
mother, mock-heavy isolation and extra ports are decisions to consider, not quotas to satisfy.
File persistence is exercised for real; the fixture does not claim database transaction,
cross-process concurrency or remote-provider fidelity. Browser qualification covers Chromium,
not all engines, rendering/layout or a complete end-to-end application.

## Evaluate the skills themselves

Keep live model evaluation outside CI and outside the repository. Give a fresh builder the
installed transpose skill and a raw behavior request, with only the minimum source/config
artifacts. Do not give it the qualification probes or an expected implementation/verdict.
Keep schema-valid decisions before writes, actual RED/GREEN outputs, unchanged oracle
hashes and inspectable snapshots. Run runtime and compilation separately. Give the fresh
reviewer the shared neutral brief, never the builder's history or evaluation oracle.

Use a small first scenario, then a domain different from the illustrative record. For
example, a lease can be renewed while active and cannot be renewed after cancellation;
choose whether state tests, a clock or a builder help from the raw contract. Do not supply
those choices in the evaluator brief. Probe a plausible defect and a legitimate refactor
against the generated tests in a separate harness copy.

For adversarial evaluation, provide a valid reassuring record beside tests that miss a
required guarantee. Observe the matrix before record reads, steelman, confirmed finding,
builder correction and new fresh review. Preserve all reports. Test false TDD claims
with setup-only failures, changed oracles and unavailable historical states; absence of
history must not become a product defect in a standalone audit.

For prerequisites, isolate installed bundles: reviewer alone, required guide absent,
and incompatible contract version. Each must report incompleteness without inventing
rules or an attestable verdict. A compatible old runner is a separate retention case.

For composition, record applicable design/testing/modern-typescript decisions separately,
obtain fresh reports on one frozen state and maintain an external scope/reference index.
Change a shared source, record or reference in a harness copy and reject reuse of affected
reports. Without exact scope tracking all change reports expire. Re-review a corrected
frozen state independently. This verifies a protocol, not an automatic enforcement engine.

## Evidence limits

CI checks schema/distribution and executable fixtures; it does not certify model behavior
or prove universal test quality. Development transcripts and snapshots remain external.
Observed TDD applies only to cycles actually recorded; recipe checks and characterization
are not retroactively labelled TDD. No timestamps, final source or green badge can replace
missing process evidence. Report model/tool versions, examined hashes and remaining limits
with each live evaluation rather than treating one run as permanent certification.
