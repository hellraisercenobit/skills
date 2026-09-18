import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import {
  MARKER, cleanup, declaration, designRecord, evidenceFinding, gateCommand, judgmentFinding,
  makeProject, reviewEnvelope, testingRecord,
} from './harness.mjs';

after(cleanup);

const SOURCE = 'export const priceOrder = (order: Order) => order.total;\n';
const pipe = document => ({ stdin: JSON.stringify(document) });
const reviewer = { session: 'session-reviewer' };

const RECORD_OF = { 'design-patterns': designRecord, 'testing-patterns': testingRecord };

// A task carried to the point where a reviewer can file, so each test starts from one state.
function recorded(dimensions = ['design-patterns']) {
  const app = makeProject({ marker: MARKER(dimensions), files: { 'src/price-order.ts': SOURCE } });
  for (const dimension of dimensions) {
    const declared = app.gate(['declare', '--dimension', dimension, '--stdin'], pipe(declaration(dimension)));
    assert.equal(declared.code, 0, declared.stdout + declared.stderr);
    const written = app.gate(['record', '--dimension', dimension, '--stdin'], pipe(RECORD_OF[dimension]()));
    assert.equal(written.code, 0, written.stdout + written.stderr);
  }
  app.write('src/tax-regime.ts', 'export const taxRegimes = {};\n');
  app.write('src/price-order.test.ts', 'test("prices an order", () => {});\n');
  return app;
}

function reportOn(app, dimension, findings) {
  app.gate(['begin', '--dimension', dimension], reviewer);
  return app.gate(['report', '--dimension', dimension, '--stdin'], {
    ...pipe(reviewEnvelope(dimension, { verdict: 'VIOLATIONS', findings })),
    ...reviewer,
  });
}

test('a report blocks completion and names every finding', () => {
  const app = recorded();
  const filed = reportOn(app, 'design-patterns', [evidenceFinding(), judgmentFinding()]);
  assert.equal(filed.code, 0);
  assert.match(filed.stdout, /F1 \(evidence, Major\)/);
  assert.match(filed.stdout, /F2 \(judgment, Blocker\)/);

  const stop = app.gate(['can-stop']);
  assert.equal(stop.code, 2);
  const json = app.gate(['can-stop', '--json']).json();
  assert.equal(json.ok, false);
  assert.ok(json.completion.codes.includes('remedies-pending'));
  assert.deepEqual(json.dimensions[0].openFindings, ['F1', 'F2']);
});

test('no review reopens while a finding is pending, on any dimension', () => {
  const app = recorded(['design-patterns', 'testing-patterns']);
  reportOn(app, 'design-patterns', [evidenceFinding()]);
  const blocked = app.gate(['can-review', '--dimension', 'testing-patterns']);
  assert.equal(blocked.code, 2);
  assert.match(blocked.stdout, /remedies-pending on design-patterns/);
});

test('a produce remedy is closed by the append that names the artifact', () => {
  const app = recorded();
  reportOn(app, 'design-patterns', [evidenceFinding()]);
  app.write('src/tax-regime.table.ts', 'export const table = {} satisfies Record<string, never>;\n');
  const appended = app.gate(['evidence append', '--dimension', 'design-patterns', '--stdin'], pipe({
    document: 'evidence-append',
    documentVersion: '1.0.0',
    dimension: 'design-patterns',
    record: 'rec-001@1',
    kind: 'artifact',
    produces: 'src/tax-regime.table.ts',
    payload: { note: 'The typed table the finding asked for.' },
  }));
  assert.equal(appended.code, 0);
  const json = app.gate(['status', '--json']).json();
  assert.deepEqual(json.dimensions[0].openFindings, []);
  assert.ok(json.completion.codes.includes('stale-source'));
});

test('a judgment finding needs a revision that names it and a state that moved', () => {
  const app = recorded();
  reportOn(app, 'design-patterns', [judgmentFinding()]);

  const silent = designRecord({
    revision: { number: 2, previous: 'rec-001@1', reason: 'Reconsidered the force.' },
    cites: [{
      path: 'src/tax-regime.ts', checkedAt: '2026-09-18', claim: 'The table now exists.', covers: ['extension'],
    }],
  });
  assert.equal(app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(silent)).code, 0);
  const stillOpen = app.gate(['status', '--json']).json();
  assert.deepEqual(stillOpen.dimensions[0].openFindings, ['F2']);

  const addressing = designRecord({
    revision: {
      number: 3, previous: 'rec-001@2', reason: 'Extract one module per regime.', addresses: ['F2'],
    },
    cites: [{
      path: 'src/price-order.ts', checkedAt: '2026-09-18', claim: 'priceOrder looks the regime up.', covers: ['variability'],
    }],
  });
  app.write('src/price-order.ts', 'export const priceOrder = (order: Order) => taxRegimes[order.regime](order);\n');
  assert.equal(app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(addressing)).code, 0);
  const closed = app.gate(['status', '--json']).json();
  assert.deepEqual(closed.dimensions[0].openFindings, []);
});

test('an evidence finding without a remedy is refused', () => {
  const app = recorded();
  app.gate(['begin', '--dimension', 'design-patterns'], reviewer);
  const { remedy, ...withoutRemedy } = evidenceFinding();
  const refused = app.gate(['report', '--dimension', 'design-patterns', '--stdin'], {
    ...pipe(reviewEnvelope('design-patterns', { verdict: 'SMELLS', findings: [withoutRemedy] })),
    ...reviewer,
  });
  assert.equal(refused.code, 2);
  assert.match(refused.stdout, /remedy/);
});

const disputeDocument = (overrides = {}) => ({
  document: 'dispute',
  documentVersion: '1.0.0',
  dimension: 'design-patterns',
  report: 'rep-001',
  finding: 'F2',
  counterEvidence: [{
    path: 'src/price-order.ts',
    claim: 'The regime union is closed in this file, so the set is not open through configuration.',
  }],
  position: 'The force the finding names is absent: no configuration supplies a regime key.',
  ...overrides,
});

test('a dispute holds the finding open until the user arbitrates', () => {
  const app = recorded();
  reportOn(app, 'design-patterns', [judgmentFinding()]);
  const disputed = app.gate(['dispute', '--dimension', 'design-patterns', '--stdin'], pipe(disputeDocument()));
  assert.equal(disputed.code, 0);
  assert.match(disputed.stdout, /disputed design-patterns finding F2 as dis-001/);
  assert.match(disputed.stdout, /no agent writes an arbitration/);

  const json = app.gate(['status', '--json']).json();
  assert.equal(json.dimensions[0].state, 'disputed');
  assert.ok(json.completion.codes.includes('unresolved-dispute'));

  const again = app.gate(['dispute', '--dimension', 'design-patterns', '--stdin'], pipe(disputeDocument()));
  assert.equal(again.code, 2);
  assert.match(again.stdout, /already disputed/);
});

test('a dispute whose counter-evidence does not exist is refused', () => {
  const app = recorded();
  reportOn(app, 'design-patterns', [judgmentFinding()]);
  const refused = app.gate(['dispute', '--dimension', 'design-patterns', '--stdin'], pipe(disputeDocument({
    counterEvidence: [{ path: 'src/absent.ts', claim: 'Nothing is here.' }],
  })));
  assert.equal(refused.code, 2);
  assert.match(refused.stdout, /refused: dispute-without-evidence/);
});

const arbitration = (decision, overrides = {}) => ({
  document: 'arbitration',
  documentVersion: '1.0.0',
  dimension: 'design-patterns',
  dispute: 'dis-001',
  decision,
  words: decision === 'uphold'
    ? 'The regime list is compiled in, so the open-set force is absent and the finding does not stand.'
    : 'Configuration does supply the key; extract the modules as the reviewer asked.',
  ...overrides,
});

test('an upheld dispute closes the finding and allows one fresh review', () => {
  const app = recorded();
  reportOn(app, 'design-patterns', [judgmentFinding()]);
  app.gate(['dispute', '--dimension', 'design-patterns', '--stdin'], pipe(disputeDocument()));

  const decided = app.gate(['arbitrate', '--dimension', 'design-patterns', '--stdin'], pipe(arbitration('uphold')));
  assert.equal(decided.code, 0);
  assert.match(decided.stdout, /arbitrated dis-001 as uphold/);

  const json = app.gate(['status', '--json']).json();
  assert.deepEqual(json.dimensions[0].openFindings, []);
  assert.equal(app.gate(['can-review', '--dimension', 'design-patterns']).code, 0);
  assert.match(app.gate(['status', '--full']).stdout, /the user arbitrated finding F2 as uphold/);
});

test('a rejected dispute leaves the correction to execute', () => {
  const app = recorded();
  reportOn(app, 'design-patterns', [judgmentFinding()]);
  app.gate(['dispute', '--dimension', 'design-patterns', '--stdin'], pipe(disputeDocument()));
  const decided = app.gate(['arbitrate', '--dimension', 'design-patterns', '--stdin'], pipe(arbitration('reject')));
  assert.equal(decided.code, 0);
  assert.match(decided.stdout, /execute the remedy or correction of F2/);
  const json = app.gate(['status', '--json']).json();
  assert.deepEqual(json.dimensions[0].openFindings, ['F2']);
  assert.equal(app.gate(['can-review', '--dimension', 'design-patterns']).code, 2);
});

test('arbitrate is refused when a hook saw the tool call that invoked it', () => {
  const app = recorded();
  reportOn(app, 'design-patterns', [judgmentFinding()]);
  app.gate(['dispute', '--dimension', 'design-patterns', '--stdin'], pipe(disputeDocument()));

  const hookEvent = {
    hook_event_name: 'PreToolUse',
    session_id: 'session-builder',
    agent_id: 'agent-builder',
    tool_name: 'Bash',
    tool_input: { command: `${gateCommand} arbitrate --dimension design-patterns --stdin` },
  };
  const seen = app.gate(['can-write', '--hook', '--harness', 'claude-code'], { stdin: JSON.stringify(hookEvent) });
  assert.equal(seen.code, 0);

  const refused = app.gate(['arbitrate', '--dimension', 'design-patterns', '--stdin'], pipe(arbitration('uphold')));
  assert.equal(refused.code, 2);
  assert.match(refused.stdout, /refused: agent-arbitration-refused/);
});
