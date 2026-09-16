Modernize the small exported operations in input.ts while preserving their public contracts.
The deployment is Node 24.15.0, except groupOnLegacy, which is separately shipped to Node
18.0.0 without polyfills. Type declarations include ES2024. Use the repository's locked
TypeScript compiler. Keep signatures usable by the supplied clients.

Export `Policy = { mode: "fast" | "safe"; retries: number }` and `policy` with mode "fast"
and retries 0. Check that value against the public contract while preserving `policy.mode`
as the literal "fast" for consumers. Include a positive compiler client and a negative
client with a misspelled mode.

summarize preserves present false, zero and empty strings; missing options use the stated
defaults. ensureCache owns initialization, preserves an existing cache and calls create
only when needed. requiredLabel must reject an empty collection.

groupRows groups by string category, preserves row identity and order, returns a
null-prototype result and accepts arbitrary string keys. billableTotal excludes voided
rows: it is a public domain operation, also used outside this file. groupOnLegacy has the
same grouping result and remains compatible with its separately declared target.

parseCount is a public boundary: accept only an object with a finite numeric count and
reject malformed external values with TypeError.

lookupFirst is reused for many queries per batch. Keys in this fixture are caller-owned
objects or strings. Preserve the first value for duplicate keys, identity of object keys
and undefined for absent keys. Do not broaden its documented key domain for this task.

metadata attaches labels to caller-owned objects without owning their lifetime and does
not need enumeration. enumerableMetadata is a separate administrative view whose caller
requires the current keys.

sequence may have a very large limit; consumers commonly stop after two values. It reports
each value when produced and releases its resource through closed when consumption ends.

A browser module separately exports startOperation(target, onEvent, url). It starts a
fetch and listens to tick on the EventTarget until disposed. Return { finished, dispose }.
finished resolves to { status: "ok", text } on success or { status: "aborted" } on disposal;
unexpected failures reject. Completion, failure and repeated disposal must release the
subscription, and disposal must stop a pending fetch. Use a controlled same-origin endpoint.
