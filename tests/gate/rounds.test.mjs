import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  MARKER, cleanup, declaration, designRecord, judgmentFinding, makeProject, reviewEnvelope,
  testingRecord,
} from './harness.mjs';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const copies = [];
after(() => {
  cleanup();
  for (const path of copies.splice(0)) rmSync(path, { recursive: true, force: true });
});

const SOURCE = 'export const priceOrder = (order: Order) => order.total;\n';
const pipe = document => ({ stdin: JSON.stringify(document) });
const reviewer = { session: 'session-reviewer' };

function attested(marker = MARKER(['design-patterns'])) {
  const app = makeProject({ marker, files: { 'src/price-order.ts': SOURCE } });
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord()));
  app.write('src/tax-regime.ts', 'export const taxRegimes = {};\n');
  app.gate(['begin', '--dimension', 'design-patterns'], reviewer);
  app.gate(['attest', '--dimension', 'design-patterns', '--stdin'], {
    ...pipe(reviewEnvelope('design-patterns')), ...reviewer,
  });
  return app;
}

test('a round counts once per state, and a fresh state opens the next', () => {
  const app = attested();
  assert.equal(app.gate(['status', '--json']).json().round, 1);

  app.write('src/price-order.ts', `${SOURCE}// corrected\n`);
  const stale = app.gate(['status', '--json']).json();
  assert.equal(stale.dimensions[0].state, 'stale');
  assert.ok(stale.completion.codes.includes('stale-source'));

  app.gate(['begin', '--dimension', 'design-patterns'], reviewer);
  app.gate(['attest', '--dimension', 'design-patterns', '--stdin'], {
    ...pipe(reviewEnvelope('design-patterns')), ...reviewer,
  });
  const next = app.gate(['status', '--json']).json();
  assert.equal(next.round, 2);
  assert.equal(next.completion.complete, true);
});

test('the total round cap stops the task and asks the user to arbitrate', () => {
  const app = attested({ ...MARKER(['design-patterns']), roundCap: 1 });
  const json = app.gate(['can-stop', '--json']).json();
  assert.equal(json.ok, false);
  assert.ok(json.completion.codes.includes('round-cap-reached'));
  const blocked = app.gate(['can-review', '--dimension', 'design-patterns']);
  assert.equal(blocked.code, 2);
  assert.match(blocked.stdout, /total round cap of 1/);
});

test('two conflict filings on one state count as one conflict round', () => {
  const app = makeProject({
    marker: { ...MARKER(['design-patterns', 'testing-patterns']), conflictRoundCap: 2 },
    files: { 'src/price-order.ts': SOURCE },
  });
  for (const dimension of ['design-patterns', 'testing-patterns']) {
    assert.equal(app.gate(['declare', '--dimension', dimension, '--stdin'], pipe(declaration(dimension))).code, 0);
    const record = dimension === 'design-patterns' ? designRecord() : testingRecord();
    assert.equal(app.gate(['record', '--dimension', dimension, '--stdin'], pipe(record)).code, 0);
  }
  app.write('src/tax-regime.ts', 'export const taxRegimes = {};\n');
  app.write('src/price-order.test.ts', 'test("prices an order", () => {});\n');
  for (const dimension of ['design-patterns', 'testing-patterns']) {
    app.gate(['begin', '--dimension', dimension], reviewer);
    assert.equal(app.gate(['attest', '--dimension', dimension, '--stdin'], {
      ...pipe(reviewEnvelope(dimension)), ...reviewer,
    }).code, 0);
  }
  app.write('src/price-order.ts', `${SOURCE}// corrected for another dimension\n`);
  for (const dimension of ['design-patterns', 'testing-patterns']) {
    app.gate(['begin', '--dimension', dimension], reviewer);
  }
  for (const dimension of ['design-patterns', 'testing-patterns']) {
    const filed = app.gate(['report', '--dimension', dimension, '--stdin'], {
      ...pipe(reviewEnvelope(dimension, { verdict: 'VIOLATIONS', findings: [judgmentFinding()] })),
      ...reviewer,
    });
    assert.equal(filed.code, 0, filed.stdout + filed.stderr);
  }
  const json = app.gate(['status', '--json']).json();
  assert.ok(json.warnings.includes('cross-dimension-conflict'));
  assert.equal(json.completion.codes.includes('arbitration-required'), false);
});

test('a dimension that turns non-SOUND after an attestation is a cross-dimension conflict', () => {
  const app = attested({ ...MARKER(['design-patterns']), conflictRoundCap: 1 });
  app.write('src/price-order.ts', `${SOURCE}// corrected for another dimension\n`);
  app.gate(['begin', '--dimension', 'design-patterns'], reviewer);
  const filed = app.gate(['report', '--dimension', 'design-patterns', '--stdin'], {
    ...pipe(reviewEnvelope('design-patterns', { verdict: 'VIOLATIONS', findings: [judgmentFinding()] })),
    ...reviewer,
  });
  assert.equal(filed.code, 0, filed.stdout + filed.stderr);
  assert.match(filed.stdout, /warn: .*cross-dimension-conflict/);

  const status = app.gate(['status', '--json']).json();
  assert.ok(status.warnings.includes('cross-dimension-conflict'));
  assert.ok(status.completion.codes.includes('arbitration-required'));
});

test('a released window is recorded and never counts as a verdict', () => {
  const app = makeProject({ marker: MARKER(['design-patterns']), files: { 'src/price-order.ts': SOURCE } });
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord()));
  app.write('src/tax-regime.ts', 'export const taxRegimes = {};\n');
  app.gate(['begin', '--dimension', 'design-patterns'], reviewer);
  app.gate(['release', '--dimension', 'design-patterns'], reviewer);
  const json = app.gate(['status', '--json']).json();
  assert.equal(json.dimensions[0].state, 'recorded');
  assert.ok(json.completion.codes.includes('missing-review'));
  assert.equal(app.gate(['can-review', '--dimension', 'design-patterns']).code, 0);
});

test('a declaration locks once a record depends on it, unless the revision only widens it', () => {
  const app = makeProject({ marker: MARKER(['design-patterns']), files: { 'src/price-order.ts': SOURCE } });
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord()));

  const narrowed = declaration('design-patterns', {
    scope: { paths: ['src/price-order.ts'] },
    revision: { number: 2, previous: '1', reason: 'Narrow the scope after the fact.' },
  });
  const refused = app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(narrowed));
  assert.equal(refused.code, 2);
  assert.match(refused.stdout, /refused: declaration-locked/);

  const widened = declaration('design-patterns', {
    scope: { paths: ['src', 'config'], configuration: ['tsconfig.json'] },
    revision: { number: 2, previous: '1', reason: 'The change reaches configuration too.' },
  });
  assert.equal(app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(widened)).code, 0);
});

test('export refuses a dirty worktree and publishes a committed one', () => {
  const app = attested({ ...MARKER(['design-patterns']), exportDirectory: '.engineering-suite' });
  const dirty = app.gate(['export']);
  assert.equal(dirty.code, 2);
  assert.match(dirty.stdout, /refused: state-moved/);
  assert.match(dirty.stdout, /commit the change set first/);

  app.git('add', '-A');
  app.git('commit', '-m', 'the change');
  const published = app.gate(['export']);
  assert.equal(published.code, 0);
  assert.match(published.stdout, /exported 1 attested dimensions of REF-1/);
  assert.ok(existsSync(join(app.root, '.engineering-suite/REF-1/index/attestations/design-patterns/att-001.json')));
});

test('a clean checkout verifies the exported evidence and refuses a version drift', () => {
  const app = attested({ ...MARKER(['design-patterns']), exportDirectory: '.engineering-suite' });
  app.git('add', '-A');
  app.git('commit', '-m', 'the change');
  app.gate(['export']);

  const exported = join(app.root, '.engineering-suite');
  const verified = app.gate(['can-stop', '--from-export', '--evidence-root', exported, '--base', 'main']);
  assert.equal(verified.code, 0);

  const plugin = mkdtempSync(join(tmpdir(), 'gate-version-'));
  copies.push(plugin);
  for (const tree of ['contracts', 'agents', 'packages/ai-engineering-gate', 'skills/engineering']) {
    cpSync(join(repoRoot, tree), join(plugin, tree), { recursive: true });
  }
  const pkg = join(plugin, 'packages/ai-engineering-gate/package.json');
  const manifest = JSON.parse(readFileSync(pkg, 'utf8'));
  manifest.version = '9.9.9';
  writeFileSync(pkg, `${JSON.stringify(manifest, null, 2)}\n`);

  const drifted = app.gate(
    ['can-stop', '--from-export', '--json', '--evidence-root', exported, '--base', 'main'],
    { env: { AI_ENGINEERING_GATE_ROOT: plugin } },
  );
  assert.equal(drifted.code, 2, drifted.stdout + drifted.stderr);
  assert.ok(drifted.json().completion.codes.includes('stale-reference'));
});

test('a detached CI checkout reads the task from the export instead of guessing it', () => {
  const app = attested({ ...MARKER(['design-patterns']), exportDirectory: '.engineering-suite' });
  app.git('add', '-A');
  app.git('commit', '-m', 'the change');
  app.gate(['export']);
  app.git('checkout', '--detach');

  const exported = join(app.root, '.engineering-suite');
  const verified = app.gate(['can-stop', '--from-export', '--evidence-root', exported, '--base', 'main', '--json']);
  assert.equal(verified.code, 0, verified.stdout);
  assert.equal(verified.json().task, 'REF-1');

  const guessed = app.gate(['can-stop', '--evidence-root', exported, '--base', 'main', '--json']);
  assert.equal(guessed.json().task, 'detached-head');
});

test('the export directory never moves the source fingerprint', () => {
  const app = attested({ ...MARKER(['design-patterns']), exportDirectory: '.engineering-suite' });
  const before = app.gate(['status', '--json']).json().dimensions[0].fingerprints.source;
  app.git('add', '-A');
  app.git('commit', '-m', 'the change');
  app.gate(['export']);
  const after = app.gate(['status', '--json']).json().dimensions[0].fingerprints.source;
  assert.equal(after, before);
});
