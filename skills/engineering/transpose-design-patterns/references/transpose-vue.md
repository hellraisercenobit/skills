# Vue Transposition — Design Patterns (TypeScript 2026)

Generic, portable Vue wiring for the patterns in [`pattern-catalog.md`](pattern-catalog.md).
Framework-specific only — keep business logic framework-agnostic in the catalog. Examples use
throwaway domains (user, cart, payment, order); substitute your own types. This guide states **common**
Vue practice, not any single project's house rules.

## Vue building blocks

The transpositions below lean on a few modern-Vue defaults (Vue 3.4+/3.5+):

- **`<script setup lang="ts">` + Composition API** only — no Options API, no mixins in new code.
- **`ref` / `computed`** for reactive state; prefer `ref` for primitives and `computed` for derived
  values. Reach for `reactive` only for cohesive objects, and read it without destructuring.
- **`defineModel()`** for two-way binding instead of a manual `modelValue` prop + `update:modelValue`
  emit; **`useTemplateRef()`** for template refs; **reactive props destructure** (3.5, with defaults).
- **Composables (`useXxx`)** for reusable, composable logic — the Vue unit of composition (VueUse for
  common ones). Keep them small and focused.
- **Typed DI** via `provide` / `inject` with an `InjectionKey<T>`, consumed through a custom composable.
- **Strong typing**: `defineProps`/`defineEmits` generics, discriminated unions for variants,
  `as const satisfies` for lookup maps, branded ids.

```ts
// di.ts
export const ANALYTICS = Symbol() as InjectionKey<Analytics>;

// useAnalytics.ts
export function useAnalytics(): Analytics {
  const a = inject(ANALYTICS);
  if (!a) throw new Error('ANALYTICS not provided');
  return a;
}
```

## Pattern → Vue wiring

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

Plugins self-register into a module-level map; no central switch. Validate runtime/external plugins with
zod/valibot. When the registry is request/tenant-scoped, `provide` it and read it through a composable
instead of importing the module singleton.

```ts
const registry = new Map<string, Plugin>();
export const registerPlugin = (p: Plugin): void => void registry.set(p.key, p);
export const getPlugin = (key: string): Plugin | undefined => registry.get(key);
```

### Factory → factory function returning an abstraction

Isolate creation logic; return an interface, not a concrete class. A composable can be a factory of
reactive-bound values.

```ts
export const createLogger = (env: Env): Logger => (env.production ? new RemoteLogger() : new ConsoleLogger());
```

### Command → framework-agnostic use-case, invoked from a handler or store action

Encapsulate one action as a plain (async) function in a framework-agnostic module. Invoke it from an
event handler or a Pinia action.

```ts
// application/use-case — no Vue imports
export const checkoutCart = (cart: Cart): Promise<Order> => orderApi.place(cart);
```

A Pinia action is **not automatically** the Command — keep the action a distinct framework-agnostic use-case (function) the store action **delegates** to. Full rule + layering: catalog → _Command_.

### Adapter / DTO Mapping → pure `from`/`to` at the data boundary

Map DTO ↔ domain inside the api client / composable; never leak DTOs into components or templates.

```ts
// UserDto / User / userFromDto: see catalog -> Adapter / DTO Mapping
export const getUser = async (id: string): Promise<User> =>
  userFromDto(await api.get<UserDto>(`/api/users/${id}`));
```

### Composition → composables + slots + provide/inject

Compose behavior through composables and component composition (slots, `provide`/`inject`) — not
inheritance, not mixins.

```vue
<script setup lang="ts">
const { visible } = useTooltip(); // behavior via composable
</script>

<template>
  <section>
    <slot name="media" />
    <slot />
  </section>
</template>
```

### Singleton / shared state → a Pinia setup store

The common case for app-wide state. Use a **setup store** (function form): `ref` for state, `computed`
for getters, functions for actions; mutate only through actions. Consume with `storeToRefs` so the
destructured state/getters stay reactive.

```ts
import { defineStore } from 'pinia';

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([]);
  const total = computed(() => items.value.reduce((sum, i) => sum + i.price, 0));
  const add = (item: CartItem): void => void items.value.push(item);
  return { items, total, add };
});

// consume
const cart = useCartStore();
const { items, total } = storeToRefs(cart); // reactive
cart.add(item); // actions destructure directly
```

For app-wide _services_ (not reactive state), inject via `provide` / `inject` + a typed composable.

## Cross-cutting Vue practice

### computed for derived state, not watchers

Derive with `computed`. Do **not** use a `watch` that writes into another `ref` to compute a value.

```ts
// Bad: watch([first, last], () => (full.value = `${first.value} ${last.value}`))
const fullName = computed(() => `${first.value} ${last.value}`);
```

### Watchers only at external boundaries

`watch` / `watchEffect` are for side effects that sync with systems outside Vue (persistence, analytics,
non-Vue widgets). Register teardown with `onWatcherCleanup` (3.5). Event-response logic belongs in the
handler, not a watcher.

```ts
import { onWatcherCleanup } from 'vue';

watchEffect(() => {
  const sub = socket.subscribe(onMessage);
  onWatcherCleanup(() => sub.unsubscribe()); // 3.5 — also available as the callback's onCleanup arg
});
```

### Async at the edge

Default to a composable (TanStack Query Vue, or a framework helper like Nuxt `useAsyncData`); or —
accepting that `<Suspense>` is still an **experimental** API (it may change before stabilizing) —
`<Suspense>` + top-level `await` in `<script setup>`. Map DTO→domain in the fetcher; route API calls
through a composable/store rather than calling the HTTP client from a component.

### Two-way binding with defineModel

For a value mirroring a parent binding, use `defineModel()` — not a manual `modelValue` prop plus an
`update:modelValue` emit, and not a `watch` to sync.

```ts
const value = defineModel<string>();
```

### Keep components thin

Components render UI, bind state, dispatch actions. Push logic and mapping into composables, the store,
and pure framework-agnostic functions.

### Template SRP

No business logic in templates. Move ternaries, multi-condition branches, and data-transforming calls
into `computed`.

```ts
// Bad (template): {{ user.isActive ? 'Active' : 'Inactive' }}
const statusLabel = computed(() => (user.value.isActive ? 'Active' : 'Inactive'));
// template: {{ statusLabel }}
```

### Forms

Bind with `v-model` / `defineModel`. Keep validation rules in pure functions (zod/valibot) the form just
calls; a library (VeeValidate) wires them to fields when forms get large.

## Vue Decision Matrix

| Problem                       | Recommended Solution                                          |
| ----------------------------- | ------------------------------------------------------------ |
| Local component state         | ref / reactive (objects)                                     |
| Derived value                 | computed                                                      |
| Shared app state              | Pinia setup store + storeToRefs                              |
| Dependency injection          | provide / inject + InjectionKey + a typed composable         |
| Interchangeable behaviors     | Strategy (`as const satisfies` lookup map)                   |
| Plugin / extension system     | Registry (self-registering Map, zod for dynamic)             |
| Object creation with logic    | Factory (factory function / composable)                      |
| Reusable action               | Command (framework-agnostic use-case, store action delegates) |
| API ↔ domain shape mismatch  | Adapter — fromDto / toDto in the fetcher / composable        |
| Cross-cutting behavior        | Composition (composables + slots + provide/inject)           |
| Async read / mutation         | composable (TanStack Query / useAsyncData) — or `<Suspense>` (experimental) + await |
| Two-way binding               | defineModel()                                                |
| Template ref                  | useTemplateRef()                                             |
| External system sync          | watch / watchEffect with onWatcherCleanup                    |
| Form                          | v-model / defineModel + pure validators (zod/valibot)        |

## Anti-Patterns to Avoid

- Options API or mixins in new code (use `<script setup>` + composables)
- deriving state in a `watch` that writes a `ref` instead of using `computed`
- destructuring a `reactive` object (loses reactivity) — use `ref` + `computed`, or `toRefs` / `storeToRefs`
- mutating props; mutating store state outside actions
- business logic in templates; DTOs leaking into templates; string magic / `switch` on a type tag instead of an `as const satisfies` lookup map
- god composables/components; calling the HTTP client from a component — go through a composable/store
- manual `modelValue` prop + `update:modelValue` emit instead of `defineModel`
- a Command merged into a Pinia action when it must be reusable — keep it a distinct use-case the action delegates to
- inheritance-heavy code; `any`; magic strings; global mutable singletons outside Pinia
