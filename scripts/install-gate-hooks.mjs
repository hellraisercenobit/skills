import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

// A plugin install carries the hooks with the gate. This installer covers the routes that do not: a
// skills.sh copy into `~/.claude`, and Codex. It writes only the suite's own entries and leaves every
// other hook of the file untouched, so running it twice changes nothing and removing it removes only
// what it added.
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const BUNDLE = 'packages/ai-engineering-gate/dist/ai-engineering-gate.mjs';
const MARK = 'ai-engineering-gate';

const WIRING = {
  'claude-code': [
    { event: 'SessionStart', command: 'status', matcher: null, timeout: 20 },
    { event: 'PreToolUse', command: 'can-write', matcher: 'Edit|Write|MultiEdit|NotebookEdit|Bash', timeout: 20 },
    { event: 'PreToolUse', command: 'can-review', matcher: 'Task', timeout: 20 },
    { event: 'Stop', command: 'can-stop', matcher: null, timeout: 30 },
  ],
  // Codex's own event names and matcher vocabulary. `sessionStart` is absent on purpose: Codex
  // documents no output field that injects context there, so the compact status is not delivered and
  // the installer reports that limit instead of wiring a hook that answers into the void.
  codex: [
    { event: 'preToolUse', command: 'can-write', matcher: 'Write|StrReplace|EditNotebook|Delete|ApplyPatch', timeout: 20 },
    { event: 'beforeShellExecution', command: 'can-write', matcher: null, timeout: 20 },
    { event: 'subagentStart', command: 'can-review', matcher: '.*reviewer', timeout: 20 },
    { event: 'stop', command: 'can-stop', matcher: null, timeout: 30 },
  ],
};
const OPTIONAL = {
  'claude-code': [
    { event: 'PostToolUse', command: 'fingerprint', matcher: 'Edit|Write|MultiEdit|NotebookEdit', timeout: 20 },
    { event: 'SubagentStop', command: 'release', matcher: null, timeout: 20 },
  ],
  codex: [{ event: 'subagentStop', command: 'release', matcher: '.*reviewer', timeout: 20 }],
};

const HARNESSES = {
  'claude-code': {
    file: join(homedir(), '.claude/settings.json'),
    shape: 'claude-code',
    limits: [],
  },
  codex: {
    // Codex reads user hooks from `~/.cursor/hooks.json`, and its schema carries a version.
    file: join(homedir(), '.cursor/hooks.json'),
    shape: 'codex',
    limits: [
      'sessionStart is not wired: Codex documents no output field that injects context there.',
      'stop is advisory, as everywhere: it becomes a follow-up message, never a hard stop.',
    ],
  },
};

const gateCommand = (gate, command, harness) => `node "${gate}" ${command} --hook --harness ${harness}`;

// One entry shape per harness. Claude Code nests the commands of an event under a matcher; Codex puts
// the command on the entry itself and versions the file.
const ENTRY = {
  'claude-code': (gate, harness, { command, matcher, timeout }) => ({
    ...(matcher ? { matcher } : {}),
    hooks: [{ type: 'command', command: gateCommand(gate, command, harness), timeout }],
  }),
  codex: (gate, harness, { command, matcher, timeout }) => ({
    type: 'command',
    command: gateCommand(gate, command, harness),
    ...(matcher ? { matcher } : {}),
    timeout,
  }),
};

function entries(gate, harness, wiring) {
  const hooks = {};
  for (const one of wiring) {
    hooks[one.event] = [...(hooks[one.event] ?? []), ENTRY[HARNESSES[harness].shape](gate, harness, one)];
  }
  return hooks;
}

const ours = entry => JSON.stringify(entry).includes(MARK);

function merge(current, wanted, shape) {
  const merged = { ...current, ...(shape === 'codex' ? { version: 1 } : {}), hooks: { ...current.hooks } };
  for (const [event, added] of Object.entries(wanted)) {
    merged.hooks[event] = [...(merged.hooks[event] ?? []).filter(entry => !ours(entry)), ...added];
  }
  return merged;
}

function withoutOurs(current) {
  const merged = { ...current, hooks: { ...current.hooks } };
  for (const [event, existing] of Object.entries(merged.hooks ?? {})) {
    const kept = existing.filter(entry => !ours(entry));
    if (kept.length === 0) delete merged.hooks[event];
    else merged.hooks[event] = kept;
  }
  return merged;
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw new Error(`${path} is not readable JSON: ${error.message}`);
  }
}

async function main() {
  const { values } = parseArgs({ options: {
    harness: { type: 'string', default: 'claude-code' },
    file: { type: 'string' },
    gate: { type: 'string' },
    optional: { type: 'boolean', default: false },
    check: { type: 'boolean', default: false },
    remove: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  } });
  if (values.help) {
    console.log([
      'usage: node scripts/install-gate-hooks.mjs [--harness claude-code|codex] [--optional] [--check] [--remove]',
      'harness: which harness to wire; a plugin install needs neither',
      'optional: also wire PostToolUse (eager fingerprint) and SubagentStop (release an abandoned window)',
      'check:    report what is missing without writing',
      'remove:   take out only the entries this installer added',
      'file:     override the harness settings file',
      'gate:     override the gate bundle path',
    ].join('\n'));
    return;
  }
  const harness = HARNESSES[values.harness];
  if (!harness) {
    throw new Error(`unknown harness ${values.harness}; known: ${Object.keys(HARNESSES).join(', ')}`);
  }
  const file = values.file ? resolve(values.file) : harness.file;
  const gate = values.gate ? resolve(values.gate) : resolve(ROOT, BUNDLE);
  const wiring = values.optional
    ? [...WIRING[values.harness], ...OPTIONAL[values.harness]]
    : WIRING[values.harness];
  const current = await readJson(file);
  const wanted = entries(gate, values.harness, wiring);
  const next = values.remove ? withoutOurs(current) : merge(current, wanted, harness.shape);
  if (JSON.stringify(current) === JSON.stringify(next)) {
    console.log(`hooks: current\nfile: ${file}`);
    return;
  }
  if (values.check) {
    console.log(`stale: ${file}\nhelp: node scripts/install-gate-hooks.mjs --harness ${values.harness}`);
    process.exitCode = 1;
    return;
  }
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(next, null, 2)}\n`);
  console.log([
    `hooks: ${values.remove ? 'removed' : 'wired'}`,
    `file: ${file}`,
    `events: ${Object.keys(values.remove ? current.hooks ?? {} : wanted).join(', ')}`,
    `gate: ${gate}`,
    ...harness.limits.map(limit => `limit: ${limit}`),
  ].join('\n'));
}

main().catch(error => {
  console.log(`error: ${error.message}\nhelp: node scripts/install-gate-hooks.mjs --help`);
  process.exitCode = 1;
});
