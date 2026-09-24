import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const SKILL = 'skills/engineering/agent-instruction-doctor';
const skillMarkdown = readFileSync(join(SKILL, 'SKILL.md'), 'utf8');
const contract = JSON.parse(readFileSync(join(SKILL, 'hooks/contract.json'), 'utf8'));

const RESOLVER = [
  "sh -c 'for f in \"$CLAUDE_PLUGIN_ROOT/hooks/guardrail.mjs\" \"$CLAUDE_PLUGIN_ROOT/skills/engineering/agent-instruction-doctor/hooks/guardrail.mjs\";",
  'do [ -f "$f" ] && command -v node >/dev/null && exec node "$f" "$@"; done;',
  '[ "$1" = prompt ] && printf %s "{\\"hookSpecificOutput\\":{\\"hookEventName\\":\\"UserPromptSubmit\\",\\"additionalContext\\":\\"agent-instruction-doctor guardrail disabled: guardrail.mjs or node not found. Tell the user before continuing.\\"}}";',
  "exit 0' sh",
].join(' ');

const WIRING = [
  { event: 'UserPromptSubmit', matcher: null, command: 'prompt', timeout: 20 },
  { event: 'PreToolUse', matcher: 'Edit|Write|MultiEdit|NotebookEdit', command: 'can-write', timeout: 10 },
  { event: 'PostToolUse', matcher: 'Bash|Read|Write|AskUserQuestion', command: 'record', timeout: 10 },
  { event: 'Stop', matcher: null, command: 'can-stop', timeout: 30 },
  { event: 'SessionEnd', matcher: null, command: 'close', timeout: 10 },
];

export const hookCommand = command => `${RESOLVER} ${command}`;

function frontmatterHooks(markdown) {
  const frontmatter = /^---\n([\s\S]*?)\n---/.exec(markdown)?.[1] ?? '';
  const lines = frontmatter.split('\n');
  const start = lines.findIndex(line => line === 'hooks:');
  assert.notEqual(start, -1, 'SKILL.md frontmatter declares hooks');
  const declared = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break;
    const event = /^  ([A-Za-z]+):$/.exec(line)?.[1];
    if (event) declared.push({ event, matcher: null, command: null, timeout: null });
    const current = declared.at(-1);
    const matcher = /^\s+- matcher: "(.*)"$/.exec(line)?.[1];
    if (matcher) current.matcher = matcher;
    const command = /^\s+command: (".*")$/.exec(line)?.[1];
    if (command) current.command = JSON.parse(command);
    const timeout = /^\s+timeout: (\d+)$/.exec(line)?.[1];
    if (timeout) current.timeout = Number(timeout);
  }
  return declared;
}

test('the contract records the sha256 of the SKILL.md it describes', () => {
  const actual = `sha256:${createHash('sha256').update(skillMarkdown).digest('hex')}`;
  assert.equal(contract.skill_sha256, actual,
    `hooks/contract.json skill_sha256 must be ${actual}: the workflow changed, review the obligations then update the hash`);
});

test('the frontmatter wires every event of the contract with the canonical resolver', () => {
  const declared = frontmatterHooks(skillMarkdown);
  assert.deepEqual(declared, WIRING.map(one => ({ ...one, command: hookCommand(one.command) })));
  const events = new Set(declared.map(one => one.event));
  for (const obligation of contract.obligations) {
    assert.ok(events.has(obligation.event), `${obligation.id} needs a ${obligation.event} hook`);
  }
});

test('the resolver runs the guardrail from a personal install, a symlinked personal install and a plugin install', () => {
  const linked = mkdtempSync(join(tmpdir(), 'linked-skills-'));
  const symlink = join(linked, 'agent-instruction-doctor');
  symlinkSync(resolve(SKILL), symlink);
  try {
    for (const base of [SKILL, symlink, '.']) {
      const result = spawnSync('sh', ['-c', hookCommand('self-check')], {
        encoding: 'utf8',
        env: { ...process.env, CLAUDE_PLUGIN_ROOT: base },
        input: '{}',
      });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /guardrail: /, `self-check from base ${base}`);
    }
  } finally {
    rmSync(linked, { recursive: true, force: true });
  }
});

test('the resolver stays visible on the prompt event and silent elsewhere when the guardrail is missing', () => {
  const empty = mkdtempSync(join(tmpdir(), 'no-guardrail-'));
  try {
    const run = command => spawnSync('sh', ['-c', hookCommand(command)], {
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PLUGIN_ROOT: empty },
      input: '{}',
    });
    const prompt = run('prompt');
    assert.equal(prompt.status, 0);
    assert.deepEqual(JSON.parse(prompt.stdout), {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: 'agent-instruction-doctor guardrail disabled: guardrail.mjs or node not found. Tell the user before continuing.',
      },
    });
    for (const command of ['can-write', 'record', 'can-stop', 'close']) {
      const silent = run(command);
      assert.equal(silent.status, 0);
      assert.equal(silent.stdout, '');
    }
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});
