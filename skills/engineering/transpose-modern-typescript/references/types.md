# Types and abstractions

## MT-17 - Preserve useful inference and verify contracts

**Intent/use:** use inference for local values, satisfies to check assignability while
retaining useful inferred information, as const for literal/readonly intent, and const type
parameters where a reusable generic needs literal inference.
**Alternatives/trade-offs:** an annotation can deliberately expose a stable public shape;
ordinary generics often suffice. Contextual typing still affects inferred expressions with
satisfies. An identity helper can carry real constraints, not just old compiler workarounds.
**Avoid:** assertions posing as checks, readonly tuples where callers need mutation, or
advanced types solely to display modern syntax.
**Invariants:** valid examples compile; invalid contract examples fail for the intended
reason; callers retain the useful inferred distinctions without undocumented casts.
**Sources/support:** [satisfies](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html),
[const type parameters](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html).
Use the project's actual stable compiler, not a version prescribed by this catalog.

## MT-18 - Represent states and narrow truthfully

**Intent/use:** discriminated unions model mutually exclusive states; narrow with real
runtime checks and use never/exhaustiveness when every closed variant must be handled.
**Alternatives/trade-offs:** independent flags represent independent facts; plain branches
can be the simplest closed-set implementation. Public wire formats may need adaptation.
**Avoid:** non-null assertions hiding absence, predicates that lie, truthiness dropping
valid zero/empty-string values, or a default swallowing a new required variant.
**Invariants:** impossible combinations rejected, all required variants covered, optional
and falsy values distinguished; runtime guards agree with their type claim.
**Source/support:** [narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html);
check strictNullChecks and actual compiler behavior.

## MT-19 - Remove mechanisms only when their contract is redundant

**Intent/use:** compare transparent wrappers/polyfills/identity helpers with supported
native constructs. Remove avoidable code when the native expresses the full contract.
**Alternatives/trade-offs:** retain a business abstraction, stable public facade, observability,
validation or compatibility boundary even if its body is short; consider an existing
library before rebuilding its guarantees.
**Avoid:** deleting a helper merely because it wraps a native; automatic dependency bans
or polyfills; forcing reduce/loops/classes/enums into a single preferred style.
**Invariants:** callers, public types, domain meaning, errors, security and runtime targets
remain valid. A retained helper explains its extra contract; a replacement demonstrates
semantic equivalence at the public seam.
**Sources/support:** the selected native's exact reference, plus the actual helper's public
contract and package/runtime support. For pure syntax, see MT-01..05; for types, MT-17.

## MT-20 - Validate external facts before trusting types

**Intent/use:** unknown at untrusted boundaries, followed by runtime validation/narrowing.
Use a proven schema library or small truthful guard according to the payload complexity.
Brands distinguish otherwise interchangeable domain identities after construction/validation.
**Alternatives/trade-offs:** existing trusted decoders can establish proof; localized
assertions can express a fact the compiler cannot carry, with that proof identified.
**Avoid:** JSON.parse/fetch cast directly to a domain type, double casts, unvalidated brands,
any erasing obligations, or a brand claimed as authentication/runtime protection.
**Invariants:** representative malformed input is rejected; valid data reaches a correctly
typed domain value; validation and type claims agree.
**Sources/support:** [unknown](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html),
[narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html).
Static annotations and brands are erased; they do not install runtime validation.

## MT-21 - Derive types without hiding the contract

**Intent/use:** readonly inputs prevent accidental writes through that type; standard
utility types and template literal types can derive meaningful keys/contracts.
**Alternatives/trade-offs:** named simple types often communicate better; explicit stable
public types can avoid leaking implementation details. Track inference/editor/compiler cost.
**Avoid:** claiming deep runtime immutability from readonly/as const, recursive type puzzles
without useful guarantees, or turning two meaningful IDs into one unbranded string API.
**Invariants:** required readonly restrictions and derived keys checked by the compiler;
runtime mutation/freeze claims verified separately; public types remain understandable.
**Sources/support:** [object types](https://www.typescriptlang.org/docs/handbook/2/objects.html),
[template literals](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html),
[utility types](https://www.typescriptlang.org/docs/handbook/utility-types.html).

## MT-24 - Keep the type information the change already carries

**Intent/use:** a transposition that keeps a call's runtime behavior can still lose what the
compiler knew about it. Compare the type before and after: a literal or template-literal type
widened to `string`, a discriminated union collapsed to its base object, a tuple flattened to
an array, a `readonly` dropped, a generic parameter erased, an inferred key set replaced by
`string`, or an assertion standing in for a narrowing the compiler could have done.
**Alternatives/trade-offs:** losing type information can be the right call - a simpler public
type, a boundary that must accept unvalidated input, a native API whose declarations are
looser than the helper it replaces. Then it is a named trade-off with the guarantee it costs,
not an unmentioned side effect. `satisfies` often keeps the narrow type while checking the
wide contract; an overload or a generic can carry a relation a widened signature drops.
**Avoid:** an `as` that restores by assertion what the change widened, a signature whose
callers now need their own casts, exhaustiveness that stops being checked because the
discriminant is gone, and a record that claims the contract is unchanged when a consumer's
compile-time guarantee is gone.
**Invariants:** the record names each type-information change and the guarantee it trades;
consumer-facing narrowing that survives is verified by the compiler, on consumer code where
one exists, not asserted in prose.
**Sources/support:** [satisfies](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator),
[narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html),
[type assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions).
