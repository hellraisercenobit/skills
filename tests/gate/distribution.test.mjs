import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';

import { MARKER, cleanup, declaration, designRecord, makeProject } from './harness.mjs';

const temporary = [];
after(() => {
  cleanup();
  for (const path of temporary) rmSync(path, { recursive: true, force: true });
});

const run = (script, ...args) => spawnSync(process.execPath, [resolve(script), ...args], { encoding: 'utf8' });
const scratch = prefix => {
  const path = mkdtempSync(join(tmpdir(), prefix));
  temporary.push(path);
  return path;
};
const pipe = document => ({ stdin: JSON.stringify(document) });

test('the committed gate bundle matches its sources', () => {
  const checked = run('scripts/build-gate-bundle.mjs', '--check');
  assert.equal(checked.status, 0, checked.stdout + checked.stderr);
  assert.match(checked.stdout, /bundle: current/);
});

test('the bundle carries the validator and depends on nothing outside node', () => {
  const bundle = readFileSync('packages/ai-engineering-gate/dist/ai-engineering-gate.mjs', 'utf8');
  const imports = [...bundle.matchAll(/^import\s[\s\S]*?from\s+'([^']+)';$/gm)].map(match => match[1]);
  assert.deepEqual(imports.filter(one => !one.startsWith('node:')), []);
  assert.ok(bundle.includes('function schemaErrors'), 'the schema validator is not in the bundle');
  assert.ok(bundle.includes('export { main };'), 'the bundle exposes no entry point');
});

test('the plugin declares the three hooks against its own bundle, and no others', () => {
  const plugin = JSON.parse(readFileSync('.claude-plugin/plugin.json', 'utf8'));
  assert.equal(plugin.hooks, './hooks/hooks.json');
  const { hooks } = JSON.parse(readFileSync('hooks/hooks.json', 'utf8'));
  assert.deepEqual(Object.keys(hooks), ['SessionStart', 'PreToolUse', 'Stop']);
  const commands = Object.values(hooks).flat().flatMap(entry => entry.hooks.map(one => one.command));
  assert.deepEqual(commands.map(command => /gate\.mjs" (\S+)/.exec(command)[1]).sort(),
    ['can-review', 'can-stop', 'can-write', 'status']);
  for (const command of commands) {
    assert.match(command, /\$\{CLAUDE_PLUGIN_ROOT\}\/packages\/ai-engineering-gate\/dist\/ai-engineering-gate\.mjs/);
    assert.match(command, /--hook --harness claude-code/);
  }
});

test('the optional wiring adds SubagentStop and never decides validity', () => {
  const { hooks } = JSON.parse(readFileSync('hooks/hooks.optional.json', 'utf8'));
  assert.deepEqual(Object.keys(hooks), ['SubagentStop']);
  assert.match(hooks.SubagentStop[0].hooks[0].command, /release --hook --harness claude-code/);
});

test('the installer wires Claude Code idempotently and removes only its own entries', () => {
  const home = scratch('gate-install-');
  const file = join(home, 'settings.json');
  const installer = 'scripts/install-gate-hooks.mjs';

  assert.equal(run(installer, '--file', file, '--check').status, 1);
  const wired = run(installer, '--file', file);
  assert.equal(wired.status, 0, wired.stdout);
  assert.match(wired.stdout, /events: SessionStart, PreToolUse, Stop/);
  assert.equal(run(installer, '--file', file, '--check').status, 0);

  const settings = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(settings.hooks.PreToolUse.length, 2);
  assert.match(settings.hooks.Stop[0].hooks[0].command, /can-stop --hook --harness claude-code/);

  const again = run(installer, '--file', file);
  assert.match(again.stdout, /hooks: current/);
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).hooks.PreToolUse.length, 2);

  const withOptional = run(installer, '--file', file, '--optional');
  assert.equal(withOptional.status, 0);
  assert.ok('SubagentStop' in JSON.parse(readFileSync(file, 'utf8')).hooks);
});

test('the installer preserves hooks it did not write', () => {
  const home = scratch('gate-install-keep-');
  const file = join(home, 'settings.json');
  const mine = { matcher: 'Bash', hooks: [{ type: 'command', command: 'my-own-audit.sh' }] };
  writeFileSync(file, JSON.stringify({ hooks: { PreToolUse: [mine] }, model: 'opus' }));

  run('scripts/install-gate-hooks.mjs', '--file', file);
  const wired = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(wired.model, 'opus');
  assert.deepEqual(wired.hooks.PreToolUse[0], mine);

  run('scripts/install-gate-hooks.mjs', '--file', file, '--remove');
  const cleaned = JSON.parse(readFileSync(file, 'utf8'));
  assert.deepEqual(cleaned.hooks, { PreToolUse: [mine] });
});

test('the Codex route uses Codex event names, its versioned file and states its limits', () => {
  const home = scratch('gate-install-codex-');
  const file = join(home, 'hooks.json');
  const wired = run('scripts/install-gate-hooks.mjs', '--harness', 'codex', '--file', file);
  assert.equal(wired.status, 0, wired.stdout);
  assert.match(wired.stdout, /events: preToolUse, beforeShellExecution, subagentStart, stop/);
  assert.match(wired.stdout, /limit: sessionStart is not wired/);

  const settings = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(settings.version, 1);
  assert.equal(settings.hooks.beforeShellExecution[0].type, 'command');
  assert.match(settings.hooks.stop[0].command, /can-stop --hook --harness codex/);
  assert.equal(run('scripts/install-gate-hooks.mjs', '--harness', 'codex', '--file', file, '--check').status, 0);
});

test('the AXI surface assertions hold against the pinned text', () => {
  const checked = run('scripts/check-axi-surface.mjs');
  assert.equal(checked.status, 0, checked.stdout + checked.stderr);
  assert.match(checked.stdout, /assertions: 10 of 10 hold/);
});

test('the gate runs from a copied plugin directory as the distribution root', () => {
  const plugin = scratch('plugin-copy-');
  for (const tree of ['contracts', 'agents', 'packages/ai-engineering-gate']) {
    cpSync(tree, join(plugin, tree), { recursive: true });
  }
  const members = JSON.parse(readFileSync('contracts/members.json', 'utf8'));
  for (const member of members.members) {
    for (const tree of [member.transpose, member.review]) {
      cpSync(tree, join(plugin, tree), { recursive: true });
    }
  }
  const app = makeProject({ marker: MARKER(['design-patterns']), files: { 'src/price-order.ts': 'export {}\n' } });
  const status = app.gate(['status', '--json'], { env: { AI_ENGINEERING_GATE_ROOT: plugin } });
  assert.equal(status.code, 0, status.stdout + status.stderr);
  assert.equal(status.json().dimensions[0].dimension, 'design-patterns');
  assert.equal(app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], {
    ...pipe(declaration('design-patterns')),
    env: { AI_ENGINEERING_GATE_ROOT: plugin },
  }).code, 0);
});

test('plugin and npm distribution roots fingerprint the same references', () => {
  const staged = run('scripts/stage-gate-package.mjs');
  assert.equal(staged.status, 0, staged.stdout + staged.stderr);
  try {
    const app = makeProject({ marker: MARKER(['design-patterns']), files: { 'src/price-order.ts': 'export {}\n' } });
    app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
    app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord({
      cites: [{ path: 'src/price-order.ts', checkedAt: '2026-09-18', claim: 'Empty module.', covers: ['variability'] }],
    })));
    const plugin = app.gate(['fingerprint', '--json']).json().dimensions[0].fingerprints.reference;
    const npm = app.gate(['fingerprint', '--json'], {
      env: { AI_ENGINEERING_GATE_ROOT: resolve('packages/ai-engineering-gate') },
    }).json().dimensions[0].fingerprints.reference;
    assert.equal(npm, plugin);
  } finally {
    run('scripts/stage-gate-package.mjs', '--clean');
  }
});
