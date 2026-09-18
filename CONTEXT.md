# Domain language

Shared vocabulary for agents working in this repo. Add terms as skills and workflows introduce jargon worth pinning down.

## Language

**Skill**:
A folder under `skills/<bucket>/` with a `SKILL.md` (and optional `agents/openai.yaml`, scripts, or reference docs).

**Bucket**:
A category folder under `skills/` — `engineering`, `productivity`, `misc`, `personal`, `in-progress`, or `deprecated`.

**Promoted**:
Skills in `engineering/` or `productivity/`. They appear in the top-level `README.md` and in `.claude-plugin/plugin.json`.

**Agent**:
A Claude Code subagent definition under `agents/`, shipped by the plugin and linked into `~/.claude/agents`. It runs a skill with a fixed tool set; it owns no rules of its own.

**Companion pair**:
A `transpose-*` skill that decides and writes, and its `review-*` twin that audits blind against the reference files the first one owns.

**Dimension**: one quality domain, with its own catalog, decisions and verdict.

**Shared contract**: versioned procedural guarantees C01-C12 owned in `contracts/suite-contract.md` and generated into portable transpose bundles.

**Registry**: `contracts/members.json`. The only place a dimension exists for the gate: transpose, review, agent, decision schema, evidence schemas, reference bundle and supported contract versions.

**Marker**: `.ai-engineering-suite.json` at the repository root. Its presence is the project's opt-in; without it every gate command allows and prints nothing that blocks.

**Task key**: the identifier under which a task's evidence lives, taken from `--task`, `AI_ENGINEERING_GATE_TASK`, a ticket in the branch name, or a slug of the branch.

**Declaration**: the per-dimension, per-task document that states applicability, request, constraints, base and scope. A non-applicable dimension has a declaration and nothing else.

**Decision record**: a domain-schema document written before affected implementation, preserved outside the repository with revisions.

**Cites and plans**: the envelope every record shares. `cites` points at artifacts that exist now; `plans` names artifacts the record commits to produce.

**Evidence index**: the gate-owned store under the evidence root: declarations, records, appends, disputes, arbitrations, windows, rounds, handoffs and builder identities. Nobody else writes it.

**Fingerprint**: a content hash. **Source** is the declared scope plus the change set. **Reference** is the dimension's catalog, schemas and guides plus the contract and gate versions. **Decision** is the declaration and every record, each with its revision number.

**Envelope**: the common outer shape of a decision record or of a review. The body stays the dimension's business; the gate validates the envelope.

**Frozen matrix**: a reviewer's immutable expectations emitted before reading author records or rationale.

**Verdict**: SOUND, SMELLS or VIOLATIONS after a complete audit. Missing prerequisites mean incomplete execution, not a verdict.

**Attestation**: a gate-written document that stores a SOUND review envelope bound to the three fingerprints of the reviewer's window.

**Report**: a gate-written document that stores a SMELLS or VIOLATIONS envelope the same way. Findings stay pending until addressed, disputed or closed by arbitration.

**Finding**: `evidence` when an artifact is not on file, `judgment` when a decision is wrong against the catalog. Evidence findings carry a **remedy** (`produce`, `rerun`, `replay`, `dispute`); judgment findings carry a **correction**.

**Dispute**: the builder's contest of one finding, with a pointer to counter-evidence.

**Arbitration**: the user's decision on a dispute, `uphold` or `reject`. Only a command the user types writes one.

**Replay**: a gate-executed red/green pair in an isolated copy at the record's base, stamped as such. The builder never writes a replayed event.

**Round**: one pass of reviews against one frozen source fingerprint. A content-neutral rebase is not a new round.

**In-flight window**: an open review that froze the three fingerprints. Edits in declared scope are refused until it files or is released.

**Gate**: `ai-engineering-gate`. Generic enforcement: it stores documents, derives state, computes fingerprints and answers `can-write`, `can-review` and `can-stop`. It does not judge the domain.

**Pair conformity**: observed adherence to the shared contract and domain rules; neither its name nor a valid JSON record proves it.

## Relationships

- A **Bucket** holds many **Skills**
- Only **Promoted** skills ship in the Claude Code plugin
- A **Companion pair** shares one reference set, owned by the `transpose-*` half
- An **Agent** runs one skill of a pair with a restricted tool set
- The **Registry** lists every **Dimension**; the **Marker** opts a project into the **Gate**
- A **Declaration** precedes a **Decision record**; a **Window** precedes an **Attestation** or a **Report**

## Flagged ambiguities

_None yet._
