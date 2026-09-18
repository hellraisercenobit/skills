# TDD and process evidence

Applies TP-06/07/15/16. Choose `tdd`, `characterization`, `coverage` or `audit` in the
record. Existing tests that pass immediately are useful coverage, not an observed TDD cycle.

1. Name the behavior, independent requirement, public seam and discriminating example.
   Record before tests, determinant helpers, configuration or production changes.
2. Write one behavioral slice. Run it. An import/setup error is setup work, not RED.
   A minimal public skeleton can make the intended assertion reachable. For a static
   guarantee, isolate the expected diagnostic for the missing type contract.
3. Preserve test/oracle and determinant helper contents. Implement the behavior to GREEN.
   Changing the test to obtain GREEN starts a new cycle and preserves the old observation.
   Do not add speculative features; an obvious naturally general solution is allowed.
4. Run the focused scenario and relevant regression checks. Map scenario IDs to executed
   test identities. Record discovered counts, skips/todos/fails and retries explicitly.
5. Before refactoring, name concrete pressure: duplication, extension cost, fragile
   invariant or confused responsibility. Keeping the design is valid. Preserve observable
   contracts; green alone is not full equivalence. Compare with the legacy/reference or
   add a discriminating probe when the risk warrants it. New behavior needs its own cycle.

Keep an append-only external JSONL journal linked to the initial record, one event per phase,
validated against `journal-event.schema.json`:

```json
{"record":"rec-001","scenario":"boundary","phase":"red","command":"npm test -- --run boundary.test.ts","exitCode":1,"cause":"expected 10, received 0","failureClass":"expected-behavior-missing","output":"runs/red.txt","state":"snapshots/red/"}
```

This is a format example, not evidence. Capture output from the actual tool and preserve
accessible snapshots or resolvable immutable refs for RED, GREEN and any relevant refactor.
Every event names its **failure class** when its phase is red, so an absent behavior is
distinguishable from a behavior that exists and disagrees, and both from setup work.

Artifact hashes are not written in the event. Where a gate is installed, `evidence append`
stamps each event with the content hashes of the record's planned artifacts by role, `test`
and `production`, so the event proves the state of those files at the moment it was filed.
Hashes identify states but do not allow inspection of missing content. Do not overwrite
earlier events or backfill results into the initial decision. No RED commits or empty
reflection commits are required. Keep evidence through review and correction.

## Derived states

The journal is the fact; these four states are read from it, not claimed:

| State | Read from the journal | What it proves |
| --- | --- | --- |
| `observed` | a red event, not marked replayed, whose stamped `production` hashes equal the base state, followed by a green event on the same scenario | the test failed before the production change existed |
| `replayed` | a red and a green event the gate wrote itself while executing a replay | the test discriminates the behavior; nothing about chronology |
| `incomplete` | a cycle missing its red or its green | the profile claims TDD and its evidence does not support it |
| `non-TDD` | the record's mode is `characterization`, `coverage` or `audit` | another profile, judged on its own terms |

A record whose mode is `tdd` and whose scenarios are `incomplete` is a false TDD claim, and a
reviewer states it as a finding on evidence, not as an opinion. A `replayed` state answers a
missing-RED remedy: it is proof that the test discriminates, not proof that it was written
first, and a review says which of the two it has. The reviewer judges discrimination and
design; chronology is the gate's stamp to read, not a claim to weigh.

Portable evidence is inspectable, not tamperproof. Timestamps and commit messages do not
prove chronology alone. Missing observations cannot be reconstructed from final source.
A retrospective audit can assess test quality with that limit; a claimed full TDD
transposition without its required evidence remains incomplete. The reviewer never
modifies code or fixtures to create evidence; the builder runs requested experiments in
an isolated copy, then a fresh reviewer examines the results.
