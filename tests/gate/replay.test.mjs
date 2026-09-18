import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import { MARKER, cleanup, declaration, makeProject, testingRecord } from './harness.mjs';

after(cleanup);

const pipe = document => ({ stdin: JSON.stringify(document) });

const PRODUCTION = 'export const shipping = amount => (amount >= 100 ? 0 : 10);\n';
const TEST = `import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shipping } from '../src/shipping.mjs';

test('free at the threshold', () => {
  assert.equal(shipping(100), 0);
  assert.equal(shipping(99), 10);
});
`;

const RECORD = () => testingRecord({
  scope: ['src', 'test'],
  base: 'main',
  cites: [{
    path: 'README.md',
    checkedAt: '2026-09-18',
    claim: 'The repository has no shipping charge yet, so the behavior is new.',
    covers: ['shipping'],
  }],
  plans: [
    { path: 'test/shipping.test.mjs', role: 'test' },
    { path: 'src/shipping.mjs', role: 'production' },
  ],
});

// The gate runs the scenario itself in an isolated copy at the record's base, so the red it stores is
// a fact rather than a claim: the builder cannot hand it a transcript.
function replayProject(marker = MARKER(['testing-patterns'])) {
  const app = makeProject({ marker });
  app.write('src/shipping.mjs', PRODUCTION);
  app.write('test/shipping.test.mjs', TEST);
  app.gate(['declare', '--dimension', 'testing-patterns', '--stdin'], pipe(declaration('testing-patterns', {
    scope: { paths: ['src', 'test'] },
  })));
  const written = app.gate(['record', '--dimension', 'testing-patterns', '--stdin'], pipe(RECORD()));
  assert.equal(written.code, 0, written.stdout + written.stderr);
  return app;
}

test('the gate replays the scenario and stamps both events', () => {
  const app = replayProject();
  const replayed = app.gate([
    'replay', '--dimension', 'testing-patterns', '--record', 'rec-001@1',
    '--scenario', 'free-at-the-threshold', '--command', 'node --test test/shipping.test.mjs',
  ]);
  assert.equal(replayed.code, 0, replayed.stdout + replayed.stderr);
  assert.match(replayed.stdout, /replayed testing-patterns rec-001@1 scenario free-at-the-threshold/);
  assert.match(replayed.stdout, /red exit 1, green exit 0/);
  assert.match(replayed.stdout, /events: 2 appended and stamped by the gate/);
  assert.doesNotMatch(replayed.stdout, /discriminates nothing/);
});

test('a test that passes without the production change is reported as discriminating nothing', () => {
  const app = replayProject();
  app.write('test/shipping.test.mjs', `import { test } from 'node:test';\ntest('nothing', () => {});\n`);
  const replayed = app.gate([
    'replay', '--dimension', 'testing-patterns', '--record', 'rec-001@1',
    '--scenario', 'empty', '--command', 'node --test test/shipping.test.mjs',
  ]);
  assert.equal(replayed.code, 0);
  assert.match(replayed.stdout, /red exit 0/);
  assert.match(replayed.stdout, /discriminates nothing/);
});

test('a marker that forbids the replay remedy refuses it', () => {
  const app = replayProject({ ...MARKER(['testing-patterns']), allowReplay: false });
  const refused = app.gate([
    'replay', '--dimension', 'testing-patterns', '--record', 'rec-001@1',
    '--scenario', 'free-at-the-threshold', '--command', 'node --test test/shipping.test.mjs',
  ]);
  assert.equal(refused.code, 2);
  assert.match(refused.stdout, /refused: replay-forbidden/);
});

test('a replay needs a record whose plans name a test and a production role', () => {
  const app = makeProject({ marker: MARKER(['testing-patterns']) });
  app.write('src/shipping.mjs', PRODUCTION);
  app.gate(['declare', '--dimension', 'testing-patterns', '--stdin'], pipe(declaration('testing-patterns', {
    scope: { paths: ['src', 'test'] },
  })));
  app.gate(['record', '--dimension', 'testing-patterns', '--stdin'], pipe(testingRecord({
    scope: ['src'],
    base: 'main',
    cites: [{ path: 'README.md', checkedAt: '2026-09-18', claim: 'Nothing ships yet.', covers: ['shipping'] }],
    plans: [{ path: 'src/shipping.mjs', role: 'production' }],
  })));
  const refused = app.gate([
    'replay', '--dimension', 'testing-patterns', '--record', 'rec-001@1',
    '--scenario', 'free', '--command', 'node --test test/shipping.test.mjs',
  ]);
  assert.equal(refused.code, 2, refused.stdout + refused.stderr);
  assert.match(refused.stdout, /role test and of role production/);
});
