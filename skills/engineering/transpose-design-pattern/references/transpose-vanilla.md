# Vanilla TypeScript Transposition — Design Patterns (TypeScript 2026)

Generic, portable wiring for the patterns in [`pattern-catalog.md`](pattern-catalog.md) in a
**framework-less** TypeScript project (libraries, CLIs, workers, Web Components, plain DOM apps). No DI
container, no component framework — just ES modules, functions, closures, and explicit wiring. Examples
use throwaway domains (user, cart, payment, order); substitute your own types.

## Vanilla building blocks

The transpositions below lean on a few framework-less defaults:

- **ES modules with named exports** — tree-shakeable; one concern per module. No default-export grab-bags.
- **Functions and closures over classes.** Use a `class` only for genuine identity/lifecycle; never build
  inheritance hierarchies — compose factory functions instead.
- **Explicit dependency injection**: pass collaborators as function arguments, or close over them in a
  factory. There is no magic container — a single **composition root** (your entry module) wires the
  concrete implementations once.
- **One reactive primitive, deliberately chosen**: a tiny closure-based observable store (below) for
  app state, or **signals / atom-based stores** (e.g. `@preact/signals-core`, `nanostores`'
  atoms/computed, or a TC39 Signals polyfill) when you want fine-grained derivation. Pick one and keep
  state out of scattered module-level `let`s.
- **Strong typing**: `as const satisfies` for lookup maps, discriminated unions, branded ids, `readonly`.
- **Runtime validation** (zod/valibot) at every external boundary — network, storage, plugins, env.

## Pattern → Vanilla wiring

### Strategy → typed lookup map, resolved by key

Stateless strategies in an `as const satisfies` record; pick by key — no `switch`.

```ts
export interface PaymentStrategy {
  pay(amount: number): Promise<void>;
}

export const paymentStrategies = {
  stripe: stripeStrategy,
  paypal: paypalStrategy,
} as const satisfies Record<string, PaymentStrategy>;

export type PaymentMethod = keyof typeof paymentStrategies;

const strategy = paymentStrategies[method]; // typed, exhaustive, no switch
```

### Registry → self-registering map (validated when dynamic)

Plugins self-register into a module-level map; no central switch. Validate runtime/external plugins.

```ts
const registry = new Map<string, Plugin>();
export const registerPlugin = (p: Plugin): void => void registry.set(p.key, p);
export const getPlugin = (key: string): Plugin | undefined => registry.get(key);
// dynamic plugins: validate the shape with zod/valibot before registering
```

### Factory → factory function closing over dependencies

Isolate creation logic; return an interface, not a concrete class. Closures replace constructor DI.

```ts
export const createLogger = (env: Env): Logger => (env.production ? remoteLogger() : consoleLogger());

export const createOrderApi = (http: HttpClient): OrderApi => ({
  place: (cart: Cart): Promise<Order> => http.post('/orders', cart),
});
```

### Command → framework-agnostic use-case function

Encapsulate one action as a plain (async) function. Invoke it from an event handler, a CLI command, or
a store action — keep it independent of any caller.

```ts
// application/use-case — depends only on a port, not on the DOM/transport
export const checkoutCart = (orders: OrderApi, cart: Cart): Promise<Order> => orders.place(cart);
```

A store action is **not automatically** the Command — keep it a distinct use-case function the store action **delegates** to. Full rule + layering: catalog → _Command_.

### Adapter / DTO Mapping → pure `from`/`to` at the data boundary

Map DTO ↔ domain inside the api module; never let DTOs reach UI/render code.

```ts
// UserDto / User / userFromDto: see catalog -> Adapter / DTO Mapping
export const getUser = async (http: HttpClient, id: string): Promise<User> =>
  userFromDto(await http.get<UserDto>(`/api/users/${id}`));
```

### Composition → factory functions + closures + a composition root

Compose behavior by combining small functions; wire concrete dependencies once at the entry module.
No inheritance, no service locator.

```ts
// main.ts — composition root: build the graph explicitly, top-down
const env = loadEnv();
const http = createHttpClient(env.apiUrl);
const orders = createOrderApi(http);
const checkout = (cart: Cart) => checkoutCart(orders, cart);

mountApp({ checkout, cartStore });
```

### Singleton / shared state → a closure-based observable store

The common case for app-wide state without a framework: a single store instance exposing an immutable
snapshot, a `subscribe`, and actions. Keep the shape minimal; update immutably inside actions.

```ts
type Listener<S> = (state: S) => void;

export interface Store<S> {
  get(): S;
  subscribe(fn: Listener<S>): () => void;
}

const createStore = <S>(initial: S) => {
  let state = initial;
  const listeners = new Set<Listener<S>>();
  const set = (next: (s: S) => S): void => {
    state = next(state);
    for (const fn of listeners) fn(state);
  };
  const store: Store<S> = {
    get: () => state,
    subscribe: (fn) => (listeners.add(fn), () => void listeners.delete(fn)),
  };
  return { store, set };
};

// a concrete store: expose the readonly Store + named actions, hide `set`
export const createCartStore = () => {
  const { store, set } = createStore<{ items: readonly CartItem[] }>({ items: [] });
  const add = (item: CartItem): void => set((s) => ({ items: [...s.items, item] }));
  const total = (): number => store.get().items.reduce((sum, i) => sum + i.price, 0);
  return { ...store, add, total };
};
```

Prefer **signals / atom-based stores** (`@preact/signals-core`, `nanostores`' atoms/computed, a TC39
Signals polyfill) when you need fine-grained derived values and effects instead of re-deriving on each
`subscribe` notification.

## Cross-cutting vanilla practice

### Wire dependencies in a composition root

Construct the dependency graph once, at the entry module, and pass it down. Modules receive collaborators
as arguments — they never import concrete singletons or reach into a global container.

### Derive, don't duplicate

Compute derived values with pure functions (or `computed` signals). Never store the same fact twice and
keep it in sync by hand.

### Render from state

Drive the DOM from state: `subscribe` to the store (or run a signal effect) and re-render the affected
region. Keep render functions pure-of-logic — they read state and produce DOM, nothing else.

```ts
const unsubscribe = cartStore.subscribe((s) => renderCart(root, s));
```

### Async at the boundary

Use native `fetch` with an `AbortController` for cancellation; map DTO→domain in the api module. Surface
errors as typed results (`{ ok: true; value } | { ok: false; error }`) rather than throwing across layers.

### Keep modules cohesive

UI/DOM code renders and dispatches; api modules do IO and mapping; use-cases hold logic; the store holds
state. Don't mix transport, mapping, and business rules in one function.

## Vanilla Decision Matrix

| Problem                       | Recommended Solution                                          |
| ----------------------------- | ------------------------------------------------------------ |
| Shared app state              | closure observable store, or signals / atoms (@preact/signals-core, nanostores) |
| Derived value                 | pure function, or `computed` signal                          |
| Dependency injection          | function arguments / factory closures + a composition root   |
| Interchangeable behaviors     | Strategy (`as const satisfies` lookup map)                   |
| Plugin / extension system     | Registry (self-registering Map, zod for dynamic)             |
| Object creation with logic    | Factory (function closing over dependencies)                 |
| Reusable action               | Command (use-case function, store action delegates)          |
| API ↔ domain shape mismatch  | Adapter — fromDto / toDto in the api module                  |
| Cross-cutting behavior        | Composition (factories + closures + composition root)        |
| Async read / mutation         | native `fetch` + `AbortController`, map at the boundary       |
| DOM update                    | subscribe to store / signal effect → render the region       |
| Runtime data validation       | zod / valibot at the boundary                                |

## Anti-Patterns to Avoid

- inheritance hierarchies / abstract base classes — compose factory functions instead
- a service locator or hidden global container instead of an explicit composition root
- module-level mutable `let` state scattered across files instead of one store / signal
- mutating state in place instead of immutable updates inside actions
- business logic in DOM event handlers instead of use-case functions; DTOs leaking into render/DOM code
- string magic / `switch` on a type tag instead of an `as const satisfies` lookup map
- a Command merged into a store action when it must be reusable — keep it a distinct use-case the action delegates to
- god modules mixing transport + mapping + business rules; calling `fetch` from UI code — go through an api module
- `any`; magic strings; skipping runtime validation at external boundaries
