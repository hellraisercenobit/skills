# Decision records

Schema/catalog/contract version: 1.0.0. [Example](record.example.json) is illustrative, not
evidence for a real project. Use a JSON Schema 2020-12 validator such as Ajv 2020 or
python-jsonschema; validation is not semantic approval.

Write outside the repository before the first affected implementation write. Keep original
revisions, with previous path and the reason for revision. Date/source claims must come
from actual evidence. Record every inventory axis; applicable axes identify sites, excluded
axes explain why they are irrelevant. A coherent site group can share a decision.

Every site carries rule IDs, alternatives (including current), choice, mechanism, action,
reason/trade-offs/reconsider trigger, benefits with evidence, artifacts and invariants.
Use rule IDs as idiom IDs, naming the actual operation in the reason/artifact. An explicit
none has an empty idiom list and a substantive reason/reconsider trigger. It may apply
straightforward new code or retain an existing helper. Retaining a suitable native choice
can use choice idioms plus action retain. Non-applicable dimensions have no sites and are
reported separately, not by manufacturing an empty valid record.

Benefits distinguish readability/maintenance/safety, algorithmic work, allocations and
measured timing. A measurement needs its workload, command and result; a structural benefit
does not become a timing claim. Record evaluation effects, data identity, error behavior,
resource lifetime and other observable semantic differences.

The schema verifies structure and known IDs. The builder/reviewer still verify meaningful
alternatives, honest exclusions, actual dates/targets, consistency of rules with choices
and implementation, and that decisions preceded code. A JSON file cannot prove chronology.

Portable example validation, with a suitable installed validator:

```sh
python -m jsonschema -i /absolute/path/decision.json /installed/transpose-modern-typescript/references/decision-record.schema.json
```

Follow the shared contract for records, briefs, report capture and state expiry. If a gate
exists, inspect its actual interface and dimension support before use. Required unsupported
attestation remains incomplete; no command is invented by this pair.
