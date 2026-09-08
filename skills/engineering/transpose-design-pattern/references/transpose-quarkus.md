# Quarkus Transposition — Design Patterns (Java 21+, 2026)

Generic, portable Quarkus wiring for the patterns in [`pattern-catalog.md`](pattern-catalog.md).
Framework-specific only — keep business logic framework-agnostic in the catalog. Examples use
throwaway domains (user, cart, payment, order); substitute your own types. This guide states **common**
Quarkus practice (Quarkus 3.x, Java 21+), not any single project's house rules.

## Quarkus building blocks

The transpositions below lean on a few modern-Quarkus defaults:

- **Build-time CDI (ArC)** — wiring is resolved at build time (no runtime classpath scanning, no Portable
  Extensions). Prefer **constructor injection** (final fields, testable; `@Inject` is optional for a
  single constructor) over field injection.
- **`@ApplicationScoped`** for almost every bean — a _normal_ scope: a client proxy is injected and the
  instance is created lazily. `@Singleton` is a _pseudo-scope_ (no proxy, eager, can't break cycles);
  reach for it only to shave proxy indirection.
- **Quarkus REST** (`quarkus-rest` + `quarkus-rest-jackson`) — Jakarta REST annotations (`@Path`, `@GET`).
  It is the current name for RESTEasy Reactive; RESTEasy Classic (`quarkus-resteasy`) is legacy. A method
  runs on the Vert.x event loop unless it returns a plain value / is `@Blocking` / `@Transactional` /
  `@RunOnVirtualThread` (then a worker or virtual thread).
- **Records** for immutable DTOs and value types; **sealed interfaces + pattern-matching `switch`** for
  closed discriminated unions (compiler-checked exhaustiveness, no `default`).
- **`@ConfigMapping`** interface for typed, grouped, validated config (over scattered `@ConfigProperty`).
- **Native-image aware** — build-time wiring; payloads reached only by reflection need
  `@RegisterForReflection`, beans resolved only by programmatic lookup need `@Unremovable`.

```java
@ApplicationScoped
public class CheckoutService {             // proxied, lazy, one shared instance
  private final OrderRepository orders;    // constructor injection, final field
  CheckoutService(OrderRepository orders) { this.orders = orders; } // no @Inject needed
}
```

## Pattern → Quarkus wiring

### Strategy → many beans of one interface, selected via CDI (no `switch`)

Each strategy is an `@ApplicationScoped` bean implementing the interface with a `supports()` / `key()`
method. Inject **`@All List<T>`** (immutable, `@Priority`-sorted) and pick by predicate — DI replaces the
`switch`. For a _closed_ variant set known at compile time, a sealed interface + pattern-matching `switch`
is the typed alternative.

```java
interface PaymentStrategy { boolean supports(String method); void pay(long amount); }

@ApplicationScoped
class PaymentService {
  private final List<PaymentStrategy> strategies;
  PaymentService(@All List<PaymentStrategy> strategies) { this.strategies = strategies; }
  void pay(String method, long amount) {
    strategies.stream().filter(s -> s.supports(method)).findFirst()
        .orElseThrow(() -> new IllegalArgumentException(method)).pay(amount);
  }
}
```

Disambiguate a one-of lookup with `@Identifier("…")` + `Instance<T>.select(…)` — **not** `@Named`
(`@Named` also implies `@Default`, causing ambiguity).

### Registry → typed map built from the injected implementations

DI _is_ the registry: inject `@All List<T>` and index by the key each bean exposes. New implementations
are discovered automatically — no central `switch`, no hand-maintained provider map. Duplicate keys fail
fast when the registry is first used (it is `@ApplicationScoped`, so the constructor runs lazily; make it
`@Singleton`/`@Startup` if you want the check at boot).

```java
interface Exporter { String format(); byte[] export(Report r); }

@ApplicationScoped
class ExporterRegistry {
  private final Map<String, Exporter> byFormat;
  ExporterRegistry(@All List<Exporter> exporters) {
    this.byFormat = exporters.stream().collect(toUnmodifiableMap(Exporter::format, identity()));
  }
  Exporter forFormat(String f) {
    return Optional.ofNullable(byFormat.get(f)).orElseThrow(() -> new NoSuchElementException(f));
  }
}
```

Gate a bean by config with `@LookupIfProperty` / `@LookupUnlessProperty` (then obtain it via `Instance<T>`).

### Factory → CDI `@Produces` producer method

Isolate creation logic in a `@Produces` method when it is non-trivial, config-driven, or builds a
third-party type you can't annotate; return an abstraction. A `@Disposes` method cleans it up.

```java
@ApplicationScoped
class GatewayFactory {
  @Produces @ApplicationScoped @Identifier("primary")
  PaymentGateway primary(GatewayConfig cfg) {
    return new HttpPaymentGateway(cfg.url(), cfg.token());   // returns the abstraction
  }
}
```

Caveat: **interceptors are not woven on produced instances** — `@Transactional` / custom bindings on a
producer-returned object do nothing. If you need interception, make it an annotated bean class instead.

### Command → distinct `@ApplicationScoped` use-case the resource delegates to

Encapsulate one action in a focused application-service bean; the Quarkus REST resource stays thin and
delegates. Put `@Transactional` on the use-case method (the unit of work), never on the resource or the
domain.

```java
@ApplicationScoped
class PlaceOrder {                         // the use-case / Command
  private final OrderRepository orders;
  PlaceOrder(OrderRepository orders) { this.orders = orders; }
  @Transactional
  OrderId handle(PlaceOrderCommand cmd) { /* domain logic */ return orders.save(cmd.toOrder()); }
}

@Path("/orders")
class OrderResource {
  private final PlaceOrder placeOrder;
  OrderResource(PlaceOrder placeOrder) { this.placeOrder = placeOrder; }
  @POST OrderId create(@Valid PlaceOrderCommand cmd) { return placeOrder.handle(cmd); }
}
```

A Panache repository method or a resource method is **not automatically** the Command — when the action
must be reusable, composable, or unit-testable in isolation, keep it a distinct `@ApplicationScoped`
use-case bean the resource/repository **delegates** to. Full rule + layering: catalog → _Command_.

### Adapter / DTO Mapping → records + pure `from`/`to` at the boundary

Map DTO ↔ domain/entity at the resource boundary; **never serialize JPA entities** (leaks internals,
breaks on lazy relations, bloats the native reflection surface). The catalog's canonical mapper is
TypeScript; the Java equivalent is a record with a static `from` (or, for large surfaces, MapStruct):

```java
public record UserDto(String id, Instant createdAt) {
  static UserDto from(User u) { return new UserDto(u.id(), u.createdAt()); }
}

// larger surfaces: MapStruct, CDI-injectable and reflection-free (native-safe).
// Use "jakarta-cdi" on Quarkus 3.x — plain "cdi" can emit javax.inject.@Inject, which ArC won't resolve.
@Mapper(componentModel = "jakarta-cdi")
interface UserMapper { UserDto toDto(User u); }
```

Keep mappers and DTOs in the application/web layer — the domain must not depend on them.

### Composition → CDI injection + interceptors + events (not inheritance)

Compose behavior through injected collaborators, **CDI interceptors** for cross-cutting concerns
(`@InterceptorBinding` + `@AroundInvoke`, ordered by `@Priority`; `@Transactional` is the built-in
example), and **CDI events** to decouple producers from consumers (`Event<T>` + `@Observes` /
`@ObservesAsync`). Model variants with sealed records, not class hierarchies.

```java
@ApplicationScoped
class OrderService {
  private final Event<OrderPlaced> placed;
  OrderService(Event<OrderPlaced> placed) { this.placed = placed; }
  void place(Order o) { /* … */ placed.fireAsync(new OrderPlaced(o.id())); }
}

@ApplicationScoped
class EmailNotifier {
  void onOrder(@ObservesAsync OrderPlaced e) { /* offloaded to a worker pool */ }
}
```

### Singleton / shared state → `@ApplicationScoped` bean exposing read-only state

The common case for app-wide state: a single `@ApplicationScoped` instance with private state and a
read-only surface. Because that one instance is hit by **all request threads**, mutable fields are a data
race — guard them with container-managed `@Lock` (write-exclusive by default, `@Lock(READ)` for
concurrent reads) or `java.util.concurrent` / atomics.

```java
@Lock
@ApplicationScoped
class FeatureFlags {
  private final Map<String, Boolean> flags = new HashMap<>();
  void set(String key, boolean on) { flags.put(key, on); }                  // exclusive
  @Lock(value = Lock.Type.READ) boolean isEnabled(String key) {             // concurrent reads
    return flags.getOrDefault(key, false);
  }
}
```

## Cross-cutting Quarkus practice

### Keep resources thin

Quarkus REST resources orchestrate HTTP, bind/validate input, and delegate. Push logic and mapping into
`@ApplicationScoped` services and pure functions. (Resource classes are `@Singleton` by default — never
store per-request mutable state in their fields.)

### Never block the event loop

Endpoint methods run on the Vert.x event loop. Blocking work (JDBC, blocking clients, filesystem) must
either return a Mutiny `Uni` / `Multi`, or be annotated `@Blocking` (worker thread) or
`@RunOnVirtualThread` (Java 21 virtual thread — the 2026 default for blocking I/O endpoints). Blocking the
loop stalls every concurrent request.

```java
@GET @Path("/{id}") @RunOnVirtualThread            // imperative blocking on a virtual thread
UserDto get(@RestPath String id) { return UserDto.from(users.findById(id)); }
```

### Reactive only at the async boundary

Keep Mutiny `Uni` / `Multi` at the edges (REST signatures, reactive clients/messaging); map DTO→domain in
the chain and convert to plain values inside imperative code. Never call `.await()` on the event-loop
thread.

### Transactions at the service boundary

`@Transactional` (JTA) wraps the use-case method, making it atomic — not the domain, not the resource. On
the _reactive_ stack use `@WithTransaction` / `Panache.withTransaction(...)` (returns `Uni`); JTA does not
apply there.

### Validate at the boundary

Annotate DTO fields with `jakarta.validation.constraints.*` and REST params with `@Valid` — Quarkus
auto-returns HTTP 400 with a violation report. Keep the rules as constraints / pure functions; inject
`Validator` for programmatic checks in services.

### Persistence behind a repository

Prefer a `PanacheRepository<T>` (`@ApplicationScoped`) over the active-record entity for layered, mockable
code — it keeps query logic off the entity and behind a seam.

### Stay native-image-friendly

Wire through build-time CDI, not `Class.forName` / classpath scanning. Add `@RegisterForReflection` to
payloads reached only by reflection, and `@Unremovable` to beans resolved only via programmatic lookup
(else `quarkus.arc.remove-unused-beans` drops them). Use the tracing agent in integration tests to find gaps.

### Testing

`@QuarkusTest` + REST Assured for app / endpoint tests; `@QuarkusComponentTest` to test one bean in
isolation; `@InjectMock` / `@InjectSpy` (`quarkus-junit5-mockito`) to replace collaborators;
`@TestHTTPEndpoint` to resolve paths from the resource; `@QuarkusIntegrationTest` to exercise the packaged
jar / native image.

## Quarkus Decision Matrix

| Problem                                | Recommended Solution                                                       |
| -------------------------------------- | -------------------------------------------------------------------------- |
| Shared app state / service             | `@ApplicationScoped` bean (read-only surface; `@Lock` if mutable)          |
| Singleton without proxy / lazy needs   | `@Singleton` (pseudo-scope, eager)                                         |
| Depend on an abstraction               | inject the interface via the constructor                                   |
| Interchangeable behaviors              | Strategy (`@All List<T>` + `supports()`, no switch)                        |
| Closed, finite variant set             | sealed interface + pattern-matching `switch`                               |
| Plugin / extension system              | Registry (map built from `@All List<T>`)                                   |
| Object creation with logic             | Factory (`@Produces` producer method)                                      |
| Reusable action                        | Command (distinct `@ApplicationScoped` use-case the resource delegates to) |
| API ↔ domain shape mismatch           | record DTO + static `from` / MapStruct (`componentModel="jakarta-cdi"`)    |
| Cross-cutting behavior                 | Composition (CDI interceptor / events; no inheritance)                     |
| Disambiguate multiple beans            | `@Identifier` + `Instance.select` (not `@Named`)                           |
| Config-gated bean                      | `@LookupIfProperty` / `@LookupUnlessProperty`                              |
| Typed config                           | `@ConfigMapping` interface                                                 |
| Runtime validation                     | Bean Validation (`@Valid` + `jakarta.validation.constraints.*`)            |
| Unit of work / atomicity               | `@Transactional` on the service method (reactive: `@WithTransaction`)      |
| Blocking I/O endpoint                  | `@RunOnVirtualThread` (or `@Blocking`)                                      |
| Async / streaming boundary             | Mutiny `Uni` / `Multi`                                                     |
| Persistence access                     | `PanacheRepository<T>` (repository over active-record)                     |
| Reflectively-reached payload (native)  | `@RegisterForReflection`                                                   |
| Bean kept only via programmatic lookup | `@Unremovable`                                                             |

## Anti-Patterns to Avoid

- field injection instead of constructor injection (loses final fields, testability)
- business logic in Quarkus REST / JAX-RS resources — delegate to an `@ApplicationScoped` service
- blocking the IO / event-loop thread without `@Blocking` / `@RunOnVirtualThread` — stalls all requests
- mutable shared state in an `@ApplicationScoped` bean without `@Lock` / atomics — a data race across threads
- serializing JPA entities over HTTP / entities leaking across layers — map to record DTOs at the boundary
- `switch` on a type tag instead of CDI selection (open sets) or an exhaustive sealed `switch` (closed sets)
- `@Named` for internal bean disambiguation (implicit `@Default` clash) — use `@Identifier`
- `@Transactional` on a domain entity or a producer-returned instance (not woven) — put it on the service
- runtime reflection / `Class.forName` / classpath scanning that breaks native image — wire at build time
- deep inheritance hierarchies — prefer composition + CDI + sealed records
- a Command merged into a resource/repository method when it must be reusable — keep it a distinct use-case the resource delegates to
