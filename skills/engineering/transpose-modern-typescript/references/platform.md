# Native platform capabilities

Apply MT-23 per API and target: browser, worker, server and secure-context support differ.
Native does not mean interchangeable with a library. Each rule compares the existing
contract before replacing a mechanism.

## MT-09 - Express asynchronous coordination and cancellation

**Intent/use:** choose async/await and Promise combinators by failure/concurrency semantics.
Promise.withResolvers suits bridging an externally settled operation when that lifecycle
is real; AbortController/AbortSignal can propagate cancellation across supporting APIs.
**Alternatives/trade-offs:** a plain async function or Promise constructor may suffice.
Bound concurrency for resource-limited work; Promise.all starts no tasks by itself and
does not cancel losing operations. AbortSignal.any/timeout need their own support checks.
**Avoid:** exposed resolvers without settlement ownership, unhandled rejections, races
mistaken for cancellation, or cleanup only on success.
**Invariants:** correct success/failure/abort results; release listeners/resources on all
exit paths; aborted work cannot publish a stale result.
**Sources:** [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise),
[withResolvers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers),
[AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal).

## MT-10 - Consume network data with its actual flow contract

**Intent/use:** Fetch, Request/Response, Headers and FormData replace redundant HTTP
plumbing; Readable/Transform/WritableStream suit progressive producers and consumers.
**Alternatives/trade-offs:** a mature client can carry retries, auth, caching and validation;
buffering small atomic data is legitimate. Backpressure depends on producer cooperation.
**Avoid:** forgetting fetch HTTP-status checks, consuming a body twice, retrying a
non-replayable stream, or canceling a consumer without handling the producer.
**Invariants:** response/errors/status handling preserved; ownership of body/reader locks,
abort and cleanup explicit; partial consumption does not silently buffer the whole input.
**Sources:** [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch),
[Streams](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API).
Check the exact runtime's fetch/stream and upload behavior.

## MT-11 - Use standard parsing and text services for standard formats

**Intent/use:** URL/URLSearchParams for URLs and query data, Intl for locale-aware operations,
TextEncoder/TextDecoder for byte/text boundaries.
**Alternatives/trade-offs:** business grammars and nonstandard encodings may require a
library; URL normalization and locale output can differ from manual strings.
**Avoid:** treating URL parsing as destination authorization, interpolating unencoded query
data, or asserting identical locale output across engines without that requirement.
**Invariants:** origin/base, duplicate/empty query values, locale/time zone and encoding
error policy are explicit; security checks survive helper removal.
**Sources:** [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL),
[Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl),
[Encoding](https://developer.mozilla.org/en-US/docs/Web/API/Encoding_API).
Check exact Intl features and deployed locale data.

## MT-12 - Make copy and transfer ownership explicit

**Intent/use:** structuredClone for supported structured values; ArrayBuffer, typed arrays
and Blob for binary data; transfer ownership when it avoids a meaningful copy.
**Alternatives/trade-offs:** shallow spread, serialization or domain-specific copying can
be the right contract. A transfer's sender loses access to that transferable resource.
**Avoid:** treating JSON serialization as a general clone, expecting functions/prototypes
to survive structured cloning, transferring a buffer still owned by another consumer.
**Invariants:** supported data types, identity, copy depth and source usability are tested;
serialization format is deliberate; no unsupported universal performance claim.
**Sources:** [structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone),
[transferables](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects).
Check API availability in the actual execution context.

## MT-13 - Let the browser observe and manage browser state

**Intent/use:** EventTarget options (signal/once/passive), event delegation, Intersection/
Resize/MutationObserver, requestAnimationFrame, Web Animations and semantic HTML controls
can remove custom listener/polling/rendering mechanisms.
**Alternatives/trade-offs:** framework effects own DOM/state lifetime; polling can be
necessary where observation semantics do not cover the requirement. Observers notify
according to their own timing, not as a synchronous query replacement.
**Avoid:** DOM writes outside framework ownership, passive listeners calling preventDefault,
observer feedback loops, inaccessible custom controls or forgotten disconnect/abort/cancel.
**Invariants:** correct event/notification timing, accessibility, cleanup and no stale work
after disposal. rAF aligns visual work; it is not a guaranteed background scheduler.
**Sources:** [addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener),
[IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API),
[ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/Resize_Observer_API),
[MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver),
[Web Animations](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API).
Check exact options/components and framework lifecycle.

## MT-14 - Choose scheduling by responsiveness and ownership

**Intent/use:** workers, message channels, transferable data or supported task scheduling
can move/split demonstrably blocking work.
**Alternatives/trade-offs:** startup, serialization and coordination can exceed small work;
task chunks on the main thread may suffice. Scheduler APIs require specific target checks.
**Avoid:** synchronous yield or a microtask loop claimed to guarantee rendering time,
worker use where direct DOM access is required, unbounded queued messages.
**Invariants:** responsive observable flow, cancellation/termination, data ownership and
error propagation; measured speed claims include startup/transfer costs.
**Sources:** [workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers),
[Scheduler](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler).

## MT-15 - Match persistence and coordination guarantees

**Intent/use:** IndexedDB for structured transactional storage, Cache Storage for request/
response caching, BroadcastChannel for cross-context messages and Web Locks for supported
origin-scoped coordination.
**Alternatives/trade-offs:** small synchronous storage or a server may satisfy a simpler/
stronger contract; quotas, eviction, partitioning and private-mode behavior matter.
**Avoid:** claiming durable delivery from broadcast, treating cache storage as a transactional
database, assuming a lock spans servers/devices, or blocking UI with large synchronous writes.
**Invariants:** consistency, error/eviction behavior, transaction lifetime and cleanup are
explicit; persistence guarantees are no stronger than the actual environment.
**Sources:** [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API),
[CacheStorage](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage),
[BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API),
[Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API).
Check secure contexts, worker exposure and supported versions separately.

## MT-16 - Use security primitives for their precise guarantee

**Intent/use:** Web Crypto for appropriate cryptographic randomness/operations and textContent
or native text insertion for plain text.
**Alternatives/trade-offs:** a vetted library is appropriate when native algorithms/formats
do not cover the protocol; rich HTML requires a deliberate sanitization/trusted-content policy.
**Avoid:** Math.random for security-sensitive tokens, handwritten cryptography, URL parsing
or type brands mistaken for validation/authorization, plain text routed through innerHTML.
**Invariants:** the threat-relevant contract survives refactoring; randomness/algorithm/
encoding and trust boundaries are explicit; no broad safety claim from API choice alone.
**Sources:** [Web Crypto](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API),
[textContent](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent).
Check algorithm and secure-context support, not only the crypto global.
