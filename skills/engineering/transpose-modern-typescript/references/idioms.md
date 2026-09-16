# Everyday idioms

Apply MT-23 to every feature's actual target support.

## MT-01 - Extract and construct values clearly

**Intent/use:** repeated properties from the same stable object, tuples or parameters can
use shallow destructuring; use shorthand, rest or spread when they express the exact shape
with less bookkeeping. Prefer `const { id, name } = user` over repeated stable extractions.
**Alternatives/trade-offs:** direct access preserves provenance; explicit copies expose a
boundary. Destructuring defaults cover undefined, not null. Spread/rest copy own enumerable
properties shallowly; they are not cloning or sanitizing arbitrary objects.
**Avoid:** deep cryptic patterns, extracting a method that needs its receiver, changing getter
count/order or reactive read timing. Do not blanket-destructure framework state.
**Invariants:** identical values, identity/copy depth, property evaluation and receiver behavior.
**Sources/support:** [destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring),
[spread](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax);
check syntax transforms and the project's reactivity contract.

## MT-02 - Default only for the intended absence

**Intent/use:** choose `value ?? fallback` when only null/undefined mean absent; remove verbose
nullish ternaries. Preserve 0, false and empty string.
**Alternatives/trade-offs:** `||` is correct for deliberate falsy fallback; a destructuring
default applies only to undefined. Explicit branching is appropriate when outcomes differ.
**Avoid:** replacing a domain truthiness rule mechanically, hiding required data, or changing
fallback laziness. Parenthesize mixtures with logical operators as required by the grammar.
**Invariants:** test null, undefined, 0, false and empty string against the original contract.
**Source/support:** [nullish coalescing](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing);
parser/transpiler support is separate from library APIs.

## MT-03 - Initialize a mutable location once

**Intent/use:** `state.items ??= createItems()` expresses intentional nullish initialization.
**Alternatives/trade-offs:** explicit condition for distinct null/undefined cases; immutable
replacement when ownership forbids mutation. A getter/setter is observable code.
**Avoid:** `||=` if false/0/empty string is valid; eager fallback construction; assuming
`x ??= y` and `x = x ?? y` have the same setter behavior.
**Invariants:** existing collection identity survives; default is lazy; target evaluation
and setter calls match the intended contract; mutation is owned by this operation.
**Source/support:** [nullish assignment](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_assignment);
check build transform and access effects.

## MT-04 - Chain genuinely optional access

**Intent/use:** choose `object?.property`, `callback?.()`, `items?.[index]` or
`items?.[index]?.label` when the corresponding location may legitimately be absent.
**Alternatives/trade-offs:** required data uses validation or an explicit failure; a branch
can distinguish absence causes. `items?.map(f) ?? []` is valid only if absent and empty
collections mean the same thing. Optional calls still require a callable present value.
**Avoid:** masking a required item, treating optional chaining as external-data validation,
losing receiver binding or changing side effects in index/call arguments.
**Invariants:** container/element/property absence are separate; index zero and empty arrays
work; required absence still fails; short-circuit effects remain intentional.
**Source/support:** [optional chaining](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining);
check parser/transpiler and framework reads.

## MT-05 - Use a collection operation that states the result

**Intent/use:** examine find/some/every for early termination, flatMap for zero-to-many
results, entries/fromEntries/hasOwn for object operations, groupBy for grouping,
toSorted/toReversed/toSpliced/with for non-mutating array changes and native Set operations.
**Alternatives/trade-offs:** loops and reduce are sound for combined passes, custom state or
clearer control flow. Avoid a chain that creates unnecessary arrays. A transparent helper
may disappear only after MT-19's public/domain contract check.
**Avoid:** equating grouping with arbitrary aggregation; changing sparse-array visitation,
mutation, duplicate order, key coercion or missing-group behavior. Object.groupBy returns a
null-prototype object with property keys; Map.groupBy preserves arbitrary key identity.
**Invariants:** output values/order/keys, duplicate policy, own-property/prototype semantics,
input mutation and empty/missing cases match the contract.
**Sources/support:** [array methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array),
[Object.groupBy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy),
[Map.groupBy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/groupBy).
Check each method, not just Array/Map support.
