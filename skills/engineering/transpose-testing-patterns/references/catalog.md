# Testing catalog 1.0.0

Normative source for this dimension. Read the inventory first, then the relevant rules.
The adapter chooses runner APIs; it cannot weaken these guarantees. Sources inform the
rules, not a second protocol. Examples from the user's TDD craftsmanship report are
contextual observations, not universal style requirements.

## Inventory and routing

Record applicability, sites and reason for each axis: `behavior` (TP-01-06), `process`
(TP-07), `doubles` (TP-08), `data` (TP-09), `isolation` (TP-10), `testability` (TP-11),
`types` (TP-12), `async-lifetime` (TP-13), `environment` (TP-14), `oracle` (TP-15),
`execution` (TP-16). Absence of a test for an applicable risk is not non-applicability.

Choose family, level, double and arrangement independently. A contract test can execute
real infrastructure; a spy need not use a mock framework. `none` means no specialized
pattern or extra tool helps. Direct tests can still be added under `none`. `retain` describes an action and can
retain a named pattern. Both require comparison with alternatives and explicit limits.

## TP-01 - Direct behavior

- **Intent/use:** pure calculation, transformation or parsing needs an input/output oracle.
- **Compare/trade-off:** direct examples are easy to diagnose; tables reduce repeated setup;
  properties widen an input space at generator/debugging cost. Start with a discriminating example.
- **Avoid/invariant:** do not calculate the expected answer with the SUT's algorithm. Observe
  boundary values and invalid input when contracted, without inventing a builder or port.
- **Defense:** a named domain helper can improve understanding; a literal is not mandatory
  when an independent specification supplies the oracle.
- **Sources:** [Test Desiderata](https://kentbeck.github.io/TestDesiderata/), [properties](https://fast-check.dev/docs/introduction/).

## TP-02 - State and sequences

- **Intent/use:** aggregates, events and state machines depend on history and legal transitions.
- **Compare/trade-off:** public operations and observations resist representation changes;
  model-based sequences explore more histories at greater model complexity.
- **Avoid/invariant:** no private-state seeding or test-only getter to bypass invariants.
  Verify legal and rejected transitions, including that rejection preserves promised state.
- **Defense:** a public read model is a legitimate observable contract; fields are not
  automatically private merely because the tests read them.
- **Sources:** [model-based testing](https://fast-check.dev/docs/advanced/model-based-testing/).

## TP-03 - Contractual interactions

- **Intent/use:** orchestration has an externally meaningful effect or protocol.
- **Compare/trade-off:** observe resulting state when sufficient; record boundary messages
  for content/absence/order/cardinality contracts. Isolate only the costly or controlled boundary.
- **Avoid/invariant:** a called-method assertion alone does not prove business policy.
  Detect omitted, wrong or duplicate outputs required by the contract.
- **Defense:** order/count assertions are valid for idempotence, retry and protocols;
  they are coupling only when they prescribe an interchangeable internal traversal.
- **Sources:** [Mocks Aren't Stubs](https://martinfowler.com/articles/mocksArentStubs.html).

## TP-04 - Substitutable boundaries

- **Intent/use:** claim a fake represents an actual adapter for a relevant port contract.
- **Compare/trade-off:** run applicable shared scenarios against fake and real isolated
  adapter; real checks cost setup but expose fake drift. A stub may suffice without a fidelity claim.
- **Avoid/invariant:** two fakes do not prove a production adapter. Verify key, missing-value,
  replacement and failure semantics as applicable; name transaction/concurrency/provider limits.
- **Defense:** no contract suite is required for an imaginary implementation; scope the
  equivalence claim to the exercised behavior, not complete infrastructure fidelity.
- **Sources:** [Contract Test](https://martinfowler.com/bliki/ContractTest.html).

## TP-05 - Properties and models

- **Intent/use:** meaningful invariants span many inputs or operation histories.
- **Compare/trade-off:** examples remain best for an obvious boundary; generated cases
  explore combinations but need useful generators, shrinking and reproducible failures.
- **Avoid/invariant:** do not copy the implementation into the model or assert a tautology.
  Keep seed, replay path and reduced counterexample; the model must be simpler and independent.
- **Defense:** metamorphic/round-trip properties can be useful, but shared defects can pass
  both directions; supplement with an independent known case where that risk matters.
- **Sources:** [fast-check](https://fast-check.dev/docs/introduction/), [models](https://fast-check.dev/docs/advanced/model-based-testing/).

## TP-06 - Characterization

- **Intent/use:** preserve legacy behavior before changing its design.
- **Compare/trade-off:** direct examples clarify semantics; a reviewed, bounded snapshot can
  protect a stable format. Characterization records observations, not endorsement of bugs.
- **Avoid/invariant:** run against the real reference before refactoring. A bug correction
  needs its own changed expectation and cycle, not an equivalence claim.
- **Defense:** unavailable history limits process evidence, not the value of a present
  audit. Large unread snapshots or output captured only after the rewrite are weak evidence.
- **Sources:** [Test Desiderata](https://kentbeck.github.io/TestDesiderata/).

## TP-07 - Observed TDD

- **Intent/use:** a change explicitly claims tests guided implementation.
- **Compare/trade-off:** [TDD](tdd.md) gives behavioral/static RED, frozen oracle, GREEN and
  pressure-led refactor. Existing coverage and audit modes avoid fabricated history.
- **Avoid/invariant:** setup/import failures are not behavioral RED; weakening a test restarts
  the cycle. Preserve raw tool output and reinspectable states, not just timestamps/hashes.
- **Defense:** minimal skeletons can reach an assertion; natural generalization is allowed.
  No empty reflection commit, per-RED commit or fixed step size is required.
- **Sources:** [TDD](https://martinfowler.com/bliki/TestDrivenDevelopment.html).

## TP-08 - Double role

- **Intent/use:** a collaborator needs controlled input, observable effects or realistic state.
- **Compare/trade-off:** compare real/no double, stub, spy, fake and mock by role and fidelity;
  [doubles/data](doubles-data.md) gives the decision tree. `vi.fn` is not inherently a strict mock.
- **Avoid/invariant:** do not replace the business rule under test with its expected answer.
  Keep structural types honest; a fake's policy needs its own product owner and evidence.
- **Defense:** typed framework functions and handwritten objects can both be simplest.
  Classes, files, mutable spy flags and naming prefixes are not requirements.
- **Sources:** [Test Double](https://martinfowler.com/bliki/TestDouble.html), [Vitest mocks](https://vitest.dev/guide/mocking).

## TP-09 - Arrangement

- **Intent/use:** scenario setup obscures meaning or repeated resource lifetime needs ownership.
- **Compare/trade-off:** inline values, fresh factory, fixture, object mother and builder have
  different costs. Use a builder for meaningful construction/history, not a parameter-count rule.
- **Avoid/invariant:** decisive inputs stay visible; valid setup uses legitimate APIs; mutable
  data is fresh and resource scope/cleanup explicit. Do not hide clock controls a scenario needs.
- **Defense:** small duplication can be clearer; complex helper tests can be legitimate but
  are not evidence of the product behavior. Hooks are not forbidden.
- **Sources:** [Test Context](https://vitest.dev/guide/test-context), [Object Mother](https://martinfowler.com/bliki/ObjectMother.html).

## TP-10 - Isolation and sociability

- **Intent/use:** decide what real collaboration the chosen observation needs.
- **Compare/trade-off:** cheap deterministic domain collaborators usually work well together;
  isolation helps expensive boundaries, combinatorics or diagnosis but loses integration signal.
- **Avoid/invariant:** do not mock every object by default or demand all-real dependencies.
  Name which policy the test really exercises and what integration risk remains.
- **Defense:** a narrow isolated test can be the correct fast diagnostic when an integration
  check protects the boundary. Neither school wins by naming convention.
- **Sources:** [Unit Test](https://martinfowler.com/bliki/UnitTest.html).

## TP-11 - Testability seam

- **Intent/use:** nondeterminism or entangled responsibilities prevent a useful observation.
- **Compare/trade-off:** use the highest existing seam with a precise signal; functional
  core/imperative shell, ports and hexagonal testing can separate policy from effects.
- **Avoid/invariant:** testing identifies observation/control needs; design owns structural
  response. Do not expose private internals or build a port solely to assert a traversal.
- **Defense:** extracting a real unstable boundary is legitimate even when first discovered
  through a test; no full hexagonal architecture or new catalog pattern is mandatory.
- **Sources:** [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/).

## TP-12 - TypeScript guarantees

- **Intent/use:** callers depend on static contracts or untrusted values cross runtime boundaries.
- **Compare/trade-off:** [TypeScript](typescript.md) separates runtime, compilation and
  consumer type assertions. Test significant inference/forbidden uses, not every declaration.
- **Avoid/invariant:** runner green does not mean typecheck green. Negative types must fail
  for the intended diagnostic. Brands/readonly are not runtime validation/immutability.
- **Defense:** a justified assertion at a validated boundary can be correct; casts that hide
  an invalid double or missing validator cannot prove the contract.
- **Sources:** [Testing Types](https://vitest.dev/guide/testing-types), [TS handbook](https://www.typescriptlang.org/docs/handbook/2/narrowing.html).

## TP-13 - Async, time and lifetime

- **Intent/use:** results depend on time, random inputs, scheduling, concurrency or consumption.
- **Compare/trade-off:** time as input, controlled clock, scheduler timers and controlled
  barriers address different forces. Prefer deterministic observation over arbitrary sleeps.
- **Avoid/invariant:** await promises/assertions; force real overlap for exclusion claims.
  Check cancellation and resource cleanup, including failure and partial iteration where promised.
- **Defense:** fake timers are useful for scheduling but do not prove mutual exclusion;
  random sources can remain real when they do not affect the asserted guarantee.
- **Sources:** [async](https://vitest.dev/guide/learn/async), [timers](https://vitest.dev/guide/mocking/timers).

## TP-14 - Environment fidelity

- **Intent/use:** browser or infrastructure behavior is itself the guarantee.
- **Compare/trade-off:** Node, simulated DOM, real Browser Mode, HTTP interception, local
  server and isolated real infrastructure trade speed for fidelity. Choose the smallest adequate one.
- **Avoid/invariant:** simulated DOM does not prove native browser behavior; MSW does not
  prove a remote provider. Execute relevant real adapter/browser cases and disclose engine limits.
- **Defense:** simulation is enough for many component contracts; a real browser for a pure
  function adds no useful guarantee. Playwright provider remains the Vitest runner adapter.
- **Sources:** [Browser Mode](https://vitest.dev/guide/browser/), [requests](https://vitest.dev/guide/mocking/requests).

## TP-15 - Oracle and refactor resistance

- **Intent/use:** judge what a test really proves and whether its failure is useful.
- **Compare/trade-off:** explicit values, contract-specific errors, state and boundary
  interactions can all be strong oracles. Prefer the one exposing a plausible defect clearly.
- **Avoid/invariant:** names/assertions written by the builder are not requirements. Reject
  wrong values/errors, missing rejection and accidental exceptions; do not fix internal structure.
- **Defense:** contractual ordering or a bounded reviewed snapshot can be necessary.
  Require demonstrated coupling or missed guarantee, not line-count/style preferences.
- **Sources:** [Test Desiderata](https://kentbeck.github.io/TestDesiderata/), [expect](https://vitest.dev/api/expect).

## TP-16 - Executed evidence

- **Intent/use:** a suite or workflow claims successful validation.
- **Compare/trade-off:** map required scenarios to discovered and executed tests, inspect
  skips/todos/expected failures/retries, run the actual checker and applicable project gates.
- **Avoid/invariant:** global green, coverage percentage or schema validity alone is not
  completion. Include relevant unimported sources in coverage and honor project thresholds.
  Cleanup must hold on failure paths; tool outputs/state references stay reviewable externally.
- **Defense:** a justified skip/retry can be an explicit limitation, but cannot count as proof
  of a required guarantee. No universal coverage target or mutation framework is imposed.
- **Sources:** [coverage](https://vitest.dev/guide/coverage), [retry](https://vitest.dev/config/retry), [test API](https://vitest.dev/api/test).
