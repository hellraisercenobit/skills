import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
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
  const pre = (tool_name, tool_input) => run('pre-tool-use', { hook_event_name: 'PreToolUse', tool_name, tool_input, tool_use_id: `toolu_${calls}` });
  const stop = (last_assistant_message = 'done', stop_hook_active = false) => run('can-stop', { hook_event_name: 'Stop', last_assistant_message, stop_hook_active });
  const close = () => run('close', { hook_event_name: 'SessionEnd', reason: 'exit' });
  const discover = () => post('Bash', { command: `${SKILL}/scripts/discover-agent-config.sh --root "$PWD" --include-global --format markdown` }, { stdout: '# Agent configuration candidate manifest\n', stderr: '' });
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
  const ruleEdit = { file_path: rule, old_string: 'paths: src/**/*.ts', new_string: 'paths: "**/*.ts"' };
  const ledgerLines = () => readFileSync(ledger, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const sources = () => ledgerLines().filter(line => line.event === 'source').map(line => line.subject);
  const dispose = () => rmSync(root, { recursive: true, force: true });
  return { project, home, scratch, manifest, ledger, ledgerLines, sources, rule, ruleEdit, prompt, post, pre, stop, close, discover, read, readReferences, candidates, writeManifest, select, diagnose, dispose };
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
  assert.equal(s.pre('Edit', s.ruleEdit), null);
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
  assert.equal(s.pre('Edit', s.ruleEdit), null);
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

withSession('a discovery re-run between two blocked Stops does not reset the release counter', s => {
  s.prompt('/agent-instruction-doctor comments keep appearing');
  assert.equal(s.stop().decision, 'block');
  s.discover();
  assert.equal(s.stop('still nothing', true).decision, 'block');
  s.discover();
  assert.match(s.stop('still nothing', true).systemMessage, /released/);
});

withSession('a manifest rewritten between two blocked Stops does not reset the release counter', s => {
  s.prompt('/agent-instruction-doctor comments keep appearing');
  s.writeManifest(s.candidates());
  assert.equal(s.stop().decision, 'block');
  s.writeManifest(s.candidates({ symptom: 'comments keep appearing in tests' }));
  assert.equal(s.stop('still nothing', true).decision, 'block');
  s.writeManifest(s.candidates({ symptom: 'comments keep appearing in specs' }));
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
  assert.equal(s.pre('Edit', s.ruleEdit), null);
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

withSession('arming outside a repository walks two levels and only the instruction folders of .codex', s => {
  mkdirSync(join(s.project, 'team/app/src'), { recursive: true });
  mkdirSync(join(s.project, '.codex/sessions'), { recursive: true });
  writeFileSync(join(s.project, 'team/CLAUDE.md'), '- shallow\n');
  writeFileSync(join(s.project, 'team/app/src/CLAUDE.md'), '- deep\n');
  writeFileSync(join(s.project, '.codex/sessions/rollout.jsonl'), '{}\n');
  s.prompt('/agent-instruction-doctor comments keep appearing');
  const sources = s.sources();
  assert.ok(sources.some(path => path.endsWith('/project/team/CLAUDE.md')));
  assert.ok(!sources.some(path => path.endsWith('/team/app/src/CLAUDE.md')));
  assert.ok(!sources.some(path => path.endsWith('/.codex/sessions/rollout.jsonl')));
});

test('a discovery that defers SIGTERM is still cut at the contract timeout', () => {
  const copy = mkdtempSync(join(tmpdir(), 'doctor-skill-copy-'));
  cpSync(SKILL, copy, { recursive: true });
  writeFileSync(join(copy, 'scripts/discover-agent-config.sh'), "trap 'exit 143' TERM\nsleep 5\n");
  const contract = JSON.parse(readFileSync(join(copy, 'hooks/contract.json'), 'utf8'));
  writeFileSync(join(copy, 'hooks/contract.json'), JSON.stringify({ ...contract, discovery_timeout_ms: 300 }));
  const s = session({ guardrail: join(copy, 'hooks/guardrail.mjs') });
  try {
    const started = Date.now();
    const out = s.prompt('/agent-instruction-doctor comments keep appearing');
    assert.ok(Date.now() - started < 3000);
    assert.match(out.hookSpecificOutput.additionalContext, /discovery exceeded 300 ms/);
  } finally {
    s.dispose();
    rmSync(copy, { recursive: true, force: true });
  }
});

withSession('a lazy arming hands Claude the manifest path at the first recorded tool call', s => {
  const context = s.read(join(s.project, 'CLAUDE.md'))?.hookSpecificOutput?.additionalContext ?? '';
  assert.match(context, new RegExp(s.manifest.replaceAll('.', '\\.')));
  assert.equal(s.read(join(s.project, 'CLAUDE.md')), null);
});

withSession('a source changed through Bash is reported on that Bash call, before Stop', s => {
  s.prompt('/agent-instruction-doctor comments keep appearing');
  assert.equal(s.post('Bash', { command: 'ls' }, { stdout: '' }), null);
  appendFileSync(join(s.project, 'CLAUDE.md'), '- edited through the shell\n');
  const out = s.post('Bash', { command: "echo '- edited through the shell' >> CLAUDE.md" }, { stdout: '' });
  assert.equal(out?.decision, 'block');
  assert.match(out.reason, /CLAUDE\.md/);
});

withSession('only a discovery run that printed its manifest satisfies D1', s => {
  s.prompt('/agent-instruction-doctor comments keep appearing');
  s.readReferences();
  s.writeManifest(s.candidates());
  s.post('Bash', { command: `cat ${SKILL}/scripts/discover-agent-config.sh` }, { stdout: '#!/bin/sh\nset -eu\n' });
  assert.match(s.stop()?.reason ?? '', /D1/);
});

withSession('a negated status after an id does not satisfy D8', s => {
  s.diagnose();
  s.select(['F01']);
  assert.match(s.stop('F01 was not applied: out of time.')?.reason ?? '', /D8/);
  assert.equal(s.stop('- [x] F01 - applied'), null);
});

withSession('each user-editable source is fingerprinted once and harness-synced skills are left out', s => {
  const synced = join(s.home, '.claude/skills/synced/org_user/pptx/SKILL.md');
  mkdirSync(join(synced, '..'), { recursive: true });
  writeFileSync(synced, '# synced by the harness\n');
  s.prompt('/agent-instruction-doctor comments keep appearing');
  const subjects = s.sources();
  assert.ok(subjects.some(path => path.endsWith('/project/CLAUDE.md')));
  assert.equal(subjects.length, new Set(subjects).size);
  assert.ok(!subjects.some(path => path.includes('/.claude/skills/synced/')));
});

withSession('a free-text note next to selected ids keeps the selection', s => {
  s.diagnose();
  assert.equal(s.select(['F01 - Narrow the no-comments rule scope', 'also fix the related risks']), null);
  s.read(s.rule);
  assert.equal(s.pre('Edit', s.ruleEdit), null);
});

withSession('the manifest is revised with Write only, so every revision is recorded', s => {
  s.diagnose();
  const edit = s.pre('Edit', { file_path: s.manifest, old_string: 'a', new_string: 'b' });
  assert.equal(edit?.hookSpecificOutput?.permissionDecision, 'deny');
  assert.equal(s.pre('Write', { file_path: s.manifest, content: '{}' }).hookSpecificOutput.permissionDecision, 'allow');
});

withSession('a selected label that holds a comma arrives quoted and still selects its id', s => {
  s.diagnose();
  const answers = { 'Select repairs to apply': '"F01 - Narrow the rule, scope"' };
  assert.equal(s.post('AskUserQuestion', { questions: [] }, { questions: [], answers, annotations: {} }), null);
  s.read(s.rule);
  assert.equal(s.pre('Edit', s.ruleEdit), null);
});

withSession('an edit that changes lines the selected patch does not hold is denied', s => {
  s.diagnose();
  s.select(['F01']);
  s.read(s.rule);
  const stray = s.pre('Edit', { file_path: s.rule, old_string: 'paths: src/**/*.ts', new_string: 'paths: anything/**' });
  assert.equal(stray?.hookSpecificOutput?.permissionDecision, 'deny');
  assert.match(stray.hookSpecificOutput.permissionDecisionReason, /paths: anything\/\*\*/);
  const strayMulti = s.pre('MultiEdit', { file_path: s.rule, edits: [s.ruleEdit, { old_string: 'No comments.', new_string: 'Comments welcome.' }] });
  assert.equal(strayMulti?.hookSpecificOutput?.permissionDecision, 'deny');
  assert.equal(s.pre('Edit', s.ruleEdit), null);
});

withSession('a whole-file Write is held to the selected patch line by line', s => {
  s.diagnose();
  s.select(['F01']);
  s.read(s.rule);
  const patched = readFileSync(s.rule, 'utf8').replace('paths: src/**/*.ts', 'paths: "**/*.ts"');
  assert.equal(s.pre('Write', { file_path: s.rule, content: patched }), null);
  assert.equal(s.pre('Write', { file_path: s.rule, content: `${patched}Extra rule.\n` })?.hookSpecificOutput?.permissionDecision, 'deny');
});

withSession('an edit may apply any selected candidate that lists the file', s => {
  s.prompt('/agent-instruction-doctor comments keep appearing');
  s.discover();
  s.readReferences();
  const [first] = s.candidates().candidates;
  const second = { ...first, id: 'F02', patch: '--- a/.claude/rules/no-comments.md\n+++ b/.claude/rules/no-comments.md\n-No comments.\n+No comments, no docstrings.\n' };
  s.writeManifest(s.candidates({ candidates: [first, second] }));
  s.select(['F01', 'F02']);
  s.read(s.rule);
  assert.equal(s.pre('Edit', { file_path: s.rule, old_string: 'No comments.', new_string: 'No comments, no docstrings.' }), null);
});

withSession('a deletion the selected patch holds is allowed whatever the trailing newline', s => {
  s.prompt('/agent-instruction-doctor comments keep appearing');
  s.discover();
  s.readReferences();
  const [first] = s.candidates().candidates;
  s.writeManifest(s.candidates({ candidates: [{ ...first, patch: '--- a/.claude/rules/no-comments.md\n+++ b/.claude/rules/no-comments.md\n-No comments.\n' }] }));
  s.select(['F01']);
  s.read(s.rule);
  assert.equal(s.pre('Edit', { file_path: s.rule, old_string: 'No comments.', new_string: '' }), null);
  assert.equal(s.pre('Edit', { file_path: s.rule, old_string: '---\nNo comments.\n', new_string: '---\n' }), null);
});

const selectionQuestion = labels => ({ questions: [{ question: 'Select repairs to apply', header: 'Repairs', multiSelect: true, options: labels.map(label => ({ label, description: 'd' })) }] });

withSession('the selection question shows the user the manifest patches it will enforce', s => {
  s.diagnose();
  const out = s.pre('AskUserQuestion', selectionQuestion(['F01 - Narrow the no-comments rule scope']));
  assert.match(out?.systemMessage ?? '', /F01 - Narrow the no-comments rule scope/);
  assert.match(out.systemMessage, /-paths: src\/\*\*\/\*\.ts\n\+paths: "\*\*\/\*\.ts"/);
});

withSession('a selection question naming an id outside the manifest is denied before it is asked', s => {
  s.diagnose();
  const out = s.pre('AskUserQuestion', selectionQuestion(['F01 - Narrow the no-comments rule scope', 'F07 - Something never proposed']));
  assert.equal(out?.hookSpecificOutput?.permissionDecision, 'deny');
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /F07/);
});

withSession('a selection question over a manifest changed since it was recorded is denied', s => {
  s.diagnose();
  writeFileSync(s.manifest, JSON.stringify(s.candidates({ symptom: 'edited behind the guardrail' })));
  const out = s.pre('AskUserQuestion', selectionQuestion(['F01']));
  assert.equal(out?.hookSpecificOutput?.permissionDecision, 'deny');
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /changed since/);
});

withSession('a question that offers no candidate id passes untouched', s => {
  s.prompt('/agent-instruction-doctor comments keep appearing');
  assert.equal(s.pre('AskUserQuestion', selectionQuestion(['Yes', 'No'])), null);
  s.discover();
  s.readReferences();
  s.writeManifest(s.candidates());
  assert.equal(s.pre('AskUserQuestion', selectionQuestion(['Yes', 'No'])), null);
});

withSession('a skill linked into a resource folder is fingerprinted through its link', s => {
  const target = join(s.home, 'checkout/skills/linked-skill');
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, 'SKILL.md'), '# linked\n');
  mkdirSync(join(s.home, '.claude/skills'), { recursive: true });
  symlinkSync(target, join(s.home, '.claude/skills/linked-skill'));
  s.prompt('/agent-instruction-doctor comments keep appearing');
  const subjects = s.sources();
  assert.ok(subjects.some(path => path.endsWith('/.claude/skills/linked-skill/SKILL.md')));
});

withSession('a file reached through several links is fingerprinted once', s => {
  const target = join(s.home, 'checkout/skills/shared-skill');
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, 'SKILL.md'), '# shared\n');
  for (const folder of ['.claude/skills', '.agents/skills']) {
    mkdirSync(join(s.home, folder), { recursive: true });
    symlinkSync(target, join(s.home, folder, 'shared-skill'));
  }
  s.prompt('/agent-instruction-doctor comments keep appearing');
  const subjects = s.sources();
  assert.equal(subjects.filter(path => path.endsWith('/shared-skill/SKILL.md')).length, 1);
});

withSession('inside a repository the whole .codex folder is still listed', s => {
  spawnSync('git', ['init', '-q', s.project]);
  mkdirSync(join(s.project, '.codex/notes'), { recursive: true });
  writeFileSync(join(s.project, '.codex/notes/team.md'), '- team\n');
  s.prompt('/agent-instruction-doctor comments keep appearing');
  assert.ok(s.sources().some(path => path.endsWith('/.codex/notes/team.md')));
});

withSession('a selection question asked before the manifest is written is denied', s => {
  s.prompt('/agent-instruction-doctor comments keep appearing');
  const out = s.pre('AskUserQuestion', selectionQuestion(['F01 - Narrow the no-comments rule scope']));
  assert.equal(out?.hookSpecificOutput?.permissionDecision, 'deny');
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /candidates\.json/);
});

withSession('an edit may add a patch line only as many times as the patch adds it', s => {
  s.diagnose();
  s.select(['F01']);
  s.read(s.rule);
  const twice = s.pre('Edit', { file_path: s.rule, old_string: 'paths: src/**/*.ts', new_string: 'paths: "**/*.ts"\npaths: "**/*.ts"' });
  assert.equal(twice?.hookSpecificOutput?.permissionDecision, 'deny');
});

withSession('a patch whose headers name another file allows no change to this one', s => {
  s.prompt('/agent-instruction-doctor comments keep appearing');
  s.discover();
  s.readReferences();
  const [first] = s.candidates().candidates;
  s.writeManifest(s.candidates({ candidates: [{ ...first, patch: '--- a/rules/other.md\n+++ b/rules/other.md\n-No comments.\n' }] }));
  s.select(['F01']);
  s.read(s.rule);
  const deletion = s.pre('Edit', { file_path: s.rule, old_string: 'No comments.\n', new_string: '' });
  assert.equal(deletion?.hookSpecificOutput?.permissionDecision, 'deny');
});

withSession('only offered option labels count as a selection, a typed note never does', s => {
  s.diagnose();
  const offered = selectionQuestion(['F01 - Narrow the no-comments rule scope']);
  const answers = { 'Select repairs to apply': 'F01 - Narrow the no-comments rule scope, F02 not wanted please' };
  assert.equal(s.post('AskUserQuestion', offered, { questions: [], answers, annotations: {} }), null);
  assert.deepEqual(s.ledgerLines().filter(line => line.event === 'selection').at(-1)?.selected, ['F01']);
});

withSession('harness-synced skills are left out through links, and only under the home folder', s => {
  spawnSync('git', ['init', '-q', s.project]);
  const synced = join(s.home, '.claude/skills/synced/org/pptx');
  mkdirSync(synced, { recursive: true });
  writeFileSync(join(synced, 'SKILL.md'), '# synced\n');
  mkdirSync(join(s.home, '.agents/skills'), { recursive: true });
  symlinkSync(synced, join(s.home, '.agents/skills/pptx'));
  mkdirSync(join(s.project, 'fixtures/.claude/skills/synced/demo'), { recursive: true });
  writeFileSync(join(s.project, 'fixtures/.claude/skills/synced/demo/SKILL.md'), '# fixture\n');
  s.prompt('/agent-instruction-doctor comments keep appearing');
  assert.ok(!s.sources().some(path => path.endsWith('/.agents/skills/pptx/SKILL.md')));
  assert.ok(s.sources().some(path => path.endsWith('/fixtures/.claude/skills/synced/demo/SKILL.md')));
});

withSession('a status after a bold or code-formatted id satisfies D8', s => {
  s.diagnose();
  s.select(['F01']);
  assert.equal(s.stop('- [x] **F01** - applied'), null);
});
