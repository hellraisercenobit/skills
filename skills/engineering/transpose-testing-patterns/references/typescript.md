# TypeScript guarantees

Applies TP-12/15/16. Identify the actual compiler/checker, declarations, module mode,
strict options, transform and runtimes. Keep these three checks distinct:

| Check | Proves | Does not prove |
| --- | --- | --- |
| Runtime tests | Exercised observable behavior | Compilation or preserved inference |
| Compile production and tests | Compatibility with configured types/options | All consumer guarantees or runtime support |
| Consumer type tests | Significant valid/forbidden uses and inference | Validation of network input or runtime immutability |

Protect meaningful literals/inference, const generics, discriminated unions, exhaustivity,
narrowing, overloads, brands and optionality. Use positive counterparts for negative cases.
Keep invalid static calls in checker-only files. For `@ts-expect-error`, give a concise why
and verify the intended diagnostic without the directive in an isolated probe; a typo or
missing import can otherwise satisfy the directive. Do not run invalid static-only calls
as runtime tests. An unused directive must fail the checker.

Prefer typed factories and structural doubles. Do not reach for `satisfies` unless the
installed compiler already supports it and a typed factory is not enough. Avoid
`any`, `as unknown as` or suppressions used to conceal an invalid contract.
Construct malformed inputs at `unknown`, where validation belongs. A brand does not validate an
external string and `readonly` does not freeze or defensively copy an object.

Ordinary runtime matchers do not necessarily narrow types. Use a genuinely typed assertion
such as a supported `expect.assert` or a small `asserts` function when later code needs
narrowing and the compiler profile supports it; do not hide the issue with `!`.

Where observable, test Map/Set key identity, duplicate policy and promised iteration order;
test partial generator consumption and closure without prescribing their private data
structure. The modern-typescript dimension owns the implementation idiom choice.

Vitest runtime transforms do not typecheck by default; `expectTypeOf` is not a runtime
type proof. Check the installed runner's type-test command or run a dedicated compiler
project including production, runtime tests and separate consumer cases. Inspect included
files. TypeScript 7's native compiler and tools depending on the TypeScript 6 programmatic
API can require different compatible configurations. Never force an upgrade from a
qualification fixture's version.

Sources: [Vitest type testing](https://vitest.dev/guide/testing-types),
[narrowing](https://vitest.dev/guide/recipes/type-narrowing),
[TypeScript 7](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/).
