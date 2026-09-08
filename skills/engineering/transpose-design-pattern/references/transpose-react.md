# React Transposition — Design Patterns (TypeScript 2026)

Generic, portable React wiring for the patterns in [`pattern-catalog.md`](pattern-catalog.md).
Framework-specific only — keep business logic framework-agnostic in the catalog. Examples use
throwaway domains (user, cart, payment, order); substitute your own types. This guide states **common**
React practice, not any single project's house rules.

## React building blocks

The transpositions below lean on a few modern-React defaults (React 19+):

- **Function components + hooks** only — no class components, no `forwardRef` (in React 19 `ref` is a
  normal prop).
- **`<Context>` as its own provider** — `<ThemeContext value={…}>`, not `<ThemeContext.Provider>`.
  Consume with a typed custom hook (`useTheme()`), never raw `useContext` scattered in views.
- **The React Compiler does the memoization.** With it enabled, drop hand-written `useMemo` /
  `useCallback` / `React.memo` — keep them only where the compiler is off or you have a measured need.
- **Derive during render**, hold only source-of-truth state in `useState` / `useReducer`. Effects are
  for synchronizing with _external_ systems, not for computing values from props/state.
- **External shared state lives in a store** (Zustand), not in a high-frequency Context. Context is for
  dependency injection of stable services.
- **Strong typing**: typed props, discriminated unions for variants, `as const satisfies` for lookup
  maps, branded ids.

```tsx
const ThemeContext = createContext<Theme | null>(null);

export function useTheme(): Theme {
  const theme = use(ThemeContext); // React 19 reader — callable conditionally, unlike useContext
  if (!theme) throw new Error('useTheme must be used inside <ThemeContext>');
  return theme;
}
```

## Pattern → React wiring

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

To expose a registry to the tree, provide it once via Context and read it through a custom hook —
never reach into module singletons from components when the registry is request/tenant-scoped.

### Factory → factory function returning an abstraction

Isolate creation logic; return an interface, not a concrete class. A custom hook can be a factory of
React-bound values.

```ts
export const createLogger = (env: Env): Logger => (env.production ? new RemoteLogger() : new ConsoleLogger());
```

### Command → framework-agnostic use-case, optionally wrapped by an Action

Encapsulate one action as a plain (async) function in a framework-agnostic module. Invoke it from an
event handler, a store action, or — for form submission — a React 19 **Action**.

```ts
// application/use-case — no React imports
export const checkoutCart = (cart: Cart): Promise<Order> => orderApi.place(cart);
```

```tsx
// component: wrap the use-case in an Action for pending/optimistic state
const [order, submit, isPending] = useActionState<Order | null, FormData>(
  (_prev, formData) => checkoutCart(cartFromForm(formData)),
  null,
);
```

A Zustand action is **not automatically** the Command — keep the action a distinct framework-agnostic use-case (function) the store action **delegates** to. Full rule + layering: catalog → _Command_.

### Adapter / DTO Mapping → pure `from`/`to` at the data boundary

Map DTO ↔ domain inside the api client / query function; never leak DTOs into components or JSX.

```ts
// UserDto / User / userFromDto: see catalog -> Adapter / DTO Mapping
export const getUser = async (id: string): Promise<User> =>
  userFromDto(await api.get<UserDto>(`/api/users/${id}`));
```

### Composition → custom hooks + children/slots

Compose behavior through custom hooks and component composition (children, slot props) — not
inheritance, not mixins, not deep HOC stacks.

```tsx
function useTooltip(ref: RefObject<HTMLElement | null>) {
  /* attach/detach behavior, returns state */
}

function Card({ media, children }: { media?: ReactNode; children: ReactNode }) {
  return (
    <section>
      {media}
      {children}
    </section>
  ); // behavior composed via hooks + slots, no base class
}
```

### Singleton / shared state → a Zustand store exposing state + actions

The common case for app-wide state. Keep the shape minimal; mutate only through actions; **select
narrowly** so components re-render on the slices they read. Use `useShallow` for object/array selections
and derive in selectors (or in actions) rather than duplicating derived state.

```ts
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

interface CartState {
  items: readonly CartItem[];
  add: (item: CartItem) => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  add: (item) => set((s) => ({ items: [...s.items, item] })),
}));

// consume — narrow selector; derived value computed in the selector
const total = useCartStore((s) => s.items.reduce((sum, i) => sum + i.price, 0));
const { items, add } = useCartStore(useShallow((s) => ({ items: s.items, add: s.add })));
```

For app-wide _services_ (not reactive state), inject via Context + a typed hook. Reserve Context for
stable dependencies; route high-frequency state through the store to avoid re-rendering the subtree.

## Cross-cutting React practice

### Derive during render, not in effects

Compute values from props/state inline (the compiler memoizes). Do **not** mirror props into state with
`useEffect` + `setState`.

```tsx
// Bad: const [full, setFull] = useState(''); useEffect(() => setFull(`${first} ${last}`), [first, last]);
// Good:
const fullName = `${first} ${last}`;
```

### Effects only at external boundaries

`useEffect` is for synchronizing with systems outside React (subscriptions, timers, non-React widgets,
manual DOM). Always return a cleanup. Event-response logic belongs in the event handler, not an effect.

```tsx
useEffect(() => {
  const sub = socket.subscribe(onMessage);
  return () => sub.unsubscribe();
}, [socket]);
```

### Data fetching at the edge

Read promises with `use()` under `<Suspense>`, or use a cache (TanStack Query) for client data; fetch
on the server with Server Components / server functions where the framework supports them. Map DTO→domain
in the fetcher. Don't fetch in `useEffect` for primary data in new code.

### Let the compiler memoize

With the React Compiler enabled, do not hand-roll `useMemo` / `useCallback` / `memo`. Add them back only
when the compiler is disabled for a file or profiling proves a hot path.

### Keep components thin

Components render UI, bind state, dispatch actions. Push logic and mapping into hooks, the store, and
pure framework-agnostic functions.

### Forms via Actions

Prefer React 19 form **Actions** — `useActionState` for submit + result, `useFormStatus` for pending
UI, `useOptimistic` for optimistic updates. Keep validation rules in pure functions (zod/valibot) the
Action just calls. Controlled inputs remain fine for small, interactive forms.

### `ref` is a prop

Pass `ref` directly to function components (React 19) — do **not** write `forwardRef` in new code.

```tsx
function TextField({ ref, ...props }: { ref?: Ref<HTMLInputElement> } & InputProps) {
  return <input ref={ref} {...props} />;
}
```

### JSX SRP

No business logic in JSX. Move ternaries, multi-condition branches, and data-transforming calls into
derived consts (or selectors).

```tsx
// Bad: {user.isActive ? 'Active' : 'Inactive'}
const statusLabel = user.isActive ? 'Active' : 'Inactive';
// JSX: {statusLabel}
```

## React Decision Matrix

| Problem                       | Recommended Solution                                          |
| ----------------------------- | ------------------------------------------------------------ |
| Local component state         | useState / useReducer                                        |
| Derived value                 | compute during render (compiler memoizes)                    |
| Shared app state              | Zustand store + narrow selectors / useShallow                |
| Dependency injection          | Context + a typed custom hook (`<Context value>`)            |
| Interchangeable behaviors     | Strategy (`as const satisfies` lookup map)                   |
| Plugin / extension system     | Registry (self-registering Map, zod for dynamic)             |
| Object creation with logic    | Factory (factory function / hook returning an abstraction)   |
| Reusable action               | Command (framework-agnostic use-case, store/Action delegates) |
| API ↔ domain shape mismatch  | Adapter — fromDto / toDto in the fetcher                      |
| Cross-cutting behavior        | Composition (custom hooks + children/slots)                  |
| Data fetching                 | use() + Suspense / TanStack Query / Server Components         |
| Form                          | React 19 Actions (useActionState / useFormStatus / useOptimistic) |
| External system sync          | useEffect with cleanup                                        |
| Forwarding a ref              | `ref` as a normal prop (no forwardRef)                       |
| Memoization                   | React Compiler (no manual useMemo/useCallback)               |

## Anti-Patterns to Avoid

- class components; `forwardRef` in new code
- deriving state with `useEffect` + `setState`; storing derived data in `useState`
- fetching primary data in `useEffect` (use `use()` + Suspense / a query cache / the server)
- business logic in components; DTOs leaking into JSX; god hooks/components; string magic / `switch` on a type tag instead of an `as const satisfies` lookup map
- high-frequency global state in Context (re-renders the subtree) — use a Zustand store; reserve Context for DI
- selecting the whole store object without `useShallow` (re-renders on every change)
- hand-rolled `useMemo` / `useCallback` / `memo` noise when the React Compiler is enabled
- prop-drilling shared state deep instead of composition / a store
- a Command merged into a store action when it must be reusable — keep it a distinct use-case the action delegates to
- inheritance / mixins; `any`; magic strings; mutating props or store state outside actions
