# Suite smoke validation

Run `npm ci`, `npm test`, `npm run check:contract`, `npm run check:gate`, `npm run check:axi`
and `npm run test:gate` on Node 24. The lockfile pins the test compiler; it is not a compiler
baseline imposed on projects using the skills.

For the third dimension, follow [testing-patterns qualification](testing-patterns/README.md)
to install both locked Vitest profiles and run runtime, type, mutant and real-browser checks.

Members stay `implemented` until both subsets below are recorded for a pair. D runs in CI.
J is the live fixture list; it is not CI.

## D - deterministic, through the gate seam

Each scenario is a named test under `tests/gate/`. The command line is the oracle: stdout,
JSON, exit code.

Applicable and non-applicable declarations, locked vs widening revisions, invalid documents,
dangling citations, unknown without source, revision without change, duplicate evidence,
undeclared changes, missing registry members, silence outside a marker, missing planned
evidence, index writes denied, fingerprints moving on source, reference and decision,
untracked files in scope, export excluded from the change set, findings without remedies,
judgment closed by a citing revision, pending findings blocking every dimension, a touched
file not lifting a finding, disputes with and without evidence, arbitration uphold and
reject, arbitration refused from an agent handoff, replay stamped by the gate, replay
refused when the marker forbids it, begin required before attest, state-moved voiding a
window, release recorded, second begin refused, edit and dispatch denied while a round is
open, cross-dimension conflict, round and conflict caps, concurrent attestations, builder
identity refused, unverified identity warned, hook decisions on stdout, re-entrance, gate
failure in hook mode blocking, dispatch plan present only when a round is ready, plugin
directory smoke, plugin and npm reference fingerprints equal, JSON output schema-stable,
output under the pipeline cap, export then verification from a clean checkout, exported
evidence stale when the checkout or the gate version moved, marker dropped on the head
failing CI.

The existing probe-based and schema-based checks of the testing fixtures stay where they
are. They are deterministic evidence outside the gate.

## J - judgment, live fixtures

Shared: retain, none, implementation, deterministic checks, blind review, true defect
detected, steelman-survived candidate, correction, fresh review, conflicting
cross-dimension invariant, reviewer tool set one nesting level deeper, plugin loading
inside pipeline agents, Codex hook shapes (claimed only after the installer verification),
a reviewer that ends without filing auto-released when the optional hook is installed.

Testing-patterns: observed RED, false TDD claim rejected, observed claim with only
replayed events judged, independent oracle, tautological oracle detected, runtime versus
static contract, flaky and retry disclosure.

Modern-typescript: semantic preservation, unsupported runtime, type-information loss,
retained legacy implementation, unnecessary native wrapper rejected.

## Seams

- Gate command line against a throwaway git repository with a marker.
- Public generator command: missing/stale bundle repair and read-only check mode.
- Real JSON Schema 2020-12 consumer: valid idiom/none records and invalid record rejection.
- Public fixture exports: observable values, errors, identity, duplicate policy, production
  and cleanup. Type fixtures exercise actual compiler acceptance/rejection.
- Installed skill bundles: resolve required references without maintainer checkout paths.
- Skill execution itself: fresh-context forward transposition and independent blind review,
  with expectations kept outside the reviewer context.
- Real browser: controlled local fetch and event subscription, observed through chrome-devtools-axi.

These are small representative smoke tests, not exhaustive catalog certification. CI runs
deterministic checks only, never live LLM evaluation. Development evaluation records and
transcripts stay outside the repository.

## Reproduce the behavioral evaluation

Copy `fixtures/modern-typescript/input.ts`, `request.md` and its package.json into an isolated
scratch project. Invoke transpose-modern-typescript with that raw request, without expected
code or verdicts. Save decisions outside the scratch repository before implementation.
Run the public seam tests against the generated output and ask a new reviewer to audit via
the contract's neutral brief. Keep test oracles out of the reviewer brief.

The cases cover everyday idioms, grouping, a business helper to retain, a separately
unsupported target, unsafe external input, repeated lookups, weak versus enumerable
metadata, partial sequence consumption and browser abort/cleanup. Existing compatible
solutions remain legitimate. Do not assert source phrases or exact generated syntax.

For the adversarial case, provide a schema-valid reassuring record with the original unsafe
external cast in a separate scratch scope. The reviewer must derive its expectation before
reading that record. The builder corrects after the finding; a new fresh reviewer reassesses.

For composition, reuse a pure grouping fixture with design and TS records. Review both
dimensions at the same content state, modify their shared file, and observe that both
review executions decline to reuse the previous verdicts.

For review-only installation, expose only the review bundle to a fresh evaluator and ask
for an audit. Observe incomplete execution for the missing companion, not inferred rules.
For the complete installation, expose both copied bundles; the evaluator resolves their
references locally. Generated reference equality is also checked deterministically.

## Browser check

Run `npm run smoke:browser`, open the printed local URL with chrome-devtools-axi and run the
page's `runSmoke()` public operation. It exercises a local streaming endpoint plus event
subscription, disposal, completion and failure. The returned result must pass; inspect
console/network errors for unintended failures. This is a real browser check, not a DOM mock.
