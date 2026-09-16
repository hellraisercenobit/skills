# PHP Transposition - Design Patterns (PHP 8.2+, Symfony 6.4+)

Generic, portable PHP wiring for the patterns in [`pattern-catalog.md`](pattern-catalog.md).
Framework-specific only - keep business logic framework-agnostic in the catalog. Examples use
throwaway domains (user, cart, payment, order); substitute your own types. This guide states **common**
PHP practice at the **PHP 8.2 floor** with **Symfony 6.4** as the container - the current LTS pair - not
any single project's house rules. Without Symfony the class shapes stay the same and the wiring moves to a
composition root (any PSR-11 container); Laravel maps one-to-one (service-provider bindings, tagged
services) and is not covered here. _Beyond PHP 8.2_ at the end lists what changes when the floor moves.

## PHP building blocks

The transpositions below lean on a few modern-PHP defaults:

- **`declare(strict_types=1)`** in every file - scalar arguments are checked, not coerced, so a wrong type
  fails at the call site instead of deep inside.
- **`final` and `readonly` by default** - `final readonly class` for DTOs, commands, value objects and
  stateless services; **constructor property promotion**; `new` in initializers for default collaborators.
  Dynamic properties are deprecated since 8.2: declare every property. Open a class (`abstract`,
  non-final) only for a proven extension point.
- **Backed enums** for closed sets; **`match` with no `default`** over an enum is the exhaustive dispatch
  (`UnhandledMatchError` at runtime, a PHPStan error at analysis time when a case is missing). Enums carry
  methods, constants and interfaces, so a closed Strategy set can live on the enum itself.
- **Interfaces are the ports**; intersection types (`Countable&Traversable`) require two ports, DNF types
  (8.2, `(A&B)|null`) make them nullable.
- **First-class callable syntax** (`UserDto::fromEntity(...)`) and **named arguments** for mapping and
  DTO construction; `never` for helpers that always throw; standalone `null` / `true` / `false` types (8.2).
- **Static analysis is the other half of the type system** - PHPStan (at the project's level, `max` for
  new code) with generics and shapes (`@template T`, `list<T>`, `array<string, T>`, `array{id: int}`),
  **Deptrac** for layer rules, **php-cs-fixer** on `@PER-CS` (the successor of PSR-12) or `@Symfony`,
  **Rector** for upgrades. `mixed` and bare `array` across a layer boundary are a finding, not a type.
- **Symfony DI, compiled and attribute-driven** - `services.yaml` keeps only `_defaults` (`autowire`,
  `autoconfigure`) and the `App\` resource; per-service wiring goes on the class with attributes
  (`#[Autowire]`, `#[AutoconfigureTag]`, `#[AutowireIterator]`, `#[AutowireLocator]`, `#[AsAlias]`,
  `#[AsDecorator]`, `#[When]`, `#[Target]`). **Constructor injection only**; every service is shared
  (one instance per container) and **stateless**.
- **Shared-nothing runtime** - PHP-FPM builds the container per request and drops it after. Worker
  runtimes (Messenger consumers, FrankenPHP worker mode, RoadRunner, Swoole) keep it alive, so state kept
  on a service leaks across requests there. Design for the worker case: stateless services, or
  `ResetInterface`.

```php
<?php

declare(strict_types=1);

namespace App\Checkout;

use Symfony\Component\Clock\ClockInterface;

final readonly class CheckoutService
{
    public function __construct(
        private OrderRepository $orders,
        private ClockInterface $clock,
    ) {
    }
}
```

## Pattern → PHP wiring

### Strategy → tagged services collected by `#[AutowireIterator]` (no `switch`)

Each strategy is a `final readonly class` implementing the interface and exposing `supports()`. The
**interface carries `#[AutoconfigureTag]`**, so implementing it _is_ registering it - no YAML entry, no
central list. The consumer injects the tag with `#[AutowireIterator]` and picks by predicate - DI replaces
the `switch`. Order with `#[AsTaggedItem(priority: …)]` on an implementation when the first match must win.

```php
#[AutoconfigureTag('app.payment_strategy')]
interface PaymentStrategy
{
    public function supports(PaymentMethod $method): bool;

    public function pay(Money $amount): Receipt;
}

final readonly class PaymentService
{
    /** @param iterable<PaymentStrategy> $strategies */
    public function __construct(
        #[AutowireIterator('app.payment_strategy')]
        private iterable $strategies,
    ) {
    }

    public function pay(PaymentMethod $method, Money $amount): Receipt
    {
        foreach ($this->strategies as $strategy) {
            if ($strategy->supports($method)) {
                return $strategy->pay($amount);
            }
        }

        throw UnsupportedPaymentMethod::for($method);
    }
}
```

For a **closed** set known at compile time, the typed alternative is a backed enum whose method dispatches
with an exhaustive `match` - no `default`, so a new case is a PHPStan error until every `match` handles it:

```php
enum PaymentMethod: string
{
    case Card = 'card';
    case Sepa = 'sepa';

    public function feeRate(): float
    {
        return match ($this) {
            self::Card => 0.029,
            self::Sepa => 0.004,
        };
    }
}
```

A `switch` (or an `if` chain) on a **string** type tag is the smell in both shapes.

### Registry → `#[AutowireLocator]` indexed by the tag (lazy), or an indexed `#[AutowireIterator]`

DI _is_ the registry. Index the tagged services by a key each implementation exposes - a
`public static function` named by `defaultIndexMethod`, or `#[AsTaggedItem(index: 'pdf')]` on the class -
and inject either:

- **`#[AutowireLocator]`** → a `ServiceLocator` (`has()` / `get()`), **lazy**: a plugin is instantiated
  only when asked for. The default for registries with many or heavy entries.
- **`#[AutowireIterator]`** with the same index → an eager keyed iterable, when you must walk all
  entries (fail-fast duplicate checks, listing the available keys).

```php
#[AutoconfigureTag('app.exporter')]
interface Exporter
{
    public static function format(): string;

    public function export(Report $report): string;
}

final readonly class ExporterRegistry
{
    /** @param ServiceProviderInterface<Exporter> $exporters */
    public function __construct(
        #[AutowireLocator('app.exporter', defaultIndexMethod: 'format')]
        private ServiceProviderInterface $exporters,
    ) {
    }

    public function forFormat(string $format): Exporter
    {
        if (!$this->exporters->has($format)) {
            throw UnknownExportFormat::for($format);
        }

        return $this->exporters->get($format);
    }
}
```

New implementations are discovered automatically - no central `switch`, no hand-maintained map. Two
services declaring the same index: the container keeps the last one silently, so when a duplicate key is
a bug, build the map yourself from the iterator and throw in the constructor.

A **scoped** locator injected for one explicit tag is a typed registry, **not** the service-locator
anti-pattern. The anti-pattern is injecting the whole container (the application `ContainerInterface`, a
static `Container::get()` facade, `$this->container->get()` in a service) and fetching anything by string.

### Factory → a factory service (`factory:`), `#[When]` + `#[AsAlias]` for env choice, static named constructors

Isolate creation logic in a dedicated factory when it is non-trivial, config-driven, or builds a
third-party type you cannot annotate; return the abstraction. Symfony has no `#[Factory]` attribute: the
**product** is declared in `config/services.yaml` with `factory:`, pointing at the factory service.

```yaml
App\Payment\PaymentGateway:
    factory: ['@App\Payment\GatewayFactory', 'create']
```

```php
final readonly class GatewayFactory
{
    public function __construct(
        private HttpClientInterface $http,
        #[Autowire(env: 'PAYMENT_GATEWAY_URL')]
        private string $url,
        #[\SensitiveParameter, Autowire(env: 'PAYMENT_GATEWAY_TOKEN')]
        private string $token,
    ) {
    }

    public function create(): PaymentGateway
    {
        return new HttpPaymentGateway($this->http, $this->url, $this->token);
    }
}
```

When the "creation logic" is only **which implementation** for **which environment**, skip the factory:
`#[When(env:)]` registers a class in one environment only and `#[AsAlias]` binds it to the interface.

```php
#[When(env: 'prod')]
#[AsAlias(PaymentGateway::class)]
final readonly class HttpPaymentGateway implements PaymentGateway { /* ... */ }

#[When(env: 'dev')]
#[When(env: 'test')]
#[AsAlias(PaymentGateway::class)]
final readonly class FakePaymentGateway implements PaymentGateway { /* ... */ }
```

For **value objects**, creation logic lives in a static named constructor (`Money::fromCents()`,
`ForgotPassword::create()`): the constructor stays total, the name says which rule applies. A factory
whose `create()` only calls `new` with no decision is ceremony - delete it and let autowiring construct
the class.

### Command → a `readonly` command object + an invokable handler the controller (or the bus) delegates to

Encapsulate one action as a **command** (a `final readonly class` with public properties and validation
constraints) handled by a **handler** (`final readonly class` with `__invoke`). The controller binds the
request into the command with `#[MapRequestPayload]` and delegates; it never holds the logic. Put the
**transaction** around the handler (the ORM's transaction wrapper, or Messenger's
`DoctrineTransactionMiddleware`), never in the controller or the entity.

```php
final readonly class PlaceOrder
{
    public function __construct(
        #[Assert\Uuid]
        public string $cartId,
        #[Assert\Positive]
        public int $amountCents,
    ) {
    }
}

#[AsMessageHandler]
final readonly class PlaceOrderHandler
{
    public function __construct(private OrderRepository $orders)
    {
    }

    public function __invoke(PlaceOrder $command): OrderId
    {
        return $this->orders->save(Order::place($command));
    }
}

final class OrderController extends AbstractController
{
    #[Route('/orders', methods: ['POST'])]
    public function create(#[MapRequestPayload] PlaceOrder $command, PlaceOrderHandler $handler): JsonResponse
    {
        return $this->json(['id' => $handler($command)->value], Response::HTTP_CREATED);
    }
}
```

The same handler runs synchronously (inject and call it) or through **Messenger** (`#[AsMessageHandler]`,
dispatch the command on `MessageBusInterface`, route it to a transport for async) - the caller changes,
the Command does not. Drop the attribute when Messenger is not installed.

A controller action, a repository method or an ORM model method is **not automatically** the Command -
when the action must be reusable, composable, or unit-testable in isolation, keep it a distinct handler
the controller / model **delegates** to. Full rule + layering: catalog → _Command_.

### Adapter / DTO Mapping → `final readonly` DTOs with static `from*` constructors at the boundary

Map DTO ↔ domain / entity at the HTTP boundary; **never serialize an entity or ORM model**
(`$this->json($entity)`, `$model->toArray()`): it leaks columns, triggers lazy relations and couples the
API to the schema. The catalog's canonical mapper is TypeScript; the PHP equivalent is a `readonly` class
with a static named constructor, built with named arguments. Lists map with a first-class callable:
`array_map(UserDto::fromEntity(...), $users)`.

```php
final readonly class UserDto
{
    public function __construct(
        public string $id,
        public \DateTimeImmutable $createdAt,
    ) {
    }

    public static function fromEntity(User $user): self
    {
        return new self(id: $user->id()->toString(), createdAt: $user->createdAt());
    }
}
```

Inbound, `#[MapRequestPayload]` / `#[MapQueryString]` deserialize and validate the request into a DTO
(422 on a violation) - the controller never reads `$request->request->get()`. Outbound, `$this->json($dto)`
normalizes public properties. Keep DTOs and mappers in the application / presentation layer; the domain
must not import them.

### Composition → constructor injection + decorators + events (not inheritance)

Compose behavior through injected interfaces, **decorators** for cross-cutting concerns
(`#[AsDecorator]` on the wrapper, `#[AutowireDecorated]` on the inner argument), and **events** to decouple
producers from consumers (`EventDispatcherInterface` + `#[AsEventListener]`, the event inferred from the
`__invoke` parameter type). Messenger middleware plays the same role on the bus. Share behavior with
`final` classes and interfaces, not with `abstract` base classes; a trait is acceptable only for a small,
stateless, dependency-free helper.

```php
#[AsDecorator(decorates: PaymentGateway::class)]
final readonly class LoggingPaymentGateway implements PaymentGateway
{
    public function __construct(
        #[AutowireDecorated]
        private PaymentGateway $inner,
        private LoggerInterface $logger,
    ) {
    }

    public function charge(Money $amount): Receipt
    {
        $this->logger->info('payment.charge', ['cents' => $amount->cents]);

        return $this->inner->charge($amount);
    }
}

final readonly class OrderPlaced
{
    public function __construct(public OrderId $id)
    {
    }
}

#[AsEventListener]
final readonly class SendOrderConfirmation
{
    public function __invoke(OrderPlaced $event): void { /* ... */ }
}
```

### Singleton / shared state → a stateless shared service; explicit stores for cross-request state

Every Symfony service is already one instance per container (`shared: true`): a `static $instance`
Singleton adds nothing but a hidden global. The **real** question in PHP is _which lifetime_ the state
needs:

- **Per request** - keep it in the request (`RequestStack`) or pass it as an argument, not on a service.
- **Across requests** - it must leave the process: **Cache contracts** (`CacheInterface::get()` with a
  callback), **Lock** (`LockFactory`) for mutual exclusion, the database. A property on a service is _not_
  shared across requests under PHP-FPM, and _is_ under a worker runtime - both are bugs.
- **A memo that must exist** (a per-run cache) - the service implements **`ResetInterface`**; the
  framework autoconfigures it on `kernel.reset` and worker runtimes clear it between requests / messages.

```php
final class FeatureFlags implements ResetInterface
{
    /** @var array<string, bool> */
    private array $memo = [];

    public function __construct(
        private readonly CacheInterface $cache,
        private readonly FlagStore $store,
    ) {
    }

    public function isEnabled(string $flag): bool
    {
        return $this->memo[$flag] ??= $this->cache->get("flag.$flag", function (ItemInterface $item) use ($flag): bool {
            $item->expiresAfter(300);

            return $this->store->isEnabled($flag);
        });
    }

    public function reset(): void
    {
        $this->memo = [];
    }
}
```

Expose a read-only surface: no public setters on a shared service, no `static` properties, no `$GLOBALS`.

## Cross-cutting PHP practice

### Keep controllers thin

A controller binds input (`#[MapRequestPayload]`, `#[MapQueryString]`, `#[MapQueryParameter]`), delegates to
a handler or service, and returns a DTO or a `Response`. No business rule, no ORM query, no mapping in
the controller. `final class`, one action per method, `#[Route]` on the method.

### Validate at the boundary, enforce invariants in the constructor

Constraints (`#[Assert\*]`) live on command / DTO properties and run when the request is mapped; a violation
is a 422 before the handler runs. Domain invariants (a `Money` is never negative) are enforced in the
value object's constructor by throwing a domain exception, so an invalid object cannot exist. Inject
`ValidatorInterface` only for programmatic checks.

### Types are the contract

Native types on every property, parameter and return; PHPStan generics and array shapes where PHP has no
syntax; `never` on always-throwing helpers; `iterable<T>` / `list<T>` in docblocks. A public method that
accepts or returns `array` without a shape, or `mixed`, is an untyped seam - give it a DTO or a shape.

### Enums over constants

Backed enums for values that are stored or serialized (`from()` / `tryFrom()` at the boundary), pure enums
for internal states. Attach behavior with methods and an exhaustive `match`; keep IO out of enums. Class
constants remain for genuine constants (limits, keys), not for sets.

### Immutable by default

`readonly class` for anything that is data; `\DateTimeImmutable`, never `\DateTime`; a change returns a
new object through a wither (`withStatus(): self` returning `new self(...)` - a `readonly` property cannot
be re-assigned in `__clone` before 8.3). Inject `ClockInterface` (`symfony/clock`, PSR-20) instead of
calling `new \DateTimeImmutable()` inside a service, so tests control time with `MockClock`.

### Exceptions carry meaning

One `final` exception class per failure, extending `\DomainException` / `\RuntimeException` and a marker
interface per module (`CheckoutException`), with a static named constructor (`UnknownExportFormat::for($f)`).
Map to HTTP once, with `#[WithHttpStatus]` on the exception or a kernel exception listener - never in
every controller. Never catch `\Throwable` / `\Exception` to continue; never use exceptions for control
flow.

### Transactions at the handler boundary

The unit of work wraps the handler: `$em->wrapInTransaction()` / Messenger's `DoctrineTransactionMiddleware`
on Doctrine, `DB::transaction()` on Eloquent. Not in the controller, not in the entity, not around two
handlers.

### Layers enforced by tooling, not by convention

Domain ← application ← infrastructure / presentation, declared in `deptrac.yaml` and failed in CI;
PHPStan at the project level with `phpstan-symfony`; php-cs-fixer on `@PER-CS` or `@Symfony`; Rector sets
for the PHP / Symfony floor. A rule only humans check is a rule that drifts.

### Design for worker runtimes

Messenger consumers and FrankenPHP / RoadRunner workers reuse the container across requests. Stateless
services, or `ResetInterface`; no `static` caches; bounded workers (`--limit`, `--memory-limit`,
`--time-limit`) so a leak is recycled, not accumulated.

### Testing

Handlers, mappers, value objects and strategies are plain objects: unit-test them with the project's runner
(PHPUnit, Codeception, atoum) and **mock the interface, never the `final` class** - that is why every
collaborator has one. `KernelTestCase` + `static::getContainer()->set(Port::class, $fake)` swaps one
service in a booted container; `WebTestCase` covers the HTTP boundary through `#[MapRequestPayload]` and
the serializer; `MockClock` fixes time.

### Beyond PHP 8.2 (when the project floor moves)

- **8.3** - typed class constants, `#[\Override]` on overriding methods, `readonly` properties
  re-initialized in `__clone` (withers can use `clone`), `json_validate()`.
- **8.4** - property hooks and asymmetric visibility (`public private(set)`) replace getter boilerplate
  on DTOs; `new` without parentheses in chains; native lazy objects (Symfony 7.3 lazy services use them).
- **Symfony 7.1+** - `#[TaggedIterator]` / `#[TaggedLocator]` are deprecated in favor of the
  `#[AutowireIterator]` / `#[AutowireLocator]` used above; nothing else in this guide changes.

## PHP Decision Matrix

| Problem                          | Recommended Solution                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| Shared service                   | stateless `final readonly class`; the container already makes it one instance             |
| State across requests            | Cache contracts (`CacheInterface`) / Lock (`LockFactory`) / database - never a property   |
| Per-run memo on a service        | `ResetInterface` (autoconfigured on `kernel.reset`)                                       |
| Depend on an abstraction         | constructor injection of the interface; `#[AsAlias]` / `#[Target]` to bind                |
| Interchangeable behaviors        | Strategy (`#[AutoconfigureTag]` on the interface + `#[AutowireIterator]` + `supports()`)  |
| Closed, finite variant set       | backed enum + exhaustive `match` (no `default`)                                           |
| Plugin / extension system        | Registry (`#[AutowireLocator]` indexed by `defaultIndexMethod` / `#[AsTaggedItem]`)       |
| Object creation with logic       | Factory (`factory:` service; static named constructor for value objects)                  |
| Implementation per environment   | `#[When(env:)]` + `#[AsAlias]`                                                            |
| Reusable action                  | Command (`readonly` command + invokable handler; `#[AsMessageHandler]` for the bus)       |
| API ↔ domain shape mismatch     | `final readonly` DTO + static `from*` outbound / `#[MapRequestPayload]` inbound           |
| Cross-cutting behavior           | Composition (`#[AsDecorator]` + `#[AutowireDecorated]`; `#[AsEventListener]`; middleware) |
| Config value                     | `#[Autowire(env:)]` / `#[Autowire(param:)]` into a typed `readonly` config class          |
| Secret in a constructor          | `#[\SensitiveParameter]`                                                                  |
| Runtime validation               | `#[Assert\*]` on the DTO + `#[MapRequestPayload]` (422)                                   |
| Domain invariant                 | value-object constructor throws a domain exception                                        |
| Unit of work / atomicity         | transaction wrapper around the handler                                                    |
| Time                             | `ClockInterface` (`MockClock` in tests)                                                   |
| Error → HTTP status              | `#[WithHttpStatus]` on the exception, or one kernel exception listener                    |
| Types PHP cannot express         | PHPStan generics / array shapes (`list<T>`, `array{...}`)                                 |
| Layer boundaries                 | Deptrac                                                                                   |
| Coding style                     | php-cs-fixer `@PER-CS` (or `@Symfony`)                                                    |

## Anti-Patterns to Avoid

- `switch` / `if` chain on a string type tag to choose behavior - tagged services, or an enum + exhaustive `match`
- injecting the application container, a static `Container::get()` facade, or `$this->container->get()` in a service - the service-locator anti-pattern (a scoped `#[AutowireLocator]` is not)
- business logic in controllers, ORM models or Twig templates - delegate to a handler / service
- serializing an entity or model (`$this->json($entity)`, `$model->toArray()`) - map to a `readonly` DTO at the boundary
- `static` properties, `$GLOBALS`, or a stateful service without `ResetInterface` - leaks under worker runtimes
- `new \DateTime()` / `new \DateTimeImmutable()` inside a service - inject `ClockInterface`
- `abstract` base classes and traits to share behavior - compose with injected interfaces and decorators
- per-service YAML wiring when `autowire` + attributes suffice; `public: true` services for convenience
- bare `array` / `mixed` payloads across layers; a file without `declare(strict_types=1)`; a `@var` cast where a type belongs
- catching `\Throwable` / `\Exception` broadly; exceptions for control flow; mapping exceptions to HTTP in every controller
- setters and mutable DTOs; `\DateTime`; `clone`-based withers on `readonly` before 8.3
- a Command merged into a controller action or a model method when it must be reusable - keep it a distinct handler the caller delegates to
- a factory whose `create()` only calls `new` - delete it, autowiring constructs the class
