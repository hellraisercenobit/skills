# Design Pattern Catalog — framework-agnostic (TypeScript 2026)

Self-contained catalog for the `transpose-design-pattern` skill. Framework-agnostic on purpose:
select the pattern here, then apply the wiring from the matching `transpose-<framework>.md` guide.

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

Prefer inferred unions, `as const`, `satisfies`, discriminated unions, generics, branded types for IDs.
Avoid `any`, magic strings, weak object maps.

### 6. Runtime Validation Matters

TypeScript only validates at compile time. Validate API payloads, runtime plugins, environment configs
with zod / valibot / arktype.

### 7. Prefer Immutable Data

Use `readonly`, readonly arrays, immutable updates. Avoid object mutation and hidden side effects.

### 8. Explicitness Over Magic

Prefer explicit flows, explicit dependencies, explicit state transitions. Avoid hidden global state,
implicit effects, dynamic behavior without contracts.

### 9. Keep the Domain Layer Pure

The domain layer holds business types and rules only. Two rules every framework guide enforces:

- **No presentation or infrastructure in the domain** — view-models, CSS / design tokens, display
  labels, locale formatting (presentation) and URLs, HTTP, runtime config (infrastructure) live in their
  own layers, never in the domain.
- **Split ports by concern (ISP)** — never bundle a domain rule + an IO/output port + UI-copy strings in
  one interface; separate them.

---

## Patterns

### Strategy

**Use when** you need interchangeable business behaviors.

**Best practices** — use interfaces; use discriminated/inferred unions; inject implementations; keep
strategies stateless.

**Avoid** — `switch`/`case` on a type tag; `constructor.name` lookups; string magic; giant strategy classes.

### Registry

**Use when** you need extensibility / a plugin system.

**Best practices** — plugins self-register; no central switch; typed registries when plugins are
compile-time known; runtime validation for dynamic plugins.

**Avoid** — maintaining enums by hand for external plugins; the service-locator anti-pattern.

### Factory

**Use when** object creation contains logic.

**Best practices** — isolate creation complexity; return abstractions; keep factories lightweight.

**Avoid** — factories without creation logic; giant conditional factories.

### Command

**Use when** actions must be reusable or composable.

**Best practices** — encapsulate side effects; keep commands focused; prefer functions over heavy classes.

**Avoid** — burying the command inside a store/facade method (or any state container) when it must be
reusable; mixing the action with UI-state, persistence, or presentation concerns.

**A store action/method is _not automatically_ the Command.** When the action must be reusable,
composable, or unit-testable in isolation, keep it a **distinct use-case** (function or small injectable)
and have the store **delegate** to it — the store then only manages the surrounding state (status flags,
journal, reset). Inline it in the store only for a one-off with no reuse/test pressure (YAGNI). In a
strict layering the use-case lives in an _application_ layer depending only on _domain_ + ports; the
store (an adapter) invokes it. Each `transpose-<framework>.md` only binds this to its store (Angular
`@ngrx/signals` `withMethods`, React/Zustand, Vue/Pinia, Vanilla closure store).

### Adapter / DTO Mapping

**Use when** backend models differ from frontend domain models.

**Best practices** — separate DTO and domain; use pure `from`/`to` functions; map at infrastructure boundaries.

**Avoid** — leaking DTOs into the UI; framework-dependent mappers.

**Canonical pure mapper** — each `transpose-<framework>.md` shows only the framework wrapper that calls it:

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

**Best practices** — compose behavior through services/functions; isolate concerns.

**Avoid** — inheritance chains; tightly coupled modules.

### Singleton

**Use when** shared application-wide state/services are needed.

**Best practices** — keep singleton state minimal; expose readonly APIs.

**Avoid** — global mutable state; hidden shared state.

---

## TypeScript 2026 Recommendations

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

---

## Decision Rules

| Problem                            | Preferred Solution        |
| ---------------------------------- | ------------------------- |
| Multiple interchangeable behaviors | Strategy                  |
| Extensible plugin system           | Registry                  |
| Object creation complexity         | Factory                   |
| DTO transformation                 | Adapter / from-to mapping |
| Shared app state                   | Singleton / facade        |
| UI state                           | Signals                   |
| Reusable action                    | Command                   |
| Decoupling systems                 | Composition               |
