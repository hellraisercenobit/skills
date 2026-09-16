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

Keep an append-only external JSONL journal (or equivalent) linked to the initial record:

```json
{"record":"decision-1.json","scenario":"boundary","phase":"red","command":"npm test -- --run boundary.test.ts","exitCode":1,"cause":"expected 10, received 0","output":"runs/red.txt","state":"snapshots/red/","testHash":"sha256:...","productionHash":"sha256:...","helpersHash":"sha256:..."}
```

This is a format example, not evidence. Capture output from the actual tool and preserve
accessible snapshots or resolvable immutable refs for RED, GREEN and any relevant refactor.
Hashes identify states but do not allow inspection of missing content. Do not overwrite
earlier events or backfill results into the initial decision. No RED commits or empty
reflection commits are required. Keep evidence through review and correction.

Portable evidence is inspectable, not tamperproof. Timestamps and commit messages do not
prove chronology alone. Missing observations cannot be reconstructed from final source.
A retrospective audit can assess test quality with that limit; a claimed full TDD
transposition without its required evidence remains incomplete. The reviewer never
modifies code or fixtures to create evidence; the builder runs requested experiments in
an isolated copy, then a fresh reviewer examines the results.
