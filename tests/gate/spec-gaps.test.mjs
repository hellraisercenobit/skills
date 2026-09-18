import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  MARKER, cleanup, declaration, designRecord, gateCommand, judgmentFinding, makeProject,
  reviewEnvelope, testingRecord,
} from './harness.mjs';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const copies = [];
after(() => {
  cleanup();
  for (const path of copies.splice(0)) rmSync(path, { recursive: true, force: true });
});

const SOURCE = 'export const priceOrder = (order: Order) => order.total;\n';
const pipe = document => ({ stdin: JSON.stringify(document) });
const event = document => ({ stdin: JSON.stringify(document) });
const reviewer = { session: 'session-reviewer' };
const digest = path => `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`;

function copyRoot() {
  const path = mkdtempSync(join(tmpdir(), 'gate-spec-'));
  copies.push(path);
  return path;
}

function recorded(app = makeProject({ marker: MARKER(['design-patterns']), files: { 'src/price-order.ts': SOURCE } })) {
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord()));
  app.write('src/tax-regime.ts', 'export const taxRegimes = {};\n');
  return app;
}

test('a write on the change set is refused while any review window is open', () => {
  const app = recorded();
  app.gate(['begin', '--dimension', 'design-patterns'], reviewer);
  const refused = app.gate(['can-write', '--path', 'docs/notes.md']);
  assert.equal(refused.code, 2);
  assert.match(refused.stdout, /refused: review-in-flight/);
});

test('Stop re-blocks when the state moved after a previous block', () => {
  const app = recorded();
  const blocked = app.gate(['can-stop', '--hook', '--harness', 'claude-code'], event({
    hook_event_name: 'Stop',
    session_id: 'session-builder',
  }));
  assert.equal(blocked.json().decision, 'block');

  app.write('src/price-order.ts', `${SOURCE}// moved\n`);
  const again = app.gate(['can-stop', '--hook', '--harness', 'claude-code'], event({
    hook_event_name: 'Stop',
    session_id: 'session-builder',
    stop_hook_active: true,
  }));
  assert.equal(again.code, 0);
  assert.equal(again.json().decision, 'block');
});

test('a leftover handoff for another verb does not make a typed arbitrate look like an agent', () => {
  const app = recorded();
  app.gate(['can-write', '--hook', '--harness', 'claude-code'], event({
    hook_event_name: 'PreToolUse',
    session_id: 'session-builder',
    agent_id: 'agent-builder',
    agent_type: 'builder',
    tool_use_id: 'tool-declare',
    tool_name: 'Bash',
    tool_input: { command: `${gateCommand} declare --dimension design-patterns --stdin` },
  }));
  const typed = app.gate(['arbitrate', '--dimension', 'design-patterns', '--stdin'], pipe({
    document: 'arbitration',
    documentVersion: '1.0.0',
    dimension: 'design-patterns',
    dispute: 'dis-001',
    finding: 'F1',
    decision: 'uphold',
    words: 'The user decides.',
  }));
  assert.doesNotMatch(typed.stdout, /agent-arbitration-refused/);
});

test('two same-verb handoffs with different command text stay distinct', () => {
  const app = recorded();
  const handoff = (command, toolUseId) => app.gate(['can-write', '--hook', '--harness', 'claude-code'], event({
    hook_event_name: 'PreToolUse',
    session_id: 'session-builder',
    agent_id: 'agent-builder',
    agent_type: 'builder',
    tool_use_id: toolUseId,
    tool_name: 'Bash',
    tool_input: { command },
  }));
  handoff(`${gateCommand} begin --dimension design-patterns`, 'tool-a');
  handoff(`${gateCommand} begin --dimension testing-patterns`, 'tool-b');
  const stored = readdirSync(join(app.evidenceRoot, 'REF-1', 'index', 'handoffs'));
  assert.ok(stored.length >= 2, stored.join(','));
});

test('replay stamps isolated hashes, not the live worktree', () => {
  const PRODUCTION = 'export const shipping = amount => (amount >= 100 ? 0 : 10);\n';
  const TEST = `import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shipping } from '../src/shipping.mjs';
test('free at the threshold', () => {
  assert.equal(shipping(100), 0);
  assert.equal(shipping(99), 10);
});
`;
  const app = makeProject({ marker: MARKER(['testing-patterns']) });
  app.write('src/shipping.mjs', PRODUCTION);
  app.write('test/shipping.test.mjs', TEST);
  app.gate(['declare', '--dimension', 'testing-patterns', '--stdin'], pipe(declaration('testing-patterns', {
    scope: { paths: ['src', 'test'] },
  })));
  assert.equal(app.gate(['record', '--dimension', 'testing-patterns', '--stdin'], pipe(testingRecord({
    scope: ['src', 'test'],
    cites: [{ path: 'README.md', checkedAt: '2026-09-18', claim: 'Shipping is new.', covers: ['shipping'] }],
    plans: [
      { path: 'test/shipping.test.mjs', role: 'test' },
      { path: 'src/shipping.mjs', role: 'production' },
    ],
  }))).code, 0);
  const replayed = app.gate([
    'replay', '--dimension', 'testing-patterns', '--record', 'rec-001@1',
    '--scenario', 'free-at-the-threshold', '--command', 'node --test test/shipping.test.mjs',
  ]);
  assert.equal(replayed.code, 0, replayed.stdout + replayed.stderr);
  const directory = join(app.evidenceRoot, 'REF-1', 'evidence', 'testing-patterns');
  const events = readdirSync(directory).sort().map(name => JSON.parse(readFileSync(join(directory, name), 'utf8')));
  const red = events.find(one => one.payload?.phase === 'red');
  const green = events.find(one => one.payload?.phase === 'green');
  assert.equal(red.replayed, true);
  assert.equal(red.artifactHashes.production['src/shipping.mjs'], null);
  assert.equal(green.artifactHashes.production['src/shipping.mjs'], digest(join(app.root, 'src/shipping.mjs')));
});

test('a live RED event is stamped with production hashes at the record base', () => {
  const baseProduction = 'export const shipping = () => 10;\n';
  const app = makeProject({ marker: MARKER(['testing-patterns']) });
  app.git('checkout', 'main');
  app.write('src/shipping.mjs', baseProduction);
  app.git('add', '-A');
  app.git('commit', '-m', 'production at base');
  app.git('checkout', 'feature/REF-1-widget');
  app.git('merge', '--no-edit', 'main');
  app.write('test/shipping.test.mjs', 'test("pending", () => {});\n');
  app.gate(['declare', '--dimension', 'testing-patterns', '--stdin'], pipe(declaration('testing-patterns', {
    scope: { paths: ['src', 'test'] },
  })));
  assert.equal(app.gate(['record', '--dimension', 'testing-patterns', '--stdin'], pipe(testingRecord({
    scope: ['src', 'test'],
    base: 'main',
    cites: [{ path: 'src/shipping.mjs', checkedAt: '2026-09-18', claim: 'Flat shipping exists at base.', covers: ['shipping'] }],
    plans: [
      { path: 'test/shipping.test.mjs', role: 'test' },
      { path: 'src/shipping.mjs', role: 'production' },
    ],
  }))).code, 0);

  const red = app.gate(['evidence append', '--dimension', 'testing-patterns', '--stdin'], pipe({
    document: 'evidence-append',
    documentVersion: '1.0.0',
    dimension: 'testing-patterns',
    record: 'rec-001@1',
    kind: 'journal-event',
    payload: {
      record: 'rec-001@1',
      scenario: 'free-at-the-threshold',
      phase: 'red',
      command: 'node --test test/shipping.test.mjs',
      exitCode: 1,
      cause: 'expected 0, received 10',
      failureClass: 'expected-behavior-missing',
      output: 'runs/red.txt',
    },
  }));
  assert.equal(red.code, 0, red.stdout + red.stderr);

  const directory = join(app.evidenceRoot, 'REF-1', 'evidence', 'testing-patterns');
  const stored = JSON.parse(readFileSync(join(directory, readdirSync(directory).sort()[0]), 'utf8'));
  assert.equal(stored.replayed, false);
  assert.equal(stored.artifactHashes.production['src/shipping.mjs'], digest(join(app.root, 'src/shipping.mjs')));
  assert.equal(stored.artifactHashes.production['src/shipping.mjs'], digest(join(app.root, 'src/shipping.mjs')));
});

test('identical evidence items warn; the same claim on two paths does not', () => {
  const app = makeProject({
    marker: MARKER(['design-patterns']),
    files: { 'src/price-order.ts': SOURCE, 'src/other.ts': 'export {}\n' },
  });
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  const distinct = app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord({
    cites: [
      { path: 'src/price-order.ts', checkedAt: '2026-09-18', claim: 'The branch is repeated.', covers: ['variability'] },
      { path: 'src/other.ts', checkedAt: '2026-09-18', claim: 'The branch is repeated.', covers: ['extension'] },
    ],
  })));
  assert.equal(distinct.code, 0, distinct.stdout);
  assert.equal(app.gate(['status', '--json']).json().warnings.includes('duplicate-evidence'), false);
});

test('PostToolUse fingerprint --hook never decides validity', () => {
  const app = recorded();
  const answer = app.gate(['fingerprint', '--hook', '--harness', 'claude-code'], event({
    hook_event_name: 'PostToolUse',
    session_id: 'session-builder',
    tool_name: 'Edit',
    tool_input: { file_path: 'src/price-order.ts' },
  }));
  assert.equal(answer.code, 0);
  assert.equal(answer.stdout, '');
});

test('dimensions all still fails when a companion is missing from the distribution', () => {
  const plugin = copyRoot();
  for (const tree of ['contracts', 'agents', 'packages/ai-engineering-gate', 'skills/engineering']) {
    cpSync(join(repoRoot, tree), join(plugin, tree), { recursive: true });
  }
  rmSync(join(plugin, 'skills/engineering/transpose-testing-patterns'), { recursive: true, force: true });
  const app = makeProject({
    marker: { markerVersion: '1.0.0', dimensions: 'all' },
    files: { 'src/price-order.ts': SOURCE },
  });
  const failed = app.gate(['status'], { env: { AI_ENGINEERING_GATE_ROOT: plugin } });
  assert.equal(failed.code, 1);
  assert.match(failed.stderr, /testing-patterns|does not resolve/);
});
