# Suite smoke validation

Run `npm ci`, `npm test` and `npm run check:contract` on Node 24. The lockfile pins the
test compiler; it is not a compiler baseline imposed on projects using the skills.

For the third dimension, follow [testing-patterns qualification](testing-patterns/README.md)
to install both locked Vitest profiles and run runtime, type, mutant and real-browser checks.

## Seams

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
review executions decline to reuse the previous verdicts. This checks the protocol, not a
fictional automatic enforcement engine.

For review-only installation, expose only the review bundle to a fresh evaluator and ask
for an audit. Observe incomplete execution for the missing companion, not inferred rules.
For the complete installation, expose both copied bundles; the evaluator resolves their
references locally. Generated reference equality is also checked deterministically.

## Browser check

Run `npm run smoke:browser`, open the printed local URL with chrome-devtools-axi and run the
page's `runSmoke()` public operation. It exercises a local streaming endpoint plus event
subscription, disposal, completion and failure. The returned result must pass; inspect
console/network errors for unintended failures. This is a real browser check, not a DOM mock.
