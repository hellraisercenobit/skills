---
name: transpose-design-patterns
description: Decide the design pattern - or an explicit none - for a code change from a built-in framework-agnostic catalog, transpose it to the target framework via a bundled per-framework guide, and record the decision BEFORE writing implementation code; after implementation, hand the code to a fresh blind reviewer. USE WHEN implementing or refactoring code with a pattern-shaped decision - interchangeable behaviors, plugin/extensibility, object-creation logic, DTO/API-shape mapping, shared state, composable actions, cross-cutting concerns - or when choosing where code goes or whether a design is sound. EXAMPLES - "add a new exporter type", "wire two payment providers via DI", "where should this DTO mapping live", "make this service pluggable", "Strategy or Registry here?".
license: MIT
author: Guillaume Mongin (@hellraisercenobit)
---

# Transpose Design Patterns

Autonomous, portable, **mandatory** workflow: detect the structural forces in the change, decide on a
catalog pattern **or on an explicit `none`**, transpose it to the target framework with a bundled guide,
and record the decision - all **before** writing implementation code. After implementation, a fresh
reviewer re-derives the design blind (`review-design-patterns`). Everything this skill needs ships inside
it; it references **no project files**, so it works in any repository.

## Bundled sources (this skill owns them - read, do not paraphrase from memory)

- **Shared procedure:** [suite contract 1.1.0](references/suite-contract.md) - read once per execution for C01-C12, the declaration, the three fingerprints, neutral context, composition, state expiry and portable/gate limits. The shared schemas it refers to sit beside it: [declaration](references/declaration.schema.json), [decision envelope](references/decision-envelope.schema.json), [evidence append](references/evidence-append.schema.json) and [dispute](references/dispute.schema.json).
- **Catalog (framework-agnostic):** [`references/pattern-catalog.md`](references/pattern-catalog.md) -
  the _Structural forces_ table (force → decision) with the _Extension-cost test_, one entry per pattern
  (_Use when / Best practices / Avoid / Invariants_), the `None` entry.
- **Record shape:** [`references/design-decision-record.schema.json`](references/design-decision-record.schema.json) -
  the JSON Schema of the design decision record; a gate validates against it, never against semantics.
- **Transposition (per framework):** the guide from the table below.

| Target framework          | Transposition guide                                                  | Store / shared state         |
| ------------------------- | ------------------------------------------------------------------- | ---------------------------- |
| Angular                   | [`references/transpose-angular.md`](references/transpose-angular.md) | `providedIn: 'root'` service / `@ngrx/signals` |
| React                     | [`references/transpose-react.md`](references/transpose-react.md)     | Zustand                      |
| Vue                       | [`references/transpose-vue.md`](references/transpose-vue.md)         | Pinia (setup store)          |
| Vanilla TS (no framework) | [`references/transpose-vanilla.md`](references/transpose-vanilla.md) | closure observable store / signals |
| Quarkus (Java)            | [`references/transpose-quarkus.md`](references/transpose-quarkus.md) | `@ApplicationScoped` CDI bean |
| PHP (Symfony)             | [`references/transpose-php.md`](references/transpose-php.md)         | stateless shared service; Cache / Lock for cross-request state |

> Determine the target framework from the project you are editing - `package.json` deps for the JS/TS
> frameworks (no UI framework → Vanilla TS), or a `pom.xml` / `build.gradle` declaring `io.quarkus`
> deps → Quarkus, or a `composer.json` → PHP (`symfony/framework-bundle` in its `require` confirms the Symfony
> wiring; without it the same class shapes apply at a composition root). To support another, see
> _Extending to a new framework_. **No guide for the detected stack is a valid state:** decide on the
> catalog alone and record `transposition: null`.

## Mandatory procedure

Run **every** step before writing or changing implementation code. Do not jump straight to coding.

0. **Declare the dimension.** Before any record, say whether design patterns apply to this change and on
   which paths: pipe a [declaration](references/declaration.schema.json) to
   `ai-engineering-gate declare --dimension design-patterns --stdin`. It carries the requester's own wording,
   the factual constraints, the comparison base and the protected scope - never your rationale, because the
   reviewer's brief is rendered from it. Declaring `non-applicable` with the reason is a complete answer:
   skipping the dimension is a recorded decision, not silence. _Done when:_ the declaration is accepted.
1. **Detect the structural forces.** Walk the eight forces of the catalog's _Structural forces_ table
   against the change. Answer each one with a **value from its set** plus the site that carries it: a file,
   the planned symbol, or the requirement that states it (a planned third variant lives in the ticket, not
   in the code). _Done when:_ all eight forces have a value and a site - a value, never prose, because that
   is what the reviewer compares.
2. **Run the extension-cost test.** For each variation axis (the discriminator that selects a variant:
   a type tag, a key, a config value), the catalog's two questions in order: _is the set closed by
   declaration, and does it stay closed?_ - a closed set is a legitimate `none` even though the branch is
   edited; otherwise _count the edit sites the next legitimate variant costs_ in orchestration code.
   More than one orchestration edit points at a pattern. Count the next plausible variant, never the
   current one, and never pick the inline branch because it is shorter.
3. **Decide: pattern or `none`.** Take the decision the _Structural forces_ table gives for the forces
   present, after step 2: a variability force whose set passes question 1 records as `none`, and the
   extension force splits on the catalog's Strategy-or-Registry tie-breaker. Read the chosen entry's
   _Use when / Best practices / Avoid / Invariants_. Name every alternative you considered and why it lost; the **current shape of the code is
   always one of them**. `none` is a first-class result and carries the same burden: the forces, the
   alternatives, the structural reason the simpler shape wins, and the trigger that reopens the decision.
   Never force a pattern to satisfy a gate; never pick `none` to save ceremony.
4. **Resolve the framework and transpose.** Look up the guide in the table above; read the section
   matching your pattern (plus its _Decision Matrix_) and apply the wiring it shows - DI, signals, stores,
   layering. When the section's example does not fit (injected dependencies, no entry module to wire at),
   keep its layering and say in `framework.transposition` what you adapted and why. No guide:
   `transposition: null`, and the catalog's _Best practices_ are the wiring. For `none` there is no guide
   section either: the catalog's `None` _Best practices_ are the wiring, and `transposition` is `null`.
5. **Record the decision.** Write one design decision record per pattern-shaped site in the change
   (shape below, schema in `references/`), **before the first implementation write**, and file it:
   `ai-engineering-gate record --dimension design-patterns --stdin`. The gate stores it outside the
   repository, hashes every path it `cites` and refuses a citation that does not exist, so a claim about
   the current code cannot outlive the code. A force absorbed by the chosen pattern keeps its own value and
   says so in its `site`. What the record commits to produce goes in `plans`; the reviewer is never
   dispatched to notice a file that was never written. The gate checks shape, catalog membership and
   referential integrity, never semantics; a refused record is fixed, not bypassed. Without the gate, check
   the record against the schema yourself (ajv, or a hand check of every constraint) and keep its path: the
   reviewer compares against it as written.
6. **Implement per the transposition.** The first write inside the declared scope is allowed only once the
   record is on file - `ai-engineering-gate can-write --path <path>` answers it, and a PreToolUse hook asks
   for you. In your summary state the chain _forces → pattern (or `none`) → framework section followed_,
   **and for each pattern name the concrete artifact** (file + symbol) that realizes it. Verify the artifact
   is **distinct from unrelated layers** - e.g. a Command/use-case is its own injectable or exported
   function, **not** a method merged into a store/facade - and that every invariant in the record is
   observable in the code. File each planned artifact through
   `ai-engineering-gate evidence append --dimension design-patterns --stdin` as you produce it.

## Framework transposition - step 4

Every guide uses the **same section names** (Strategy, Registry, Factory, Command, Adapter / DTO Mapping,
Composition, Singleton / shared state), so open the section matching your pattern. For
everything around the pattern (front end: reactivity, async, forms; back end: transactions, validation,
runtime model), read that guide's _Cross-cutting <framework> practice_ section; for anything else, its
_Decision Matrix_ (bottom). Store choice per framework is in the _Bundled sources_ table above.

## Design decision record - step 5

The values below are illustrative. Every fact in your record comes from the code or from the requirement
as stated, never from this example.

```json
{
  "dimension": "design-patterns",
  "schemaVersion": "1.0.0",
  "catalogVersion": "1.0.0",
  "contractVersions": ["1.0.0", "1.1.0"],
  "need": "quote shipping rates from a second carrier; the sales team wants to add carriers by market",
  "scope": ["src/shipping/"],
  "base": "origin/main",
  "revision": { "number": 1, "previous": null, "reason": "first decision for this change" },
  "cites": [
    {
      "path": "src/shipping/rate.service.ts",
      "checkedAt": "2026-09-18",
      "claim": "RateService.quote holds one body per carrier and both callers repeat the carrier branch",
      "covers": ["variability", "extension"]
    }
  ],
  "plans": [
    { "path": "src/shipping/rate.strategy.ts", "role": "implementation" },
    { "path": "src/shipping/rate.strategies.ts", "role": "implementation" }
  ],
  "forces": [
    { "force": "variability", "value": "interchangeable-open", "site": "RateService.quote holds one body per carrier" },
    { "force": "extension", "value": "many-sites", "site": "the ticket names a second carrier now and carriers per market later" },
    { "force": "creation-policy", "value": "absent", "site": "each carrier client is a plain constructor call with no runtime decision" },
    { "force": "boundary-mismatch", "value": "shape-and-semantics-differ", "site": "absorbed by strategy: each carrier's weight unit stays inside its own strategy" },
    { "force": "reusable-action", "value": "absent", "site": "quote has no caller outside RateService" },
    { "force": "composition", "value": "absent", "site": "one behavior per carrier, nothing is combined" },
    { "force": "shared-lifecycle", "value": "per-consumer", "site": "the service and the clients hold configuration only" },
    { "force": "cross-cutting-behavior", "value": "absent", "site": "no logging, retry or metrics requested" }
  ],
  "alternatives": [
    "none, the current if/else on the carrier code - the set is not closed by declaration and a second market reopens it",
    "registry - carriers are compile-time known with typed credentials; a Map lookup loses the completeness check",
    "factory - createUpsStrategy(client) holds no creation decision, it is injection by closure"
  ],
  "decision": {
    "pattern": "strategy",
    "reason": "variability and extension on one axis, the carrier; RateService must depend on a contract, not on a client class",
    "extensionCost": "today: 4 edit sites in RateService per carrier (CarrierCode, import, constructor, quote branch); with the map: 1 strategy module, 1 CarrierCode literal, 1 map entry, RateService untouched",
    "reconsiderWhen": "a carrier arrives from configuration or a plugin at runtime - then Registry"
  },
  "framework": {
    "name": "vanilla",
    "transposition": "Strategy → typed lookup map resolved by key; adapted: strategies are factory closures over their injected client, the map is built by createRateStrategies because the tree has no entry module"
  },
  "artifacts": [
    { "file": "src/shipping/rate.strategy.ts", "symbol": "RateStrategy" },
    { "file": "src/shipping/rate.strategies.ts", "symbol": "createRateStrategies" }
  ],
  "invariants": [
    "RateService depends on RateStrategy and on Record<CarrierCode, RateStrategy> only; it imports no client",
    "a third carrier is added without editing rate.service.ts, and the build fails until its map entry exists",
    "no switch, if or ternary on the carrier code remains under src/shipping"
  ]
}
```

- Each `forces` entry answers with a value from that force's set in the catalog's _Structural forces_ table,
  plus the site that carries it. All eight are present; every force at its `absent` value is a legitimate
  `none`.
- `cites` are the artifacts and sources the claims rest on, each with the date you checked it and what it
  `covers` - a force name, a symbol, a finding. `plans` are the artifacts this record commits to produce.
- `decision.pattern` is one of `strategy`, `registry`, `factory`, `command`, `adapter`, `composition`,
  `singleton`, `none`. A facade over a store records as `singleton`; UI state (signals) is framework
  wiring, not a record.
- `framework.name` is `angular`, `react`, `vue`, `vanilla`, `quarkus`, `php`, or the detected stack when no
  guide covers it (then `transposition` is `null`).
- `decision.extensionCost` is the step 2 count, today and with the decision - the reviewer re-counts it.
- `decision.reconsiderWhen` is allowed for any pattern and required for `none`. For `none`,
  `framework.transposition` is `null` and `artifacts` may be empty.
- `invariants` are the catalog entry's _Invariants_, made concrete for this change - the reviewer checks
  each one against the code.

## Completion protocol

After implementation and the project's deterministic checks (tests, lint, typecheck):

1. **Ask what is left.** `ai-engineering-gate status --full` names the next action and, once every applicable
   dimension has its records and its planned evidence, prints the dispatch plan: which reviewer to launch and
   the neutral brief to send it, rendered from the declaration alone.
2. **Dispatch every reviewer in the plan in one turn.** Use the `design-pattern-reviewer` agent when the
   harness defines one; otherwise a fresh general subagent. Send the brief the plan printed and nothing else:
   **not** the pattern name, not your rationale, not your force analysis, not the record's content. The brief
   carries the record's path; the reviewer opens it only after its blind matrix is frozen. The gate refuses a
   review to your own identity, so this is enforced, not only asked.
3. **The reviewer runs `review-design-patterns`:** expected design frozen first, then the record, then the
   code, compared three ways. It opens its own window and files its own envelope.
4. **Findings: correct or dispute, then dispatch a fresh review.** Corrections are batched - address every
   pending finding of every dimension, then reopen all applicable reviews together on one state. An evidence
   finding is closed by its remedy; a judgment finding by a record revision that `addresses` it. A new
   dispatch, never a continued conversation with the same reviewer.
5. **A finding you contest is neither fixed nor dismissed.** File
   `ai-engineering-gate dispute --dimension design-patterns --stdin` with a pointer to counter-evidence, then
   hand it to the user: only a command the user types can write the arbitration.
6. **Complete only when `ai-engineering-gate can-stop` exits 0.** Any later change to code in scope moves the
   source fingerprint and voids the verdict, which the status reports as `stale-source`.

Without the gate, dispatch the reviewer yourself with a brief carrying exactly what the plan would have
carried: the skill to run, the read-only rule, the scope and base, the requester's wording, the factual
constraints, the record paths and the undeclared changes. Nothing of your rationale.

## Enforcement rules

- Steps 0-5 are **non-negotiable** before implementation code in pattern-shaped work. A declaration is the
  proof the dimension was considered, and a record - pattern or `none` - the proof the evaluation happened.
- Never invent a pattern absent from the catalog. Never use `switch` / `constructor.name` / magic strings
  **as the extension mechanism** where the catalog marks them _Avoid_; the exhaustive branch over a closed
  set that the catalog's `None` entry prescribes is not that.
- Treat each pattern's _Avoid_ clause as a hard rule - e.g. do **not** fold a reusable Command into a
  store/facade method; resolve plugins by key via a Registry, never `switch` on a type tag.
- Keep business logic framework-agnostic - only the transposition step (4) is framework-specific.
- The bundled references are the source of truth. If a project also has its own pattern docs, follow the
  project doc for project-specific wiring, but the procedure above still applies.
- The completion protocol is part of the work: an implementation without a `SOUND` fresh review is not done.

## Extending to a new framework

1. Author `references/transpose-<framework>.md`, mirroring `references/transpose-angular.md` (front end) or
   `references/transpose-quarkus.md` (back end): a _Decision Matrix_ plus one section per catalog pattern
   with idiomatic wiring for that framework.
2. Add one row to the _Target framework_ table above, pointing at the new guide.
3. Leave `references/pattern-catalog.md` framework-agnostic and unchanged - it is shared across all targets.
