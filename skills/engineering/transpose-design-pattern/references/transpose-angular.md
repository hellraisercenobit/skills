# Angular Transposition — Design Patterns (TypeScript 2026)

Generic, portable Angular wiring for the patterns in [`pattern-catalog.md`](pattern-catalog.md).
Framework-specific only — keep business logic framework-agnostic in the catalog. Examples use
throwaway domains (user, cart, payment, order); substitute your own types. This guide states **common**
Angular practice, not any single project's house rules.

## Angular building blocks

The transpositions below lean on a few modern-Angular defaults:

- **Standalone** components / directives / pipes — no `NgModule` unless wrapping a third-party API.
- **`inject()`** over constructor injection; **`InjectionToken<T>`** to depend on abstractions.
- **ECMAScript `#` private fields** for private members (runtime privacy) — not TypeScript `private`.
- **`signal` / `computed`** for state; expose state read-only.
- **Host metadata** via the `host` object — not `@HostListener` / `@HostBinding`:

```ts
@Component({
  selector: 'app-example',
  host: { '[class.is-open]': 'open()', '(document:keydown.escape)': 'close()' },
})
export class ExampleComponent {
  /* ... */
}
```

## Pattern → Angular wiring

### Strategy → `InjectionToken` + multi providers

Stateless strategies registered with `multi: true`; pick by key — no `switch`.

```ts
export interface PaymentStrategy {
  readonly key: string;
  pay(amount: number): Promise<void>;
}
export const PAYMENT_STRATEGIES = new InjectionToken<readonly PaymentStrategy[]>('PAYMENT_STRATEGIES');

providers: [
  { provide: PAYMENT_STRATEGIES, useClass: StripeStrategy, multi: true },
  { provide: PAYMENT_STRATEGIES, useClass: PaypalStrategy, multi: true },
];
```

### Registry → DI lookup over the provided implementations

Inject the multi-provided array; resolve by key. DI _is_ the registry.

```ts
@Injectable({ providedIn: 'root' })
export class PaymentRegistry {
  readonly #strategies = inject(PAYMENT_STRATEGIES);
  get(key: string): PaymentStrategy | undefined {
    return this.#strategies.find((s) => s.key === key);
  }
}
```

### Factory → `useFactory` provider or a factory function

Isolate creation logic; return an abstraction.

```ts
export const LOGGER = new InjectionToken<Logger>('LOGGER');

providers: [{ provide: LOGGER, useFactory: () => (inject(ENV).production ? new RemoteLogger() : new ConsoleLogger()) }];
```

### Command → injectable use-case or plain function

Encapsulate one action; prefer a function or a small injectable over a heavy class.

```ts
@Injectable({ providedIn: 'root' })
export class CheckoutCart {
  readonly #orders = inject(OrderApi);
  execute(cart: Cart): Promise<Order> {
    return this.#orders.place(cart);
  }
}
```

A signal-store method (`@ngrx/signals` `withMethods`) is **not automatically** the Command — keep the action a distinct injectable use-case (or exported function) the store **delegates** to, provided where its dependencies live (route injector if route-scoped, `providedIn: 'root'` if app-wide). Full rule + layering: catalog → _Command_.

### Adapter / DTO Mapping → pure `from`/`to` at the service boundary

Map DTO ↔ domain inside the data-access service; never leak DTOs into components or templates.

```ts
// UserDto / User / userFromDto: see catalog -> Adapter / DTO Mapping
@Injectable({ providedIn: 'root' })
export class UserApi {
  readonly #http = inject(HttpClient);
  async getUser(id: string): Promise<User> {
    return userFromDto(await firstValueFrom(this.#http.get<UserDto>(`/api/users/${id}`)));
  }
}
```

### Composition → standalone + DI + functional composition

Compose behavior through injected services, functions, and host directives — not inheritance.

```ts
@Component({
  selector: 'app-card',
  hostDirectives: [HasTooltipDirective, TrackVisibilityDirective],
})
export class CardComponent {
  /* behavior composed via directives + injected services, no base class */
}
```

### Singleton / shared state → `providedIn: 'root'` service exposing readonly signals

The common case: a root-provided service with private signals and a readonly/computed public surface.
For a large store, a signal-store library (e.g. `@ngrx/signals`) is a popular scale-up — same principle:
keep state private, expose it read-only.

```ts
@Injectable({ providedIn: 'root' })
export class CartStore {
  readonly #items = signal<readonly CartItem[]>([]);
  readonly items = this.#items.asReadonly();
  readonly total = computed(() => this.#items().reduce((sum, i) => sum + i.price, 0));
  add(item: CartItem): void {
    this.#items.update((xs) => [...xs, item]);
  }
}
```

## Cross-cutting Angular practice

### Signals for UI state

`signal` / `computed` for local and shared UI state. Avoid `BehaviorSubject` stores for UI state.

### RxJS only at async boundaries

Keep RxJS for `HttpClient`, websockets, streams. Convert early to promises / signals / plain values.
Common read: a service method `firstValueFrom(http.get<T>())` returning a typed value (map DTO→domain
there). Reactive read: `httpResource` / `resource`. Mutation: `firstValueFrom(http.post/put/...)`.
Route API calls through a service/facade rather than calling `HttpClient` from components.

### Keep components thin

Components orchestrate UI, bind state, trigger actions. Push logic and mapping into services and pure
functions.

### linkedSignal for controlled inputs

When an internal signal mirrors a parent `input()`, use `linkedSignal` (auto-resets on source change),
not an `effect()`.

```ts
protected readonly value = linkedSignal(() => this.selected() ?? null);
```

### Avoid business logic in effects

Put side effects in the method that triggers the change, not in an `effect()` watching state.

```ts
select(user: User): void {
  this.#store.setUser(user);
  this.#analytics.track(user.id); // not inside effect(() => track(this.user()?.id))
}
```

### Template SRP

No business logic in templates. Move ternaries, multi-condition `@if`, and data-transforming calls into
`computed`.

```ts
// Bad (template): {{ user().isActive ? 'Active' : 'Inactive' }}
// Good (component):
protected readonly statusLabel = computed(() => (this.user().isActive ? 'Active' : 'Inactive'));
// template: {{ statusLabel() }}
```

### Forms

Typed **Reactive Forms** are the common default for non-trivial forms. **Signal Forms**
(`@angular/forms/signals`) are a newer, signal-native option (experimental upstream) for signal-driven
validation. Either way, keep validation rules in pure functions that the form just calls.

## Angular Decision Matrix

| Problem                                   | Recommended Solution                                      |
| ----------------------------------------- | --------------------------------------------------------- |
| Local / shared UI state                   | signal / computed (root service for shared)               |
| Controlled input sync                     | linkedSignal                                              |
| Derived template value                    | protected computed in the component                       |
| Private class member                      | ECMAScript `#` field                                      |
| Depend on an abstraction                  | InjectionToken<T> + inject()                              |
| Interchangeable behaviors                 | Strategy (InjectionToken + multi providers)               |
| Plugin / extension system                 | Registry (DI lookup over multi providers)                 |
| Object creation with logic                | Factory (useFactory / factory function)                   |
| Reusable action                           | Command (injectable use-case or function)                 |
| API ↔ domain shape mismatch              | Adapter — fromDto / toDto pure functions at the service   |
| Cross-cutting behavior                    | Composition (DI, functions, host directives)              |
| Shared services / app state               | Singleton DI (`providedIn: 'root'`)                       |
| HTTP read                                 | service method: firstValueFrom(http.get) → map DTO→domain |
| HTTP reactive read                        | httpResource / resource                                   |
| HTTP mutation                             | firstValueFrom(http.post/put/delete) in a service         |
| Async stream                              | RxJS                                                      |
| Host class / event / `document:` listener | `host: { ... }` on @Component / @Directive                |
| Form                                      | Reactive Forms (default) / Signal Forms (signal-native)   |

## Anti-Patterns to Avoid

- business logic in components; DTOs leaking into templates; giant services; string magic / `switch` on a type tag
- `BehaviorSubject` stores for UI state instead of signals
- exposing writable signals or the whole store object from a service — expose readonly / computed
- TypeScript `private` instead of ECMAScript `#`
- complex conditions / domain ternaries in templates — move to `computed`
- `effect()` for input→signal sync (use `linkedSignal`); business logic inside `effect()`
- calling `HttpClient` from components — go through a service/facade
- `@HostListener` / `@HostBinding` in new code — use the `host` object
- a Command merged into a store/facade method when it must be reusable — keep it a distinct injectable use-case the store delegates to
- inheritance-heavy Angular code; RxJS for local state; global mutable signals; module-level `let`
