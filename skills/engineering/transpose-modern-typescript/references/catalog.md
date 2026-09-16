# Modern TypeScript catalog 1.0.0

One normative source per rule; the files below are owned by transpose-modern-typescript.
The record schema enumerates these stable IDs. Review signatures only point here.
Rules apply to JS as well as TS unless explicitly about static types.

## Inventory axes

For every scope, mark each axis applicable with sites, or excluded with a reason:
`idioms`, `data-access`, `consumption`, `lifetime`, `async`, `platform`,
`types`, `modules`. Examine all relevant sites, not only easy replacements.
Prefer supported language/platform capabilities when they remove avoidable work or
mechanism while preserving the complete contract. Current code is always an alternative.

| Need or signal | Read |
| --- | --- |
| Repeated extraction, guards, array access, accumulation | [Everyday idioms](idioms.md), MT-01..05 |
| Repeated lookup, membership, object metadata, partial consumption | [Collections and lifetime](collections.md), MT-06..08 |
| Async coordination, network flow, parsing, copying | [Platform](platform.md), MT-09..12 |
| DOM observation, rendering, workers, storage, security | [Platform](platform.md), MT-13..16 |
| Inference, states, helpers, boundaries, mutability | [Types and abstractions](types.md), MT-17..21 |
| Imports, runtime targets or any uncertain feature | [Compatibility](compatibility.md), MT-22..23 |

## Decision discipline

Every rule specifies intent, use conditions, alternatives/trade-offs, avoid cases,
observable invariants and compatibility sources. Read those clauses together. No rule
requires syntax for its own sake or guarantees native code is faster. A Minor finding can
identify concrete avoidable code, even without a bug, after its strongest defense fails.
Claim measured speed only with a relevant measurement. Account for index construction,
allocation, retained memory, serialization, cleanup, editor cost and public compatibility.

`none` is a valid decision when no specialized transposition improves the scoped contract.
Explain why plausible candidates do not help and what would reopen the choice. It can mean
writing simple code, retaining a domain helper or using an ordinary loop. It is not the
same as `retain` (an action), or an entirely non-applicable dimension.
