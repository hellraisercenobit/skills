# Vitest adapter 1.0.0

Read alongside the applicable catalog rules. This is the only qualified runner adapter.
Detect versions from the lockfile and actual commands, not package ranges alone. Reference
profiles are Vitest 5.0.1/TypeScript 7.0.2 and Vitest 4/TypeScript 6; exact fixture versions
and reproducible commands live in the repository's [qualification guide](https://github.com/hellraisercenobit/skills/blob/main/tests/testing-patterns/README.md).
They are test targets, not an adoption claim or migration requirement. Sources checked
2026-09-16; verify support again for a different installed profile.

## Detect and route

Record runner, compiler/checker, Node/browser, Vite, module mode, strict options, transform,
type declarations and relevant configuration. Vitest 5 requires Node >=22.12 and Vite >=6.4.
Its clearMocks default clears histories, not implementations; inline projects inherit
root configuration; hoisted calls must be top level. Inspect migration differences before
copying configuration. Keep a compatible older project when upgrading adds no needed guarantee.

| Catalog families | Vitest transposition |
| --- | --- |
| TP-01/02/06/15 | Direct `test`/`it`, explicit assertions, reviewed snapshots only where useful |
| TP-03/04/08/10 | Typed `vi.fn`, `vi.spyOn`, port fake, shared real/fake contract |
| TP-05 | fast-check inside Vitest, replay seed/path and independent model |
| TP-07/16 | `vitest run`, actual reporter output, separate compiler command |
| TP-09/11 | Local factory first; context fixture/hooks for resource ownership |
| TP-12 | Compiler project/consumer tests or supported Vitest type-test mode |
| TP-13 | Awaited assertions, controlled clock/timers/barriers and cleanup |
| TP-14 | Node, DOM simulation or real Browser Mode according to the guarantee |

## Scenarios and resources

Use behavior names and the project's `test`/`it` convention. `test.each` or `test.for` can
clarify a typed table; no count threshold forces parameterization. For concurrent tests,
use context-bound `expect` where assertion/snapshot tracking requires the test context.

Plain factories suit simple fresh values. `test.extend` suits reusable resources with
explicit scope. Current fixture builders support named extension and `onCleanup`; older
profiles may require the documented `use` form. Register cleanup according to the installed
API, including partial setup and failure. Do not register multiple `onCleanup` callbacks
where only one is supported; split resources or combine teardown. Hooks and `try/finally`
are legitimate. `using`/`await using` require both transformation and runtime disposal support.

## Doubles and errors

Keep signatures typed, for example `vi.fn<(message: Message) => Promise<void>>()`.
`vi.mocked` supplies typing, not a runtime mock. Clear removes call history, reset changes
implementation state, restore restores originals for spies; confirm exact installed
behavior. Module mocking is justified only at the chosen seam. Use typed imports where
supported and respect hoisting. Native browser ESM namespaces are sealed; spying on an
export may require an appropriate supported module-spy strategy instead.

Error recipes must reject a wrong class/discriminant with the same message, missing
rejection and an accidental error. Message matching alone does not establish class.
For a stateful action inspect one observed error instead of invoking the action twice:

```ts
const outcome = await operation().then(
  value => ({ kind: 'resolved' as const, value }),
  (error: unknown) => ({ kind: 'rejected' as const, error }),
);
expect(outcome.kind).toBe('rejected');
if (outcome.kind !== 'rejected') throw new Error('Expected rejection');
expect(outcome.error).toBeInstanceOf(DomainError);
expect(outcome.error).toMatchObject({ code: 'LIMIT', message: 'Limit reached' });
```

Assert only fields that belong to the contract. The explicit guard also narrows TypeScript;
an ordinary matcher does not guarantee narrowing. `toThrowError` is deprecated in current
documentation. Execute recipes on each claimed profile instead of assuming matcher semantics.

## Async, time, properties and environments

Await/return promises and async matchers; a catch without guaranteed assertions permits
false green. Time as input or a controlled clock handles business time. Fake timers handle
schedulers, debounce and retry; advance tasks deliberately and restore timers even on
failure. To prove exclusion, force overlapping operations using controlled promises and
observe the contested effect. Timer advancement or a final total alone is insufficient.

Use fast-check when input space or histories justify it. Preserve shrinking result, seed
and replay path. Avoid a production algorithm copied into a reference model. Retain a
simple example where it is clearer.

Use Browser Mode for native browser contracts, with a real provider and engine recorded.
The Playwright provider is still Vitest, not Playwright Test. Await browser locators and
retrying assertions. Simulation remains valid for guarantees it faithfully models.
For HTTP, choose port fake, MSW, local server or real isolated service by the seam under
test. Fail visibly on unexpected requests and reset/close handlers. MSW is not a remote
provider contract proof.

## Commands and execution limits

Run the installed `vitest run` non-interactively and a checker command that actually
includes production and test files. Vitest runtime is not a typecheck; `expectTypeOf`
alone at runtime is no proof. TypeScript 7 tooling using the older programmatic API may
need a compatible TS6 checker. Inspect compiler included-file output when uncertain.

Map required scenario IDs to executed test identities and outcomes, not just exit code.
Expose `.skip`, `.todo`, `.fails`, filtering and retries. Honor the project's lint/build/
coverage gates; include relevant unimported files with coverage configuration. No invented
coverage threshold or mandatory mutation framework. Resource cases include failure cleanup.

Sources: [migration](https://vitest.dev/guide/migration/),
[test context](https://vitest.dev/guide/test-context),
[mocking](https://vitest.dev/guide/mocking),
[modules](https://vitest.dev/guide/mocking/modules),
[expect](https://vitest.dev/api/expect),
[types](https://vitest.dev/guide/testing-types),
[timers](https://vitest.dev/guide/mocking/timers),
[disposal](https://vitest.dev/guide/recipes/explicit-resources),
[browser](https://vitest.dev/guide/browser/),
[requests](https://vitest.dev/guide/mocking/requests),
[coverage](https://vitest.dev/guide/coverage).
