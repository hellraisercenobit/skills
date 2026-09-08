# Smell Signatures — design-pattern violations, with their steelman

The detection layer for `review-design-patterns`. For each catalog pattern: **how a violation looks in code**,
the **steelman** that might legitimately excuse it, and what **confirms** it as a real finding once the
steelman fails. The *rules* live in the shared catalog and the per-framework guide — this file does not restate
them, it tells you how to spot and pressure-test a breach.

- Rule source: [`../../transpose-design-pattern/references/pattern-catalog.md`](../../transpose-design-pattern/references/pattern-catalog.md) (_Avoid_ clauses, _Core Principles_).
- Correct wiring: the project's `transpose-<framework>.md` (_Decision Matrix_, _Anti-Patterns to Avoid_).

A finding is only real when the **signature** is present **and** the **steelman** does not hold. Default to
*not a finding* when in doubt — an over-eager audit is as useless as a blind one.

---

## Strategy

- **Catalog → Strategy → Avoid:** `switch`/`case` on a type tag; `constructor.name` lookups; string magic; giant strategy classes.
- **Signature:** a `switch (type)` or `if (kind === '…')` chain that selects *behavior*; one class with a method per variant; a behavior chosen by reading `constructor.name` or a magic string.
- **Steelman:** exactly two variants that demonstrably never grow, no external/plugin variants → a small inline branch can beat Strategy ceremony (YAGNI). A `{ … } as const satisfies Record<K, Strategy>` lookup table is the *correct* idiom — not a smell.
- **Confirm when:** adding a variant means editing the switch; the switch is duplicated at more than one call site; variants come from plugins/config/runtime; the branch decides domain behavior, not a trivial display string.
- **Framework:** Angular expects `InjectionToken` + `multi` providers resolved by key (transpose-angular → Strategy). A behavior-selecting `switch` inside a component is a **blocker**.

## Registry

- **Catalog → Registry → Avoid:** hand-maintained enums for external plugins; the service-locator anti-pattern.
- **Signature:** a central `switch`/object literal edited by hand every time a plugin is added; an enum of plugin keys kept in sync manually; a global "get me anything by string" locator.
- **Steelman:** the set of entries is compile-time-known and closed (e.g. two app-owned exporters) → a typed `satisfies Record<K, T>` table is fine and is *not* the service-locator smell. Registration centralized in one composition-root module is acceptable.
- **Confirm when:** entries are external/dynamic yet enumerated by hand; adding a plugin forces edits in unrelated modules; lookups are untyped string fetches scattered across the code (service locator).
- **Framework:** Angular = DI lookup over `multi` providers *is* the registry (transpose-angular → Registry).

## Factory

- **Catalog → Factory → Avoid:** factories with no creation logic; giant conditional factories.
- **Signature:** a `createX()` that only calls `new X()` with no decisions (ceremony); a factory with a sprawling conditional building many unrelated types.
- **Steelman:** the factory isolates *real* creation complexity (env-dependent wiring, async setup, returning an abstraction) → keep it. A `useFactory` that picks an implementation by environment is correct, not a giant-conditional smell.
- **Confirm when:** the factory adds an indirection layer over a plain constructor with zero logic (delete it), or it has become a god-factory branching over many product types (split it).

## Command

- **Catalog → Command → Avoid:** burying a reusable command inside a store/facade method; mixing the action with UI-state, persistence, or presentation. **"A store action is _not automatically_ the Command."**
- **Signature:** a store/facade method (`withMethods`, Zustand/Pinia action, closure-store method) that performs a side-effecting action which is — or should be — reused, composed, or unit-tested in isolation, yet lives only inside the store and drags state flags + IO + mapping together.
- **Steelman:** a genuine one-off with no reuse or isolated-test pressure → inlining it in the store is correct (YAGNI); extracting a use-case would be premature. The store legitimately owns the *surrounding* state (status flags, journal, reset) and may **delegate** to a use-case — delegation is the right shape, not a smell.
- **Confirm when:** the action is called from (or clearly needs) more than one place; it can't be unit-tested without standing up the whole store; domain logic is fused with persistence/presentation inside the method. Fix: extract a distinct injectable use-case / exported function the store delegates to (catalog → Command for the layering).

## Adapter / DTO Mapping

- **Catalog → Adapter → Avoid:** DTOs leaking into the UI; framework-dependent mappers.
- **Signature:** snake_case / raw API fields, `created_at`, untyped JSON, or `*Dto` types referenced inside components/templates; mapping logic that depends on the framework; mapping done in the component instead of at the data-access boundary.
- **Steelman:** DTO and domain shapes are genuinely identical for this resource → a pass-through with no mapper is acceptable (don't manufacture a `fromDto` that copies fields 1:1). A typed response used only inside the service is fine.
- **Confirm when:** raw DTO shapes reach a template or view-model; mapping lives in a component; the mapper imports framework symbols. Fix: pure `from`/`to` functions at the service boundary (catalog → Adapter; framework guide → Adapter).

## Composition

- **Catalog → Composition → Avoid:** inheritance chains; tightly coupled modules.
- **Signature:** an `abstract` base class extended for behavior reuse; deep `extends` hierarchies; modules reaching into each other's internals instead of depending on an injected abstraction.
- **Steelman:** a shallow framework-mandated base class (e.g. a required lifecycle superclass) is not the inheritance smell. A short, stable, single-purpose base may be simpler than composition — judge by change pressure.
- **Confirm when:** behavior is shared via inheritance that composition (DI, functions, host directives) would model with less coupling; the hierarchy is more than one level deep; subclasses override to specialize behavior that should be injected.

## Singleton / shared state

- **Catalog → Singleton → Avoid:** global mutable state; hidden shared state.
- **Signature:** module-level `let` mutated across the app; a service exposing a writable signal / the whole store object; shared state mutated through paths the type system doesn't guard.
- **Steelman:** a root-provided service with private state and a **readonly/computed** public surface is the *correct* shape, not a smell. Minimal, explicitly-shared app state is fine.
- **Confirm when:** state is module-global and mutable; writable signals or the raw store are exposed; consumers mutate shared state directly. Fix: keep state private, expose readonly/computed (framework guide → Singleton / shared state).

---

## Cross-cutting (catalog Core Principles + guide anti-patterns)

These are not single patterns but principles the catalog enforces everywhere. Same gate: signature present **and** steelman fails.

- **Domain purity** — presentation (view-models, design tokens, display labels, locale formatting) or
  infrastructure (URLs, HTTP, runtime config) living in the domain layer. *Steelman:* a type that merely
  *looks* domain-ish but is correctly placed in its own layer is fine. *Confirm when:* the domain layer
  imports framework/HTTP/CSS or holds display strings.
- **ISP — split ports by concern** — one interface bundling a domain rule + an IO/output port + UI-copy
  strings. *Steelman:* a cohesive interface whose members are one concern is fine. *Confirm when:* a single
  port forces implementers to satisfy unrelated concerns.
- **Immutability** — object mutation / hidden side effects where `readonly` + immutable updates belong.
  *Steelman:* a local mutable accumulator inside a pure function is fine. *Confirm when:* shared/returned
  state is mutated in place.
- **Explicitness over magic** — magic strings, implicit effects, dynamic behavior without a contract.
  *Confirm when:* behavior keys are untyped strings, or effects fire from hidden global state.
- **Framework-specific anti-patterns** — business logic in components/templates/effects, `BehaviorSubject`
  stores for UI state, `@HostListener`/`@HostBinding` in new Angular code, calling `HttpClient` from a
  component. These are owned by the project's `transpose-<framework>.md` _Anti-Patterns to Avoid_ — cite that
  list verbatim; do not re-derive it here.
