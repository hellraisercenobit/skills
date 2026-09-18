import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

// Self-assessment of the gate's surface against the pinned AXI text, by running the gate rather than
// by reading it. The pin, the text and this check move together: a new upstream revision re-qualifies
// or the claim does not move.
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const GATE = resolve(ROOT, 'packages/ai-engineering-gate/dist/ai-engineering-gate.mjs');
const PIN = resolve(ROOT, 'contracts/axi/pin.json');

function scratchProject() {
  const root = mkdtempSync(join(tmpdir(), 'axi-surface-'));
  const git = (...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'surface@example.com');
  git('config', 'user.name', 'Surface');
  writeFileSync(join(root, 'README.md'), '# surface\n');
  git('add', '-A');
  git('commit', '-qm', 'base');
  git('checkout', '-qb', 'feature/REF-1-surface');
  writeFileSync(join(root, '.ai-engineering-suite.json'), `${JSON.stringify({
    markerVersion: '1.0.0',
    dimensions: ['design-patterns'],
    evidenceRoot: '.evidence',
    base: 'main',
  }, null, 2)}\n`);
  mkdirSync(join(root, '.home'));
  return root;
}

const run = (root, args) => {
  const result = spawnSync(process.execPath, [GATE, ...args], {
    cwd: root,
    encoding: 'utf8',
    input: '',
    env: { ...process.env, HOME: join(root, '.home') },
  });
  return { code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
};

// Each assertion is named in the pin, so the two cannot drift: a claim with no check, or a check with
// no claim, fails this command.
function assertions(root, unmarked) {
  const bare = run(root, []);
  const compact = run(root, ['status']);
  const full = run(root, ['status', '--full']);
  const json = run(root, ['status', '--json']);
  const unknown = run(root, ['status', '--invented-flag']);
  const refused = run(root, ['record', '--dimension', 'design-patterns', '--stdin']);
  const help = run(root, ['--help']);
  const silent = run(unmarked, ['status']);
  const parsed = (() => {
    try {
      return JSON.parse(json.stdout);
    } catch {
      return null;
    }
  })();
  return new Map([
    ['no-argument output is live state', () => bare.stdout === compact.stdout && /design-patterns/.test(bare.stdout) && !/usage:/.test(bare.stdout)],
    ['compact status names one state per dimension', () => compact.stdout.split('\n').filter(line => line.includes('design-patterns')).length === 1],
    ['compact status names the next action', () => /^next: /m.test(compact.stdout)],
    ['reasons are disclosed only behind --full', () => /## /.test(full.stdout) && !/## /.test(compact.stdout) && full.stdout.includes(compact.stdout.split('\n')[0])],
    ['json output is versioned and schema-valid', () => parsed?.outputVersion === '1.0.0' && parsed.gateVersion.length > 0],
    ['an unknown flag fails loud on stderr', () => unknown.code === 1 && /unknown option/.test(unknown.stderr) && unknown.stdout === ''],
    ['a refusal is structured on stdout', () => refused.code === 2 && /^refused: /m.test(refused.stdout) && /^reason: /m.test(refused.stdout)],
    ['exit codes are 0, 2 and 1 as documented', () => compact.code === 0 && refused.code === 2 && unknown.code === 1],
    ['help lists every command and exit code', () => ['status', 'declare', 'record', 'attest', 'can-stop', 'exit codes'].every(one => help.stdout.includes(one))],
    ['an unmarked repository is silent and allows', () => silent.code === 0 && silent.stdout === ''],
  ]);
}

function main() {
  const { values } = parseArgs({ options: { help: { type: 'boolean', default: false } } });
  if (values.help) {
    console.log('usage: node scripts/check-axi-surface.mjs\nasserts the surface properties contracts/axi/pin.json claims, by running the gate');
    return;
  }
  const pin = JSON.parse(readFileSync(PIN, 'utf8'));
  const text = readFileSync(resolve(ROOT, pin.text));
  const hash = `sha256:${createHash('sha256').update(text).digest('hex')}`;
  if (hash !== pin.textHash) {
    console.log([
      `error: the pinned AXI text changed without a re-qualification`,
      `pinned: ${pin.textHash}`,
      `found: ${hash}`,
      'help: re-read contracts/axi/axi-standard.md, update the assessment, then set textHash',
    ].join('\n'));
    process.exitCode = 1;
    return;
  }
  const root = scratchProject();
  const unmarked = scratchProject();
  rmSync(join(unmarked, '.ai-engineering-suite.json'));
  try {
    const checks = assertions(root, unmarked);
    const claimed = pin.surfaceAssertions;
    const missing = claimed.filter(name => !checks.has(name));
    const unclaimed = [...checks.keys()].filter(name => !claimed.includes(name));
    const failed = claimed.filter(name => checks.has(name) && !checks.get(name)());
    console.log([
      `axi: ${pin.upstream}@${pin.revision.slice(0, 12)}`,
      `level: ${pin.complianceLevel}`,
      `assertions: ${claimed.length - failed.length - missing.length} of ${claimed.length} hold`,
      ...missing.map(name => `unchecked: ${name}`),
      ...unclaimed.map(name => `unclaimed: ${name}`),
      ...failed.map(name => `failed: ${name}`),
    ].join('\n'));
    if (missing.length + unclaimed.length + failed.length > 0) {
      console.log('help: a claim with no check and a check with no claim both fail; fix contracts/axi/pin.json or the gate');
      process.exitCode = 1;
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(unmarked, { recursive: true, force: true });
  }
}

main();
