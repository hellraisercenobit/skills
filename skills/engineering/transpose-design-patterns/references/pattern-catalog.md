# Design Pattern Catalog 1.0.0 - framework-agnostic (reference idioms in TypeScript)

Self-contained catalog for the `transpose-design-patterns` skill. Framework-agnostic on purpose:
select the pattern here, then apply the wiring from the matching `transpose-<framework>.md` guide.
A decision record declares this catalog version.

---

## Core Principles

### 1. Separation of Concerns

Each layer has a single responsibility.

- UI handles rendering and interactions
- Services orchestrate business logic
- Domain models represent business concepts
- Infrastructure handles APIs, storage, logging, etc.

### 2. Prefer Composition Over Inheritance

Use dependency injection, functions, services, composition. Avoid deep class hierarchies and abstract
base classes everywhere.

### 3. Depend on Abstractions

High-level modules must not depend on low-level implementations. Use interfaces, contracts, injection
tokens, generic constraints.

### 4. Keep Business Logic Framework-Agnostic

Business logic should work without a UI framework, without the DOM, without HTTP. Prefer pure functions,
domain services, typed contracts.

### 5. Use Strong Typing Everywhere

Use the strongest typing the language offers, and a static analyzer where the language stops. TypeScript:
inferred unions, `as const`, `satisfies`, discriminated unions, generics, branded types for IDs. Java:
records, sealed interfaces, generics. PHP: native types, `readonly`, backed enums, PHPStan generics and array
shapes. Avoid `any` / `mixed` / `Object`, magic strings, weak object maps.

### 6. Runtime Validation Matters

Static types stop at the process boundary. Validate API payloads, runtime plugins and environment configs
at that boundary - zod / valibot / arktype in TypeScript, Bean Validation in Java, Validator constraints in
PHP.

### 7. Prefer Immutable Data

Use `readonly`, readonly arrays, immutable updates. Avoid object mutation and hidden side effects.

### 8. Explicitness Over Magic

Prefer explicit flows, explicit dependencies, explicit state transitions. Avoid hidden global state,
implicit effects, dynamic behavior without contracts.

### 9. Keep the Domain Layer Pure

The domain layer holds business types and rules only. Two rules every framework guide enforces:

- **No presentation or infrastructure in the domain** - view-models, CSS / design tokens, display
  labels, locale formatting (presentation) and URLs, HTTP, runtime config (infrastructure) live in their
  own layers, never in the domain.
- **Split ports by concern (ISP)** - never bundle a domain rule + an IO/output port + UI-copy strings in
  one interface; separate them.

### 10. A Derived Value Has One Owner

A value computed from other values has one owner for its derivation and lifecycle:

- **Read-only derived fields stay out of persistence.** When a field exists only in the read model,
  its owner defines both its derivation and its exclusion from writes; **every** write path uses that
  boundary. Overwriting a stored field on read can hide an accidental persisted copy. Deliberately
  materialized derived values instead need an explicit refresh/invalidation contract.
- **A memo key carries every input the value depends on**, fallback inputs included. A key built
  from the nominal input alone can collide between cases the derived value distinguishes. Skip
  caching a no-work branch unless negative caching is intentional and has a defined scope and
  invalidation policy.

### 11. One Owner for a Set an API Replaces

When a call **replaces** a set instead of merging into it, callers providing the same logical context
must agree on the complete set. Omitting a member can silently change behavior. Give that context
one named builder used by each such caller. Distinct contexts can have distinct builders; a comment
asking duplicated builders to stay in step does not enforce their agreement.

---

## Structural forces

A pattern is justified by a force in the change, never by taste. Walk all eight before you decide,
and answer each one with a value from its set below plus the site that carries it. Every force at its
`absent` value is a legitimate `none`. Values, not prose, are what a reviewer compares: an answer of
"several behaviors" that jumps straight to Strategy is exactly what the value set prevents.

| Force | Value | What it looks like in the change | Decision |
| --- | --- | --- | --- |
| `variability` | `absent` | one responsibility, one body | - |
| | `duplicated-body` | two copies of the same body, no discriminator | Command, not Strategy - see `reusable-action` |
| | `interchangeable-closed` | several interchangeable implementations of one responsibility, selected by a discriminator the compiler closes | Strategy |
| | `interchangeable-open` | the same, with the discriminator open to config, plugins or runtime | Strategy or Registry (tie-breaker below) |
| `extension` | `no-variant-expected` | no plausible next variant | - |
| | `declaration-only` | the next variant costs the declaration and its exhaustive branch, nothing else (extension-cost test, question 1) | None - exhaustive branch on a discriminated union |
| | `one-site` | the next variant costs one orchestration edit | - |
| | `many-sites` | the next variant costs more than one orchestration edit | Strategy or Registry (tie-breaker below) |
| `creation-policy` | `absent` | consumers construct directly, always the same way | - |
| | `runtime-input` | construction depends on a runtime value | Factory |
| | `business-rule` | construction depends on a business rule | Factory |
| `boundary-mismatch` | `absent` | one shape crosses the boundary unchanged | - |
| | `shape-differs` | an external DTO / API shape differs from the domain shape | Adapter / DTO Mapping |
| | `shape-and-semantics-differ` | the shapes differ and so do units, nullability or error meaning | Adapter / DTO Mapping |
| `reusable-action` | `absent` | no operation stands on its own | - |
| | `state-container-bound` | the operation only changes its own store's state | - (a store action, not a Command) |
| | `caller-independent` | the operation has meaning independent of its caller and of its state container | Command |
| `composition` | `absent` | one behavior | - |
| | `sequential-steps` | several steps of one behavior, in fixed order | - |
| | `independent-behaviors` | several independent behaviors combine into one | Composition |
| `shared-lifecycle` | `absent` | no identity or lifecycle is shared | - |
| | `per-consumer` | each consumer owns its instance and its lifecycle | - |
| | `application-wide` | application-wide identity or lifecycle is required | Singleton / shared state (a facade over a store records as `application-wide`) |
| `cross-cutting-behavior` | `absent` | no concern wraps the operations | - |
| | `one-operation` | a concern wraps a single operation | - |
| | `many-operations` | logging, metrics, auth, caching, retry or tracing wraps many operations | Composition (decorator / interceptor), per the framework guide |

UI state (signals, per the front-end guides) is framework wiring, not a design decision: it takes no record.

**Strategy or Registry.** Both answer the extension force. Strategy when the variants are compile-time
known and typed - a `satisfies Record<K, S>` table gives the completeness check. Registry when variants
arrive from plugins, config or runtime, or self-register.

**The extension question.** _If one plausible variant is added next, what existing code must change?_
Answer it by naming the files and symbols, and let the count pick the `extension` value. The question is
answered, never asserted: "open to extension" without that list is not an answer.

**Extension-cost test.** A _variation axis_ is the discriminator that selects a variant: a type tag, a
key, a config value. For each axis, two questions in this order:

1. _Is the set closed by declaration, and does it stay closed?_ Closed means a sealed type, a
   discriminated union or a backed enum, exhaustiveness enforced by the compiler or analyzer, one call
   site, and no variant arriving from config, plugins or runtime. A closed set is a legitimate `none`
   even though adding a variant edits the branch: that edit is the declaration.
2. Otherwise, _count the edit sites the next legitimate variant costs_: files and symbols in
   orchestration code (the consumer, its constructor, each branch); manifests such as `package.json` do
   not count. More than one orchestration edit points at a pattern from the table. Never choose the
   inline branch because it is shorter; count the next plausible variant, not the current one.

A force without a variant axis (`creation-policy`, `boundary-mismatch`, `reusable-action`,
`shared-lifecycle`, `composition`, `cross-cutting-behavior`) takes the same count on the next change of its kind: the next
environment, the next API field, the next caller, the next consumer, the next concern to stack. Today's
cost against the cost with the decision is the `extensionCost` the reviewer re-counts.

---

## Patterns

### Strategy

**Use when** you need interchangeable business behaviors.

**Best practices** - use interfaces; use discriminated/inferred unions; inject implementations; keep
strategies stateless (no mutable per-call state; closing over injected dependencies is fine).

**Avoid** - `switch`/`case` on a type tag as the extension mechanism (a branch over a set that passes
question 1 of the extension-cost test is `none`, see below); `constructor.name` lookups; string magic;
giant strategy classes.

**Invariants** - the consumer depends on the behavioral contract, never on a concrete type; an
implementation can be replaced without editing the consumer; dispatch on a concrete type or a type tag
is not the extension mechanism.

### Registry

**Use when** you need extensibility / a plugin system.

**Best practices** - plugins self-register; no central switch; typed registries when plugins are
compile-time known; runtime validation for dynamic plugins.

**Avoid** - maintaining enums by hand for external plugins; the service-locator anti-pattern.

**Invariants** - registration is explicit at the composition root, or by the self-registration the
framework wires; consumers resolve through the registry contract by key; no central provider switch grows
with each plugin.

### Factory

**Use when** object creation contains logic.

**Best practices** - isolate creation complexity; return abstractions; keep factories lightweight.

**Avoid** - factories without creation logic; giant conditional factories.

**Invariants** - the factory holds real creation logic (a decision, an environment choice, an async
setup); it returns an abstraction; no caller repeats the creation decision.

### Command

**Use when** actions must be reusable or composable.

**Best practices** - encapsulate side effects; keep commands focused; prefer functions over heavy classes.

**Avoid** - burying the command inside a store/facade method (or any state container) when it must be
reusable; mixing the action with UI-state, persistence, or presentation concerns.

**Invariants** - the action exists as its own function or injectable, independent of UI or store
state; it can be tested without standing up the store; a store or facade delegates to it when
surrounding state is needed.

**A store action/method is _not automatically_ the Command.** When the action must be reusable,
composable, or unit-testable in isolation, keep it a **distinct use-case** (function or small injectable)
and have the store **delegate** to it - the store then only manages the surrounding state (status flags,
journal, reset). Inline it in the store only for a one-off with no reuse/test pressure (YAGNI). In a
strict layering the use-case lives in an _application_ layer depending only on _domain_ + ports; the
store (an adapter) invokes it. Each `transpose-<framework>.md` only binds this to its store (Angular
`@ngrx/signals` `withMethods`, React/Zustand, Vue/Pinia, Vanilla closure store).

### Adapter / DTO Mapping

**Use when** backend models differ from frontend domain models.

**Best practices** - separate DTO and domain; use pure `from`/`to` functions; map at infrastructure boundaries.

**Avoid** - leaking DTOs into the UI; framework-dependent mappers.

**Invariants** - the external shape does not cross the boundary; the mapping is a pure function
testable on its own; UI and application code receive the domain representation.

**Canonical pure mapper** - each `transpose-<framework>.md` shows only the framework wrapper that calls it:

```ts
interface UserDto {
  id: string;
  created_at: string;
}
interface User {
  id: string;
  createdAt: Date;
}
const userFromDto = (d: UserDto): User => ({ id: d.id, createdAt: new Date(d.created_at) });
```

### Composition

**Use when** you want modular, decoupled systems.

**Best practices** - compose behavior through services/functions; isolate concerns.

**Avoid** - inheritance chains; tightly coupled modules.

**Invariants** - behavior is combined through injection, functions or decorators, not through a class
hierarchy; each part has one concern and can be swapped alone.

### Singleton

**Use when** shared application-wide state/services are needed.

**Best practices** - keep singleton state minimal; expose readonly APIs.

**Avoid** - global mutable state; hidden shared state.

**Invariants** - state is private to the service; the public surface is readonly or computed;
consumers cannot mutate shared state directly.

### None - no named pattern

**Use when** no structural force is present, or the only force is a variant set that is intentionally
closed, compiler-checked, and branched on at one site (question 1 of the extension-cost test).

**Best practices** - keep the exhaustive branch on a discriminated union (TypeScript `switch` with a
`never` check, Java `sealed` + `switch`, PHP backed enum + `match`); declare that the set is closed;
name the trigger that reopens the decision.

**Avoid** - `none` chosen to save ceremony while a force is present; an "exhaustive" branch duplicated
at several call sites; a closed set that receives variants from config, plugins or runtime.

**Invariants** - for a closed set: the branch stays exhaustive and the compiler or analyzer enforces it,
the variant set is closed by declaration, not by accident, and adding a variant is a deliberate reopening
of the decision. When no force is present: the change adds no layer, alias or indirection, and the shape
that exists is preserved.

---

## Reference idioms (TypeScript)

The catalog's examples are TypeScript. Each `transpose-<framework>.md` carries the same idioms in its own
language (records and sealed interfaces for Quarkus, `readonly` classes and backed enums for PHP).

```ts
// Prefer `satisfies`
const exporters = {
  pdf: pdfExporter,
  csv: csvExporter,
} as const satisfies Record<string, Exporter>;

// Prefer inferred unions
type ExportFormat = keyof typeof exporters;

// Prefer discriminated unions
type Result = { success: true; data: User } | { success: false; error: string };

// Prefer readonly APIs
readonly items: readonly Item[];

// Prefer pure functions
export const userFromDto = (dto: UserDto): User => ({ /* ... */ });
```
