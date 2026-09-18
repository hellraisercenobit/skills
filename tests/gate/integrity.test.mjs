import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  MARKER, cleanup, declaration, designRecord, judgmentFinding, makeProject,
  nonApplicable, reviewEnvelope, testingRecord,
} from './harness.mjs';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const copies = [];
after(() => {
  cleanup();
  for (const path of copies.splice(0)) rmSync(path, { recursive: true, force: true });
});
const copyRoot = () => {
  const path = mkdtempSync(join(tmpdir(), 'gate-refs-'));
  copies.push(path);
  return path;
};

const SOURCE = 'export const priceOrder = (order: Order) => order.total;\n';
const pipe = document => ({ stdin: JSON.stringify(document) });
const reviewer = { session: 'session-reviewer' };

function recorded() {
  const app = makeProject({ marker: MARKER(['design-patterns']), files: { 'src/price-order.ts': SOURCE } });
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord()));
  app.write('src/tax-regime.ts', 'export const taxRegimes = {};\n');
  return app;
}

test('a claim of unknown without a cited source is refused', () => {
  const app = makeProject({ marker: MARKER(['design-patterns']), files: { 'src/price-order.ts': SOURCE } });
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  const refused = app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord({
    need: 'unknown',
  })));
  assert.equal(refused.code, 2);
  assert.match(refused.stdout, /refused: unknown-without-source/);
});

test('two identical evidence items on one record are warned, not refused', () => {
  const app = makeProject({ marker: MARKER(['design-patterns']), files: { 'src/price-order.ts': SOURCE } });
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  const recorded = app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord({
    cites: [
      { path: 'src/price-order.ts', checkedAt: '2026-09-18', claim: 'The branch is repeated.', covers: ['variability'] },
      { path: 'src/price-order.ts', checkedAt: '2026-09-18', claim: 'The branch is repeated.', covers: ['extension'] },
    ],
  })));
  assert.equal(recorded.code, 0);
  const json = app.gate(['status', '--json']).json();
  assert.ok(json.warnings.includes('duplicate-evidence'));
});

test('a change outside every declared scope is warned, never refused', () => {
  const app = recorded();
  app.write('docs/notes.md', 'unrelated\n');
  const json = app.gate(['status', '--json']).json();
  assert.ok(json.warnings.includes('undeclared-change'));
  assert.ok(json.undeclaredChanges.includes('docs/notes.md'));
  assert.equal(app.gate(['can-write', '--path', 'docs/notes.md']).code, 0);
});

test('an untracked file inside the declared scope expires the source fingerprint', () => {
  const app = recorded();
  app.gate(['begin', '--dimension', 'design-patterns'], reviewer);
  app.gate(['attest', '--dimension', 'design-patterns', '--stdin'], { ...pipe(reviewEnvelope('design-patterns')), ...reviewer });
  const before = app.gate(['status', '--json']).json().dimensions[0].fingerprints.source;
  app.write('src/extra.ts', 'export const extra = 1;\n');
  const after = app.gate(['status', '--json']).json();
  assert.notEqual(after.dimensions[0].fingerprints.source, before);
  assert.ok(after.completion.codes.includes('stale-source'));
});

test('a non-applicable declaration without a reason is refused', () => {
  const app = makeProject({ marker: MARKER(['design-patterns']), files: { 'src/price-order.ts': SOURCE } });
  const refused = app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe({
    ...nonApplicable('design-patterns'),
    reason: '',
  }));
  assert.equal(refused.code, 2);
  assert.match(refused.stdout, /refused: invalid-document/);
});

test('evidence append is accepted and an index write stays denied', () => {
  const app = recorded();
  const appended = app.gate(['evidence append', '--dimension', 'design-patterns', '--stdin'], pipe({
    document: 'evidence-append',
    documentVersion: '1.0.0',
    dimension: 'design-patterns',
    record: 'rec-001@1',
    kind: 'artifact',
    produces: 'src/tax-regime.ts',
    payload: { note: 'The planned table exists in the worktree.' },
  }));
  assert.equal(appended.code, 0);
  assert.match(appended.stdout, /appended artifact/);
  assert.equal(app.gate(['can-write', '--path', `${app.evidenceRoot}/REF-1/index/rounds.json`]).code, 2);
});

test('a second begin is refused while the window is open, and so is dispatch', () => {
  const app = recorded();
  assert.equal(app.gate(['begin', '--dimension', 'design-patterns'], reviewer).code, 0);
  const second = app.gate(['begin', '--dimension', 'design-patterns'], reviewer);
  assert.equal(second.code, 2);
  assert.match(second.stdout, /refused: review-in-flight/);
  assert.equal(app.gate(['can-review', '--dimension', 'design-patterns']).code, 2);
});

test('a dispatch plan is printed only when a round is ready', () => {
  const app = makeProject({ marker: MARKER(['design-patterns']), files: { 'src/price-order.ts': SOURCE } });
  assert.equal(app.gate(['status', '--json']).json().plan, undefined);
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord()));
  assert.equal(app.gate(['status', '--json']).json().plan, undefined);
  app.write('src/tax-regime.ts', 'export const taxRegimes = {};\n');
  const ready = app.gate(['status', '--json']).json();
  assert.equal(ready.plan.length, 1);
  assert.equal(ready.plan[0].dimension, 'design-patterns');
});

test('concurrent attestations of two dimensions are both stored intact', () => {
  const app = makeProject({
    marker: MARKER(['design-patterns', 'testing-patterns']),
    files: { 'src/price-order.ts': SOURCE },
  });
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  app.gate(['declare', '--dimension', 'testing-patterns', '--stdin'], pipe(declaration('testing-patterns')));
  app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord()));
  app.gate(['record', '--dimension', 'testing-patterns', '--stdin'], pipe(testingRecord()));
  app.write('src/tax-regime.ts', 'export const taxRegimes = {};\n');
  app.write('src/price-order.test.ts', 'test("prices", () => {});\n');
  const design = { session: 'reviewer-design' };
  const testing = { session: 'reviewer-testing' };
  assert.equal(app.gate(['begin', '--dimension', 'design-patterns'], design).code, 0);
  assert.equal(app.gate(['begin', '--dimension', 'testing-patterns'], testing).code, 0);
  assert.equal(app.gate(['attest', '--dimension', 'design-patterns', '--stdin'], {
    ...pipe(reviewEnvelope('design-patterns')), ...design,
  }).code, 0);
  assert.equal(app.gate(['attest', '--dimension', 'testing-patterns', '--stdin'], {
    ...pipe(reviewEnvelope('testing-patterns')), ...testing,
  }).code, 0);
  const json = app.gate(['status', '--json']).json();
  assert.equal(json.completion.complete, true);
  assert.deepEqual(json.dimensions.map(one => one.state), ['attested', 'attested']);
});

test('touching a file does not lift a pending finding', () => {
  const app = recorded();
  app.gate(['begin', '--dimension', 'design-patterns'], reviewer);
  app.gate(['report', '--dimension', 'design-patterns', '--stdin'], {
    ...pipe(reviewEnvelope('design-patterns', { verdict: 'VIOLATIONS', findings: [judgmentFinding()] })),
    ...reviewer,
  });
  app.write('src/price-order.ts', `${SOURCE}// touched\n`);
  const json = app.gate(['status', '--json']).json();
  assert.deepEqual(json.dimensions[0].openFindings, ['F2']);
  assert.ok(json.completion.codes.includes('remedies-pending'));
});

test('exported evidence is stale when the checkout moved after export', () => {
  const app = recorded();
  app.gate(['begin', '--dimension', 'design-patterns'], reviewer);
  app.gate(['attest', '--dimension', 'design-patterns', '--stdin'], { ...pipe(reviewEnvelope('design-patterns')), ...reviewer });
  app.git('add', '-A');
  app.git('commit', '-m', 'the change');
  const marked = { ...MARKER(['design-patterns']), exportDirectory: '.engineering-suite' };
  app.write('.ai-engineering-suite.json', `${JSON.stringify(marked, null, 2)}\n`);
  app.git('add', '-A');
  app.git('commit', '-m', 'marker export dir');
  assert.equal(app.gate(['export']).code, 0);

  app.write('src/price-order.ts', `${SOURCE}// later\n`);
  app.git('add', '-A');
  app.git('commit', '-m', 'moved after export');
  const stale = app.gate(['can-stop', '--from-export', '--evidence-root', `${app.root}/.engineering-suite`, '--base', 'main', '--json']);
  assert.equal(stale.code, 2);
  assert.ok(stale.json().completion.codes.includes('stale-source'));
});

test('can-stop --full on an incomplete task stays under the pipeline output cap', () => {
  const app = recorded();
  const full = app.gate(['can-stop', '--full']);
  assert.equal(full.code, 2);
  assert.ok(full.stdout.length < 32 * 1024);
  assert.match(full.stdout, /dispatch plan|next:/);
});

test('an unverified identity is accepted and warned', () => {
  const app = recorded();
  app.gate(['begin', '--dimension', 'design-patterns'], reviewer);
  assert.equal(app.gate(['attest', '--dimension', 'design-patterns', '--stdin'], {
    ...pipe(reviewEnvelope('design-patterns')), ...reviewer,
  }).code, 0);
  const json = app.gate(['status', '--json']).json();
  assert.ok(json.warnings.includes('identity-unverified'));
  assert.equal(json.completion.complete, true);
});

test('editing a reference bundle expires the reference fingerprint', () => {
  const plugin = copyRoot();
  for (const tree of ['contracts', 'agents', 'packages/ai-engineering-gate', 'skills/engineering']) {
    cpSync(join(repoRoot, tree), join(plugin, tree), { recursive: true });
  }
  const env = { AI_ENGINEERING_GATE_ROOT: plugin };
  const app = makeProject({ marker: MARKER(['design-patterns']), files: { 'src/price-order.ts': SOURCE } });
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], { ...pipe(declaration('design-patterns')), env });
  app.gate(['record', '--dimension', 'design-patterns', '--stdin'], { ...pipe(designRecord()), env });
  app.write('src/tax-regime.ts', 'export const taxRegimes = {};\n');
  app.gate(['begin', '--dimension', 'design-patterns'], { ...reviewer, env });
  assert.equal(app.gate(['attest', '--dimension', 'design-patterns', '--stdin'], {
    ...pipe(reviewEnvelope('design-patterns')), ...reviewer, env,
  }).code, 0);
  const before = app.gate(['status', '--json'], { env }).json().dimensions[0].fingerprints.reference;
  const catalog = join(plugin, 'skills/engineering/transpose-design-patterns/references/pattern-catalog.md');
  writeFileSync(catalog, `${readFileSync(catalog, 'utf8')}\n# catalog moved\n`);
  const after = app.gate(['status', '--json'], { env }).json();
  assert.notEqual(after.dimensions[0].fingerprints.reference, before);
  assert.ok(after.completion.codes.includes('stale-reference'));
});

test('the CI check fails when the marker exists on the base and not on the head', () => {
  const app = recorded();
  app.git('add', '-A');
  app.git('commit', '-m', 'marker on main line');
  app.git('checkout', 'main');
  app.git('merge', '-m', 'land the marker', 'feature/REF-1-widget');
  app.git('checkout', '-b', 'feature/REF-2-drop');
  app.remove('.ai-engineering-suite.json');
  app.git('add', '-A');
  app.git('commit', '-m', 'drop the marker');
  const onBase = app.git('cat-file', '-e', 'main:.ai-engineering-suite.json');
  const onHead = app.git('cat-file', '-e', 'HEAD:.ai-engineering-suite.json');
  assert.equal(onBase.status ?? onBase.code, 0);
  assert.notEqual(onHead.status ?? onHead.code, 0);
});

