import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import {
  MARKER, cleanup, declaration, designRecord, makeProject, nonApplicable, reviewEnvelope,
} from './harness.mjs';

after(cleanup);

const SOURCE = 'export const priceOrder = (order: Order) => order.total;\n';

function project(dimensions = ['design-patterns']) {
  return makeProject({ marker: MARKER(dimensions), files: { 'src/price-order.ts': SOURCE } });
}

const pipe = document => ({ stdin: JSON.stringify(document) });
const reviewer = { session: 'session-reviewer' };

test('an unmarked repository is silent and allows', () => {
  const app = makeProject({ marker: null, files: { 'src/price-order.ts': SOURCE } });
  const status = app.gate(['status']);
  assert.equal(status.code, 0);
  assert.equal(status.stdout, '');
  const write = app.gate(['can-write', '--path', 'src/price-order.ts']);
  assert.equal(write.code, 0);
  assert.equal(write.stdout, '');
  const json = app.gate(['status', '--json']).json();
  assert.equal(json.marked, false);
  assert.equal(json.ok, true);
});

test('status names the next action and can-stop refuses an undeclared task', () => {
  const app = project();
  const status = app.gate(['status']);
  assert.equal(status.code, 0);
  assert.match(status.stdout, /design-patterns/);
  assert.match(status.stdout, /undeclared/);
  assert.match(status.stdout, /next: missing-declaration/);
  const stop = app.gate(['can-stop']);
  assert.equal(stop.code, 2);
});

test('a record is refused before a declaration and a write is refused before a record', () => {
  const app = project();
  const early = app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord()));
  assert.equal(early.code, 2);
  assert.match(early.stdout, /declare design-patterns before recording/);

  assert.equal(app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns'))).code, 0);
  const denied = app.gate(['can-write', '--path', 'src/price-order.ts']);
  assert.equal(denied.code, 2);
  assert.match(denied.stdout, /no validated decision record/);

  const outside = app.gate(['can-write', '--path', 'docs/notes.md']);
  assert.equal(outside.code, 0);
  assert.match(outside.stdout, /allowed/);
});

test('a dangling citation refuses the record and the gate names the path', () => {
  const app = project();
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  const record = designRecord({
    cites: [{ path: 'src/absent.ts', checkedAt: '2026-09-18', claim: 'Nothing is here.', covers: ['variability'] }],
  });
  const refused = app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(record));
  assert.equal(refused.code, 2);
  assert.match(refused.stdout, /refused: dangling-reference/);
  assert.match(refused.stdout, /src\/absent\.ts/);
});

test('a record allows the write, and a missing planned artifact blocks the review', () => {
  const app = project();
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  const recorded = app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord()));
  assert.equal(recorded.code, 0);
  assert.match(recorded.stdout, /recorded design-patterns rec-001@1/);

  assert.equal(app.gate(['can-write', '--path', 'src/price-order.ts']).code, 0);

  const blocked = app.gate(['can-review', '--dimension', 'design-patterns']);
  assert.equal(blocked.code, 2);
  assert.match(blocked.stdout, /missing-evidence/);

  app.write('src/tax-regime.ts', 'export const taxRegimes = {};\n');
  const ready = app.gate(['can-review', '--dimension', 'design-patterns']);
  assert.equal(ready.code, 0);
});

test('the three fingerprints move for the reasons the contract names', () => {
  const app = project();
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord()));
  app.write('src/tax-regime.ts', 'export const taxRegimes = {};\n');
  const digests = () => app.gate(['fingerprint', '--json']).json()
    .dimensions.find(one => one.dimension === 'design-patterns').fingerprints;
  const before = digests();
  assert.match(app.gate(['fingerprint', '--dimension', 'design-patterns']).stdout, /source {4}sha256:/);

  app.write('src/price-order.ts', `${SOURCE}// one more line\n`);
  const afterSource = digests();
  assert.notEqual(afterSource.source, before.source);
  assert.equal(afterSource.decision, before.decision);
  assert.equal(afterSource.reference, before.reference);

  const revised = designRecord({
    revision: { number: 2, previous: 'rec-001@1', reason: 'The claim about the callers was wrong.' },
    cites: [{
      path: 'src/price-order.ts',
      checkedAt: '2026-09-18',
      claim: 'Only one caller repeats the branch.',
      covers: ['variability', 'extension'],
    }],
  });
  assert.equal(app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(revised)).code, 0);
  assert.notEqual(digests().decision, afterSource.decision);
});

test('a revision that changes no cited artifact is refused', () => {
  const app = project();
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord()));
  const unchanged = designRecord({
    revision: { number: 2, previous: 'rec-001@1', reason: 'Reworded the decision.' },
  });
  const refused = app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(unchanged));
  assert.equal(refused.code, 2);
  assert.match(refused.stdout, /refused: revision-without-change/);
});

test('a full round attests and can-stop passes', () => {
  const app = project();
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord()));
  app.write('src/tax-regime.ts', 'export const taxRegimes = {};\n');

  const begun = app.gate(['begin', '--dimension', 'design-patterns'], reviewer);
  assert.equal(begun.code, 0);
  assert.match(begun.stdout, /window open for design-patterns/);

  const attested = app.gate(['attest', '--dimension', 'design-patterns', '--stdin'], { ...pipe(reviewEnvelope('design-patterns')), ...reviewer });
  assert.equal(attested.code, 0);
  assert.match(attested.stdout, /filed attestation att-001 for design-patterns: SOUND/);

  const stop = app.gate(['can-stop']);
  assert.equal(stop.code, 0);
  assert.match(stop.stdout, /every registered dimension is complete/);
});

test('a write inside the scope during an open window is refused', () => {
  const app = project();
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord()));
  app.write('src/tax-regime.ts', 'export const taxRegimes = {};\n');
  app.gate(['begin', '--dimension', 'design-patterns'], reviewer);

  const refused = app.gate(['can-write', '--path', 'src/price-order.ts']);
  assert.equal(refused.code, 2);
  assert.match(refused.stdout, /refused: review-in-flight/);

  assert.equal(app.gate(['release', '--dimension', 'design-patterns'], reviewer).code, 0);
  assert.equal(app.gate(['can-write', '--path', 'src/price-order.ts']).code, 0);
});

test('a state that moves under an open window voids the review', () => {
  const app = project();
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord()));
  app.write('src/tax-regime.ts', 'export const taxRegimes = {};\n');
  app.gate(['begin', '--dimension', 'design-patterns'], reviewer);
  app.write('src/price-order.ts', `${SOURCE}// moved under the reviewer\n`);

  const voided = app.gate(['attest', '--dimension', 'design-patterns', '--stdin'], { ...pipe(reviewEnvelope('design-patterns')), ...reviewer });
  assert.equal(voided.code, 2);
  assert.match(voided.stdout, /refused: state-moved/);
  assert.match(voided.stdout, /source/);
  assert.equal(app.gate(['can-write', '--path', 'src/price-order.ts']).code, 0);
});

test('attest refuses a non-SOUND envelope and report refuses SOUND', () => {
  const app = project();
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord()));
  app.write('src/tax-regime.ts', 'export const taxRegimes = {};\n');
  app.gate(['begin', '--dimension', 'design-patterns'], reviewer);
  const wrong = app.gate(['report', '--dimension', 'design-patterns', '--stdin'], { ...pipe(reviewEnvelope('design-patterns')), ...reviewer });
  assert.equal(wrong.code, 2);
  assert.match(wrong.stdout, /file SOUND through attest/);
});

test('a verdict needs an open window', () => {
  const app = project();
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord()));
  app.write('src/tax-regime.ts', 'export const taxRegimes = {};\n');
  const orphan = app.gate(['attest', '--dimension', 'design-patterns', '--stdin'], { ...pipe(reviewEnvelope('design-patterns')), ...reviewer });
  assert.equal(orphan.code, 2);
  assert.match(orphan.stdout, /refused: no-window/);
});

test('a non-applicable dimension needs its declaration and nothing else', () => {
  const app = project(['design-patterns', 'testing-patterns']);
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  const skipped = app.gate(['declare', '--dimension', 'testing-patterns', '--stdin'], pipe(nonApplicable('testing-patterns')));
  assert.equal(skipped.code, 0);
  const refused = app.gate(['record', '--dimension', 'testing-patterns', '--stdin'], pipe(designRecord({ dimension: 'testing-patterns' })));
  assert.equal(refused.code, 2);
  assert.match(refused.stdout, /declared non-applicable/);

  const status = app.gate(['status', '--json']).json();
  const testing = status.dimensions.find(one => one.dimension === 'testing-patterns');
  assert.equal(testing.state, 'non-applicable');
  assert.deepEqual(testing.codes, []);
});

test('the marker registers a dimension the manifest does not and the gate fails loudly', () => {
  const app = makeProject({ marker: MARKER(['invented-dimension']), files: { 'src/price-order.ts': SOURCE } });
  const failed = app.gate(['status']);
  assert.equal(failed.code, 1);
  assert.match(failed.stderr, /invented-dimension/);
});

test('the json surface validates against the published output schema', () => {
  const app = project();
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord()));
  app.write('src/tax-regime.ts', 'export const taxRegimes = {};\n');
  const status = app.gate(['status', '--json']);
  assert.equal(status.code, 0);
  const json = status.json();
  assert.equal(json.outputVersion, '1.0.0');
  assert.equal(json.task, 'REF-1');
  assert.equal(json.marked, true);
  assert.equal(json.dimensions.length, 1);
  assert.ok(json.plan.length === 1);
  assert.equal(json.plan[0].agent, 'design-pattern-reviewer');
  assert.match(json.plan[0].brief, /You are the fresh design-patterns reviewer/);
  assert.doesNotMatch(json.plan[0].brief, /strategy/i);
});

test('the gate refuses a write into its own index', () => {
  const app = project();
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  const refused = app.gate(['can-write', '--path', `${app.evidenceRoot}/REF-1/index/rounds.json`]);
  assert.equal(refused.code, 2);
  assert.match(refused.stdout, /gate index is written by gate commands only/);
});
