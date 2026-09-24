import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import Ajv from 'ajv/dist/2020.js';

const SKILL = resolve('skills/engineering/agent-instruction-doctor');
const GUARDRAIL = join(SKILL, 'hooks/guardrail.mjs');
const REFERENCES = join(SKILL, 'references');

let counter = 0;

function session({ guardrail = GUARDRAIL } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'doctor-guardrail-'));
  const project = join(root, 'project');
  const home = join(root, 'home');
  const scratch = join(root, 'scratch');
  const temp = join(root, 'tmp');
  for (const dir of [join(project, '.claude/rules'), home, scratch, temp]) mkdirSync(dir, { recursive: true });
  writeFileSync(join(project, 'CLAUDE.md'), '# rules\n- no comments\n');
  writeFileSync(join(project, '.claude/rules/no-comments.md'), '---\npaths: src/**/*.ts\n---\nNo comments.\n');
  const id = `session-${process.pid}-${counter += 1}`;
  const manifest = join(scratch, 'agent-instruction-doctor/candidates.json');
  const ledger = join(temp, 'agent-instruction-doctor', `${id}.jsonl`);
  const base = { session_id: id, cwd: project, permission_mode: 'default', scratchpad_dir: scratch, transcript_path: join(root, 't.jsonl') };
  let calls = 0;
  const run = (command, event) => {
    const result = spawnSync(process.execPath, [guardrail, command], {
      encoding: 'utf8',
      input: JSON.stringify({ ...base, ...event }),
      env: { ...process.env, TMPDIR: temp, HOME: home },
    });
    assert.equal(result.status, 0, `${command}: ${result.stderr}`);
    calls += 1;
    return result.stdout.trim() === '' ? null : JSON.parse(result.stdout);
  };
  const prompt = text => run('prompt', { hook_event_name: 'UserPromptSubmit', prompt: text, prompt_id: `p${calls}` });
  const post = (tool_name, tool_input, tool_response = {}, extra = {}) => run('record', { hook_event_name: 'PostToolUse', tool_name, tool_input, tool_response, tool_use_id: `toolu_${calls}`, ...extra });
  const pre = (tool_name, tool_input) => run('can-write', { hook_event_name: 'PreToolUse', tool_name, tool_input, tool_use_id: `toolu_${calls}` });
  const stop = (last_assistant_message = 'done', stop_hook_active = false) => run('can-stop', { hook_event_name: 'Stop', last_assistant_message, stop_hook_active });
  const close = () => run('close', { hook_event_name: 'SessionEnd', reason: 'exit' });
  const discover = () => post('Bash', { command: `${SKILL}/scripts/discover-agent-config.sh --root "$PWD" --include-global --format markdown` }, { stdout: '# manifest', stderr: '' });
  const read = path => {
    const digest = existsSync(path) ? readFileSync(path) : '';
    return post('Read', { file_path: path }, { type: 'text', file: { filePath: path, content: String(digest) } });
  };
  const readReferences = () => ['targeted-audit.md', 'claude-code-sources.md', 'finding-taxonomy.md', 'report-format.md'].forEach(name => read(join(REFERENCES, name)));
  const candidates = (overrides = {}) => ({
    mode: 'targeted',
    symptom: 'comments keep appearing',
    candidates: [{
      id: 'F01',
      title: 'Narrow the no-comments rule scope',
      severity: 'Important',
      observed: ['.claude/rules/no-comments.md:2 - paths: src/**/*.ts'],
      affects: ['.claude/rules/no-comments.md'],
      patch: '--- a/.claude/rules/no-comments.md\n+++ b/.claude/rules/no-comments.md\n-paths: src/**/*.ts\n+paths: "**/*.ts"\n',
      relationship: 'independent',
    }],
    ...overrides,
  });
  const writeManifest = content => {
    mkdirSync(join(scratch, 'agent-instruction-doctor'), { recursive: true });
    const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    writeFileSync(manifest, text);
    return post('Write', { file_path: manifest, content: text }, { type: 'create', filePath: manifest });
  };
  const select = labels => post('AskUserQuestion',
    { questions: [{ question: 'Select repairs to apply', header: 'Repairs', options: labels.map(label => ({ label })), multiSelect: true }] },
    { questions: [], answers: { 'Select repairs to apply': labels.join(', ') }, annotations: {} });
  const diagnose = () => { prompt('/agent-instruction-doctor comments keep appearing'); discover(); readReferences(); writeManifest(candidates()); };
  const rule = join(project, '.claude/rules/no-comments.md');
  const dispose = () => rmSync(root, { recursive: true, force: true });
  return { project, home, scratch, manifest, ledger, rule, prompt, post, pre, stop, close, discover, read, readReferences, candidates, writeManifest, select, diagnose, dispose };
}

const withSession = (name, body) => test(name, () => {
  const s = session();
  try { body(s); } finally { s.dispose(); }
});

const skillCopyWithEditedWorkflow = () => {
  const copy = mkdtempSync(join(tmpdir(), 'doctor-skill-copy-'));
  cpSync(SKILL, copy, { recursive: true });
  appendFileSync(join(copy, 'SKILL.md'), '\n### 15. A step the contract does not know\n');
  return copy;
};

withSession('prompt arms on the doctor invocation and hands Claude the manifest path', s => {
  assert.equal(s.prompt('please refactor the parser'), null);
  assert.equal(existsSync(s.ledger), false);
  const armed = s.prompt('/agent-instruction-doctor comments keep appearing');
  assert.equal(armed.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.match(armed.hookSpecificOutput.additionalContext, new RegExp(s.manifest.replaceAll('.', '\\.')));
  assert.ok(existsSync(s.ledger), 'ledger created');
  assert.equal(s.prompt('/hellraisercenobit:agent-instruction-doctor').hookSpecificOutput.hookEventName, 'UserPromptSubmit');
});

withSession('the ledger holds digests, paths and ids but never file content', s => {
  s.prompt('/agent-instruction-doctor comments keep appearing');
  s.read(join(s.project, 'CLAUDE.md'));
  const text = readFileSync(s.ledger, 'utf8');
  assert.doesNotMatch(text, /no comments/);
  assert.match(text, /sha256:[0-9a-f]{64}/);
  for (const line of text.trim().split('\n')) {
    assert.match(JSON.parse(line).line_hash, /^sha256:[0-9a-f]{64}$/);
  }
});

withSession('writes are denied while the audit is read-only, except the manifest itself', s => {
  s.prompt('/agent-instruction-doctor comments keep appearing');
  const denied = s.pre('Write', { file_path: join(s.project, 'CLAUDE.md'), content: 'x' });
  assert.equal(denied.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(denied.hookSpecificOutput.permissionDecisionReason, /read-only/);
  const allowed = s.pre('Write', { file_path: s.manifest, content: '{}' });
  assert.equal(allowed.hookSpecificOutput.permissionDecision, 'allow');
  const edit = s.pre('Edit', { file_path: s.rule, old_string: 'a', new_string: 'b' });
  assert.equal(edit.hookSpecificOutput.permissionDecision, 'deny');
});

withSession('a write before any prompt arms the guardrail lazily and is denied', s => {
  const denied = s.pre('Write', { file_path: join(s.project, 'CLAUDE.md'), content: 'x' });
  assert.equal(denied.hookSpecificOutput.permissionDecision, 'deny');
  assert.ok(existsSync(s.ledger));
});

withSession('Stop is blocked until the discovery script ran and the manifest exists', s => {
  s.prompt('/agent-instruction-doctor comments keep appearing');
  s.readReferences();
  const noDiscovery = s.stop();
  assert.equal(noDiscovery.decision, 'block');
  assert.match(noDiscovery.reason, /D1/);
  assert.match(noDiscovery.reason, /discover-agent-config\.sh/);
  s.discover();
  const noManifest = s.stop();
  assert.equal(noManifest.decision, 'block');
  assert.doesNotMatch(noManifest.reason, /D1/);
  assert.match(noManifest.reason, /D5/);
  assert.match(noManifest.reason, new RegExp(s.manifest.replaceAll('.', '\\.')));
  s.writeManifest(s.candidates());
  assert.equal(s.stop(), null);
});

withSession('a discovery run inside a subagent satisfies nothing', s => {
  s.prompt('/agent-instruction-doctor comments keep appearing');
  s.post('Bash', { command: `${SKILL}/scripts/discover-agent-config.sh --root "$PWD"` }, {}, { agent_id: 'agent-1', agent_type: 'Explore' });
  s.readReferences();
  s.writeManifest(s.candidates());
  assert.match(s.stop().reason, /D1/);
});

withSession('a source modified during diagnosis blocks Stop and names the file', s => {
  s.diagnose();
  writeFileSync(join(s.project, 'CLAUDE.md'), '# rules\n- no comments\n- edited during audit\n');
  const blocked = s.stop();
  assert.equal(blocked.decision, 'block');
  assert.match(blocked.reason, /D4/);
  assert.match(blocked.reason, /CLAUDE\.md/);
});

withSession('an invalid manifest is rejected with the exact defect', s => {
  s.prompt('/agent-instruction-doctor comments keep appearing');
  const broken = s.writeManifest('{ not json');
  assert.equal(broken.decision, 'block');
  assert.match(broken.reason, /JSON/);
  const missing = s.writeManifest(s.candidates({ candidates: [{ id: 'F1', title: '', severity: 'High', observed: [], affects: [], patch: '', relationship: '' }] }));
  assert.equal(missing.decision, 'block');
  for (const path of ['candidates[0].id', 'candidates[0].title', 'candidates[0].severity', 'candidates[0].observed', 'candidates[0].affects', 'candidates[0].patch', 'candidates[0].relationship']) {
    assert.match(missing.reason, new RegExp(path.replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('.', '\\.')), path);
  }
  assert.equal(s.writeManifest(s.candidates()), null);
});

withSession('soft obligations reach the user as a systemMessage without prolonging the turn', s => {
  s.prompt('/agent-instruction-doctor comments keep appearing');
  s.discover();
  s.writeManifest(s.candidates());
  const soft = s.stop();
  assert.equal(soft.decision, undefined);
  assert.match(soft.systemMessage, /D2/);
  assert.match(soft.systemMessage, /targeted-audit\.md/);
  assert.match(soft.systemMessage, /D3/);
  s.read(join(REFERENCES, 'targeted-audit.md'));
  s.read(join(REFERENCES, 'finding-taxonomy.md'));
  s.read(join(REFERENCES, 'report-format.md'));
  assert.equal(s.stop(), null);
});

withSession('a general audit wants one harness reference instead of the targeted method', s => {
  s.prompt('/agent-instruction-doctor');
  s.discover();
  s.writeManifest(s.candidates({ mode: 'general', symptom: '' }));
  s.read(join(REFERENCES, 'finding-taxonomy.md'));
  s.read(join(REFERENCES, 'report-format.md'));
  assert.match(s.stop().systemMessage, /claude-code-sources\.md|codex-sources\.md/);
  s.read(join(REFERENCES, 'codex-sources.md'));
  assert.equal(s.stop(), null);
});

withSession('a selection outside the manifest is refused, a valid one opens the applying state', s => {
  s.diagnose();
  const unknown = s.select(['F01', 'F03']);
  assert.equal(unknown.decision, 'block');
  assert.match(unknown.reason, /F03/);
  assert.equal(s.pre('Edit', { file_path: s.rule, old_string: 'a', new_string: 'b' }).hookSpecificOutput.permissionDecision, 'deny');
  assert.equal(s.select(['F01']), null);
  const noReread = s.pre('Edit', { file_path: s.rule, old_string: 'a', new_string: 'b' });
  assert.equal(noReread.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(noReread.hookSpecificOutput.permissionDecisionReason, /re-read/);
  s.read(s.rule);
  assert.equal(s.pre('Edit', { file_path: s.rule, old_string: 'a', new_string: 'b' }), null);
});

withSession('a file outside the selected candidates stays locked while applying', s => {
  s.diagnose();
  s.select(['F01']);
  s.read(join(s.project, 'CLAUDE.md'));
  const denied = s.pre('Edit', { file_path: join(s.project, 'CLAUDE.md'), old_string: 'a', new_string: 'b' });
  assert.equal(denied.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(denied.hookSpecificOutput.permissionDecisionReason, /not selected/);
});

withSession('a source changed since its re-read, or a candidate whose patch changed, is stale', s => {
  s.diagnose();
  s.select(['F01']);
  s.read(s.rule);
  writeFileSync(s.rule, 'changed by someone else\n');
  const changed = s.pre('Edit', { file_path: s.rule, old_string: 'a', new_string: 'b' });
  assert.equal(changed.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(changed.hookSpecificOutput.permissionDecisionReason, /changed since/);
  s.read(s.rule);
  const manifest = s.candidates();
  manifest.candidates[0].patch += '+ extra line\n';
  writeFileSync(s.manifest, JSON.stringify(manifest));
  const stale = s.pre('Edit', { file_path: s.rule, old_string: 'a', new_string: 'b' });
  assert.equal(stale.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(stale.hookSpecificOutput.permissionDecisionReason, /stale/);
});

withSession('the checklist fallback accepts a reply made of candidate ids', s => {
  s.diagnose();
  assert.equal(s.prompt('F01'), null);
  s.read(s.rule);
  assert.equal(s.pre('Edit', { file_path: s.rule, old_string: 'a', new_string: 'b' }), null);
});

withSession('Stop after applying wants a status per selected id, then the guardrail steps aside', s => {
  s.diagnose();
  s.select(['F01']);
  s.read(s.rule);
  const missing = s.stop('I patched the rule.');
  assert.equal(missing.decision, 'block');
  assert.match(missing.reason, /D8/);
  assert.match(missing.reason, /F01/);
  assert.equal(s.stop('## Applied repairs\n- [x] F01 - applied\n'), null);
  assert.equal(s.pre('Write', { file_path: join(s.project, 'anything.md'), content: 'later work' }), null);
  assert.equal(s.stop('unrelated later turn'), null);
});

withSession('the guardrail releases after two blocks instead of fighting the platform cap', s => {
  s.prompt('/agent-instruction-doctor comments keep appearing');
  assert.equal(s.stop().decision, 'block');
  assert.equal(s.stop('still nothing', true).decision, 'block');
  const released = s.stop('still nothing', true);
  assert.equal(released.decision, undefined);
  assert.match(released.systemMessage, /released/);
});

withSession('close removes the ledger and the manifest of the session', s => {
  s.diagnose();
  assert.ok(existsSync(s.ledger));
  assert.ok(existsSync(s.manifest));
  assert.equal(s.close(), null);
  assert.equal(existsSync(s.ledger), false);
  assert.equal(existsSync(s.manifest), false);
});

withSession('arming purges ledgers older than the contract age', s => {
  const old = join(s.ledger, '../stale-session.jsonl');
  mkdirSync(join(s.ledger, '..'), { recursive: true });
  writeFileSync(old, '{}\n');
  const past = new Date(Date.now() - 48 * 3600 * 1000);
  utimesSync(old, past, past);
  s.prompt('/agent-instruction-doctor');
  assert.equal(existsSync(old), false);
});

withSession('an internal failure never blocks: it surfaces as a systemMessage', s => {
  s.prompt('/agent-instruction-doctor comments keep appearing');
  writeFileSync(s.ledger, 'not json at all\n');
  const out = s.stop();
  assert.equal(out.decision, undefined);
  assert.match(out.systemMessage, /guardrail/);
});

withSession('a tool event before any prompt arms the guardrail lazily through record too', s => {
  s.read(join(s.project, 'CLAUDE.md'));
  assert.ok(existsSync(s.ledger));
  assert.equal(s.pre('Write', { file_path: join(s.project, 'CLAUDE.md'), content: 'x' }).hookSpecificOutput.permissionDecision, 'deny');
});

withSession('reads between two blocked Stops do not reset the release counter', s => {
  s.prompt('/agent-instruction-doctor comments keep appearing');
  assert.equal(s.stop().decision, 'block');
  s.read(join(s.project, 'CLAUDE.md'));
  assert.equal(s.stop('still nothing', true).decision, 'block');
  s.read(join(s.project, 'CLAUDE.md'));
  assert.match(s.stop('still nothing', true).systemMessage, /released/);
});

withSession('a Stop without any ledger says that nothing was verified', s => {
  const out = s.stop();
  assert.equal(out.decision, undefined);
  assert.match(out.systemMessage, /nothing was verified/);
});

withSession('a ledger that cannot be written is reported at invocation instead of failing silently', s => {
  mkdirSync(join(s.ledger, '../..'), { recursive: true });
  writeFileSync(join(s.ledger, '..'), 'a file where the ledger directory should be\n');
  const out = s.prompt('/agent-instruction-doctor comments keep appearing');
  assert.match(out.hookSpecificOutput.additionalContext, /could not start/);
  assert.match(out.hookSpecificOutput.additionalContext, /tell the user/i);
});

test('a SKILL.md edited without its contract is reported at invocation', () => {
  const copy = skillCopyWithEditedWorkflow();
  const s = session({ guardrail: join(copy, 'hooks/guardrail.mjs') });
  try {
    const out = s.prompt('/agent-instruction-doctor comments keep appearing');
    assert.match(out.hookSpecificOutput.additionalContext, /differs from the version hooks\/contract\.json describes/);
  } finally {
    s.dispose();
    rmSync(copy, { recursive: true, force: true });
  }
});

withSession('an option label may carry a title after the id, but must start with it', s => {
  s.diagnose();
  const noId = s.select(['Narrow the no-comments rule scope']);
  assert.equal(noId.decision, 'block');
  assert.match(noId.reason, /must start with the candidate id/);
  assert.equal(s.select(['F01 - Narrow the no-comments rule scope']), null);
  s.read(s.rule);
  assert.equal(s.pre('Edit', { file_path: s.rule, old_string: 'a', new_string: 'b' }), null);
});

withSession('a symptom keeps the audit targeted even when the manifest says general', s => {
  s.prompt('/agent-instruction-doctor comments keep appearing');
  s.discover();
  s.writeManifest(s.candidates({ mode: 'general' }));
  s.read(join(REFERENCES, 'codex-sources.md'));
  s.read(join(REFERENCES, 'finding-taxonomy.md'));
  s.read(join(REFERENCES, 'report-format.md'));
  assert.match(s.stop().systemMessage, /targeted-audit\.md/);
});

withSession('the manifest validator agrees with candidates.schema.json on every fixture', s => {
  s.prompt('/agent-instruction-doctor comments keep appearing');
  const schema = JSON.parse(readFileSync(join(SKILL, 'hooks/candidates.schema.json'), 'utf8'));
  const validate = new Ajv({ strict: true }).compile(schema);
  const one = s.candidates().candidates[0];
  const fixtures = [
    s.candidates(),
    s.candidates({ mode: 'general', symptom: '', candidates: [] }),
    s.candidates({ candidates: [one, { ...one, id: 'F02' }] }),
    s.candidates({ mode: 'broad' }),
    s.candidates({ symptom: null }),
    s.candidates({ extra: true }),
    s.candidates({ candidates: [{ ...one, id: 'F1' }] }),
    s.candidates({ candidates: [{ ...one, severity: 'High' }] }),
    s.candidates({ candidates: [{ ...one, observed: [] }] }),
    s.candidates({ candidates: [{ ...one, affects: [''] }] }),
    s.candidates({ candidates: [{ ...one, patch: '' }] }),
    s.candidates({ candidates: [{ ...one, note: 'x' }] }),
    s.candidates({ candidates: [one, one] }),
  ];
  for (const fixture of fixtures) {
    const expected = validate(fixture) && new Set(fixture.candidates.map(c => c.id)).size === fixture.candidates.length;
    assert.equal(s.writeManifest(fixture) === null, expected, JSON.stringify(fixture).slice(0, 120));
  }
});
