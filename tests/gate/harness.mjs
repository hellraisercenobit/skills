import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
export const GATE = join(repoRoot, 'packages/ai-engineering-gate/bin/ai-engineering-gate.mjs');
export const gateCommand = `node ${GATE}`;

const shippedExample = dimension => JSON.parse(readFileSync(
  join(repoRoot, 'skills/engineering', `transpose-${dimension}`, 'references/record.example.json'),
  'utf8',
));

const created = [];

export function cleanup() {
  for (const path of created.splice(0)) rmSync(path, { recursive: true, force: true });
}

function run(cwd, args, options = {}) {
  const result = spawnSync(process.execPath, [GATE, ...args], {
    cwd,
    encoding: 'utf8',
    input: options.stdin ?? '',
    env: {
      ...process.env,
      HOME: options.home ?? join(cwd, '..', 'home'),
      AI_ENGINEERING_GATE_EVIDENCE_ROOT: options.evidenceRoot,
      AI_ENGINEERING_GATE_SESSION: options.session ?? 'session-builder',
      CLAUDE_SESSION_ID: '',
      CODEX_SESSION_ID: '',
      ...options.env,
    },
  });
  const stdout = result.stdout ?? '';
  return {
    code: result.status,
    stdout,
    stderr: result.stderr ?? '',
    json: () => JSON.parse(stdout),
  };
}

export function makeProject({ marker, files = {}, branch = 'feature/REF-1-widget' } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'gate-project-'));
  created.push(base);
  const root = join(base, 'project');
  const evidenceRoot = join(base, 'evidence');
  mkdirSync(root, { recursive: true });
  mkdirSync(join(base, 'home'), { recursive: true });

  const git = (...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  git('init', '--initial-branch', 'main');
  git('config', 'user.email', 'gate@example.test');
  git('config', 'user.name', 'Gate Test');
  git('config', 'commit.gpgsign', 'false');
  write(root, 'README.md', '# fixture\n');
  git('add', '.');
  git('commit', '-m', 'initial');
  git('checkout', '-b', branch);
  for (const [path, content] of Object.entries(files)) write(root, path, content);
  if (marker) write(root, '.ai-engineering-suite.json', `${JSON.stringify(marker, null, 2)}\n`);

  return {
    root,
    evidenceRoot,
    git,
    write: (path, content) => write(root, path, content),
    remove: path => rmSync(join(root, path), { force: true, recursive: true }),
    gate: (args, options = {}) => run(root, args, { evidenceRoot, ...options }),
  };
}

function write(root, path, content) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

export const MARKER = dimensions => ({
  markerVersion: '1.0.0',
  dimensions,
  base: 'main',
});

export const declaration = (dimension, overrides = {}) => ({
  document: 'declaration',
  documentVersion: '1.0.0',
  dimension,
  applicability: 'applicable',
  reason: 'The change adds a branching pricing rule inside the protected scope.',
  request: 'Support one more tax regime without editing every caller.',
  constraints: ['Node 20 or later', 'no new runtime dependency'],
  base: 'main',
  scope: { paths: ['src'] },
  revision: { number: 1, previous: null, reason: 'First declaration of this task.' },
  ...overrides,
});

export const nonApplicable = dimension => ({
  document: 'declaration',
  documentVersion: '1.0.0',
  dimension,
  applicability: 'non-applicable',
  reason: 'The change touches documentation only, so no code decision exists to review.',
  request: 'Support one more tax regime without editing every caller.',
  constraints: [],
  revision: { number: 1, previous: null, reason: 'First declaration of this task.' },
});

const FORCES = [
  ['variability', 'interchangeable-open', 'priceOrder branches on a regime key config supplies.'],
  ['extension', 'many-sites', 'The next regime edits priceOrder, both callers and the union.'],
  ['creation-policy', 'absent', 'Regimes are plain data.'],
  ['boundary-mismatch', 'absent', 'Configuration and domain share one shape.'],
  ['reusable-action', 'absent', 'No operation stands alone.'],
  ['composition', 'sequential-steps', 'Subtotal, tax, rounding, in one order.'],
  ['shared-lifecycle', 'per-consumer', 'Each request prices its own order.'],
  ['cross-cutting-behavior', 'absent', 'No concern wraps the calls.'],
].map(([force, value, site]) => ({ force, value, site }));

export const designRecord = (overrides = {}) => ({
  dimension: 'design-patterns',
  schemaVersion: '1.0.0',
  catalogVersion: '1.0.0',
  contractVersions: ['1.0.0', '1.1.0'],
  need: 'Price an order for one of several tax regimes, with new regimes arriving from configuration.',
  scope: ['src'],
  base: 'main',
  revision: { number: 1, previous: null, reason: 'First decision of this task.' },
  cites: [{
    path: 'src/price-order.ts',
    checkedAt: '2026-09-18',
    claim: 'One function branches on a regime string and both callers repeat the branch.',
    covers: ['variability', 'extension'],
  }],
  plans: [{ path: 'src/tax-regime.ts', role: 'implementation' }],
  forces: FORCES,
  alternatives: [
    'Current shape: a switch repeated by both callers. Rejected because the next regime costs four edits.',
    'Registry: regimes self-register. Rejected because the set is known at build time.',
    'Strategy with a typed table: one module per regime. Chosen.',
  ],
  decision: {
    pattern: 'strategy',
    reason: 'Interchangeable implementations of one responsibility, selected by a discriminator.',
    extensionCost: 'Four sites today; one module and one table entry with the table, checked by the compiler.',
    reconsiderWhen: 'Regimes start arriving at runtime from plugins, which makes this a Registry.',
  },
  framework: {
    name: 'vanilla',
    transposition: 'transpose-vanilla.md, Strategy: a module per variant and one satisfies table.',
  },
  artifacts: [{ file: 'src/tax-regime.ts', symbol: 'taxRegimes' }],
  invariants: ['The table is typed with satisfies Record<RegimeKey, TaxRegime>.'],
  ...overrides,
});

// Derived from the record the skill ships, so a schema change breaks the fixture rather than letting
// a stale copy pass. Only what the fixture repository must own is overridden.
export const testingRecord = (overrides = {}) => {
  const example = shippedExample('testing-patterns');
  return {
    ...example,
    scope: ['src'],
    base: 'main',
    cites: [{
      path: 'src/price-order.ts',
      checkedAt: '2026-09-18',
      claim: 'The module has no regime charge yet, so the behavior is new rather than characterized.',
      covers: ['pricing'],
    }],
    plans: [
      { path: 'src/price-order.test.ts', role: 'test' },
      { path: 'src/price-order.ts', role: 'production' },
    ],
    sites: example.sites.map(site => ({
      ...site,
      artifacts: ['src/price-order.ts', 'src/price-order.test.ts'],
      evidence: ['journal/price-order.jsonl'],
    })),
    ...overrides,
  };
};

export const reviewEnvelope = (dimension, overrides = {}) => ({
  document: 'review-envelope',
  documentVersion: '1.0.0',
  dimension,
  contractVersion: '1.1.0',
  verdict: 'SOUND',
  records: ['rec-001@1'],
  checks: [{ command: 'npm test', outcome: 'passed', guarantee: 'the suite discriminates the change' }],
  reviewer: {
    independence: 'Fresh context; the brief carried the declaration only.',
    identity: 'design-pattern-reviewer',
    agentType: 'design-pattern-reviewer',
  },
  findings: [],
  challengedSurvived: ['Strategy over a registry: the variant set is closed at build time.'],
  ...overrides,
});

export const evidenceFinding = (overrides = {}) => ({
  id: 'F1',
  kind: 'evidence',
  severity: 'Major',
  location: 'src/tax-regime.ts',
  rule: 'DP-04',
  expected: 'A typed table binding every regime key.',
  recorded: 'The record plans a satisfies table.',
  actual: 'The produced module exports a plain object with no satisfies clause.',
  impact: 'A missing regime compiles.',
  defense: 'The object is inferred, so the keys are known.',
  refutation: 'Inference does not check completeness against the key union.',
  remedy: { kind: 'produce', artifact: 'src/tax-regime.table.ts' },
  ...overrides,
});

export const judgmentFinding = (overrides = {}) => ({
  id: 'F2',
  kind: 'judgment',
  severity: 'Blocker',
  location: 'src/price-order.ts',
  rule: 'DP-01',
  expected: 'Strategy, because the variant set is open through configuration.',
  recorded: 'The record decided none and kept the switch.',
  actual: 'priceOrder still branches on the regime key.',
  impact: 'Every new regime edits four sites.',
  defense: 'Two variants do not justify a pattern.',
  refutation: 'The set is open through configuration, which is the force, not the count.',
  correction: 'Extract one module per regime and select through a typed table.',
  ...overrides,
});
