# Collections, memory and consumption

## MT-06 - Match the collection to its operations

**Intent/use:** choose object/Record for a known shape, Array for ordered positional data,
Map for dynamic associations and Set for membership/uniqueness. Examine repeated scans
that can share a maintained index.
**Alternatives/trade-offs:** a one-shot small scan can be clearer and cheaper; index build
and updates cost time and memory. Map/Set use SameValueZero and object identity; ordinary
object keys coerce non-symbols to strings. Account for insertion order, duplicate policy
(first/last/all), missing values and JSON boundaries.
**Avoid:** claiming universal speed or guaranteed constant time; rebuilding an index per
lookup; replacing a closed exhaustive typed table with an unchecked dynamic Map.
**Invariants:** keys, duplicate/order policy, outputs and updates stay consistent. Average
Map access is sublinear by specification, not a promise of a particular implementation.
**Sources/support:** [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map),
[Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set).
Verify newer methods separately.

## MT-07 - Match retention to ownership

**Intent/use:** WeakMap/WeakSet suit metadata or membership tied to caller-owned object
lifetimes when keys must not be retained solely by the association.
**Alternatives/trade-offs:** Map/Set plus explicit deletion for enumeration, size, eviction
or deterministic ownership. Bounded strong caches need expiry/eviction and invalidation.
**Avoid:** enumerating weak collections, relying on collection timing, testing by forced GC,
or claiming weak keys clean listeners/connections. Other strong references can retain keys.
Weak-key types beyond objects require a separate compatibility check.
**Invariants:** get/set/has/delete behavior is observable without GC; resource cleanup is
explicit; no false enumeration, persistence or deterministic finalization guarantees.
**Sources/support:** [WeakMap](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap),
[WeakSet](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet).

## MT-08 - Produce only what is consumed

**Intent/use:** iterable/iterator protocols, function*, yield/yield* and async generators
can avoid a full intermediate result when only a prefix is consumed. Use for await...of
for asynchronous production; evaluate iterator helpers only where supported.
**Alternatives/trade-offs:** arrays serve replay, random access and small bounded results.
Generators defer side effects/errors and are usually consumed once per iterator. Streams
add backpressure and cancellation semantics (MT-10).
**Avoid:** making synchronous yield a UI-scheduling claim; hidden retained resources;
changing iteration error timing without consent; materializing immediately without benefit.
**Invariants:** counter shows no unrequested production; early break/return closes a
started iterator and reaches appropriate finally cleanup; exhaustion/error/replay contract
is explicit. A generator abandoned without close does not promise deterministic cleanup.
**Sources/support:** [generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*),
[iteration protocols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols),
[for await...of](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of).
Check compiler downlevel iteration and runtime symbols/helpers separately.
