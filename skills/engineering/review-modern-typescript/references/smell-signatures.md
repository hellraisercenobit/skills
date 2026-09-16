# Detection leads

Resolve each rule in the transpose companion and steelman the choice. This table is not a
second catalog. Search results require contextual inspection.

| Lead | Rules | Defense to try |
| --- | --- | --- |
| Repeated extractions, verbose object reconstruction | MT-01 | Getters, read timing, reactive tracking, receiver binding, provenance |
| Null-only ternary, falsy default, repeated initialization | MT-02, MT-03 | Intentional falsy semantics, mutation forbidden, setter effects |
| Nested optional arrays, indices, items and calls | MT-04 | Required values must fail; callable/type checks still needed |
| Manual grouping/search, transparent helper | MT-05, MT-19 | Domain meaning, public contract, prototype/order/hole differences |
| Repeated scans, string-coerced dictionary keys | MT-06 | Small one-shot data, index cost, duplicate policy, serialization |
| Object metadata retained globally, unbounded cache | MT-07 | Enumeration, deterministic cleanup, other strong references |
| Eager sequence only partly consumed | MT-08 | Replay/random access, small data, error timing |
| Manual resolvers, races without cancellation | MT-09 | Structured async, bounded concurrency, cancellation propagation |
| Full fetch buffering, polling streams | MT-10 | Atomic payload, replay/retry contract, support |
| Manual URL/locale parsing or formatting | MT-11 | Domain grammar, security allowlist, locale differences |
| JSON clone, binary copies, repeated message data | MT-12 | Custom serialization, noncloneable types, transfer ownership |
| DOM polling, global listeners, repeated layout work | MT-13 | Framework ownership, notifications, timing, accessibility |
| Sync yield claimed to give UI time | MT-14 | Worker startup/transfer exceeds work; supported task slicing |
| Ad hoc persistence/coordination/random IDs | MT-15, MT-16 | Consistency, quotas, threat model, secure context |
| Identity helper or annotation erasing inference | MT-17 | Stable API, intentional widening, understandable diagnostics |
| Flags creating impossible states | MT-18 | Independent facts, public representation, exhaustive branches |
| External cast or dishonest predicate | MT-20 | Independently validated boundary with localized proof |
| readonly claimed to freeze, type puzzles | MT-21 | Runtime freeze, useful derived contract, editor/compiler cost |
| API or import justified only by TS lib | MT-22, MT-23 | Actual transpiler, loader, runtime and consumers |

Read data flow and lifetime too, not only old syntax. Useful loops, helpers, classes, enums
and explicit branches can be SOUND.
