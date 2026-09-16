# Decision record 1.0.0

Use [the closed JSON Schema 2020-12](decision-record.schema.json) and
[illustrative example](record.example.json). Replace its facts; it claims no actual run.
Validate with a 2020-12 validator before the first affected test/helper/config/production
write. Rule IDs and specialized pattern IDs must be catalog members. Inventory site
references must resolve to unique entries in `sites`; check this cross-reference alongside
schema validation. Structural validity is not semantic approval or chronology proof.

Keep decisions outside the repository with scope/base, detected profile and dated source
evidence. Each revision links its predecessor; do not rewrite one to reflect later facts.
List each axis even when excluded, with a reason. Alternatives include current state,
including absence of existing tests. A `none` decision has no specialized pattern IDs;
it can still create direct tests. `retain` is separate and can retain a named pattern.

Per site distinguish behavior/risk, form/level, seam/oracle, doubles/data/isolation,
observable invariants, mode, checks and planned artifacts/evidence. Group coherent choices
without losing individual scenario identity. Artifact/evidence paths can name planned
outputs; they are not claims those outputs exist yet.

Append subsequent observations to the [TDD journal](tdd.md), not the initial record.
Preserve actual tool output and inspectable states. Store composition scope/hash/report
metadata in a separate execution index, never extra fields in another dimension's schema.
For catalog-only analysis on an unsupported runner, report the limitation; do not forge
a Vitest profile to satisfy this qualified-transposition schema.
