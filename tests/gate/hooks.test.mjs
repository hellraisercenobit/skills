import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import {
  MARKER, cleanup, declaration, designRecord, gateCommand, makeProject, reviewEnvelope,
} from './harness.mjs';

after(cleanup);

const SOURCE = 'export const priceOrder = (order: Order) => order.total;\n';
const pipe = document => ({ stdin: JSON.stringify(document) });
const event = document => ({ stdin: JSON.stringify(document) });

function project(marker = MARKER(['design-patterns'])) {
  return makeProject({ marker, files: { 'src/price-order.ts': SOURCE } });
}

test('SessionStart carries the compact status as additional context', () => {
  const app = project();
  const answer = app.gate(['status', '--hook', '--harness', 'claude-code'], event({
    hook_event_name: 'SessionStart',
    session_id: 'session-builder',
  }));
  assert.equal(answer.code, 0);
  const payload = answer.json();
  assert.equal(payload.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(payload.hookSpecificOutput.additionalContext, /Engineering suite gate/);
  assert.match(payload.hookSpecificOutput.additionalContext, /design-patterns/);
  assert.match(payload.hookSpecificOutput.additionalContext, /next: missing-declaration/);
});

test('SessionStart is silent in a repository that carries no marker', () => {
  const app = makeProject({ marker: null, files: { 'src/price-order.ts': SOURCE } });
  const answer = app.gate(['status', '--hook', '--harness', 'claude-code'], event({
    hook_event_name: 'SessionStart',
    session_id: 'session-builder',
  }));
  assert.equal(answer.code, 0);
  assert.equal(answer.stdout, '');
});

test('PreToolUse denies an edit inside a declared scope with no record', () => {
  const app = project();
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  const answer = app.gate(['can-write', '--hook', '--harness', 'claude-code'], event({
    hook_event_name: 'PreToolUse',
    session_id: 'session-builder',
    tool_name: 'Edit',
    tool_input: { file_path: 'src/price-order.ts', old_string: 'a', new_string: 'b' },
  }));
  assert.equal(answer.code, 0);
  const payload = answer.json();
  assert.equal(payload.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(payload.hookSpecificOutput.permissionDecisionReason, /no validated decision record/);
});

test('PreToolUse allows an edit outside every declared scope and answers nothing', () => {
  const app = project();
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  const answer = app.gate(['can-write', '--hook', '--harness', 'claude-code'], event({
    hook_event_name: 'PreToolUse',
    session_id: 'session-builder',
    tool_name: 'Write',
    tool_input: { file_path: 'docs/notes.md', content: 'notes' },
  }));
  assert.equal(answer.code, 0);
  assert.equal(answer.stdout, '');
});

test('PreToolUse denies a shell rewrite of a file inside a declared scope', () => {
  const app = project();
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  const answer = app.gate(['can-write', '--hook', '--harness', 'claude-code'], event({
    hook_event_name: 'PreToolUse',
    session_id: 'session-builder',
    tool_name: 'Bash',
    tool_input: { command: 'sed -i "" s/total/net/ src/price-order.ts' },
  }));
  assert.equal(answer.code, 0);
  assert.match(answer.json().hookSpecificOutput.permissionDecision, /deny/);
});

test('PreToolUse gates the dispatch of a registered reviewer agent', () => {
  const app = project();
  const answer = app.gate(['can-review', '--hook', '--harness', 'claude-code'], event({
    hook_event_name: 'PreToolUse',
    session_id: 'session-builder',
    tool_name: 'Task',
    tool_input: { subagent_type: 'design-pattern-reviewer', prompt: 'review' },
  }));
  assert.equal(answer.code, 0);
  assert.match(answer.json().hookSpecificOutput.permissionDecisionReason, /not-review-ready/);

  const other = app.gate(['can-review', '--hook', '--harness', 'claude-code'], event({
    hook_event_name: 'PreToolUse',
    session_id: 'session-builder',
    tool_name: 'Task',
    tool_input: { subagent_type: 'explore', prompt: 'look around' },
  }));
  assert.equal(other.stdout, '');
});

test('Stop blocks an incomplete task with the full status and honours reentrance', () => {
  const app = project();
  const blocked = app.gate(['can-stop', '--hook', '--harness', 'claude-code'], event({
    hook_event_name: 'Stop',
    session_id: 'session-builder',
  }));
  assert.equal(blocked.code, 0);
  const payload = blocked.json();
  assert.equal(payload.decision, 'block');
  assert.match(payload.reason, /## design-patterns/);

  const reentrant = app.gate(['can-stop', '--hook', '--harness', 'claude-code'], event({
    hook_event_name: 'Stop',
    session_id: 'session-builder',
    stop_hook_active: true,
  }));
  assert.equal(reentrant.stdout, '');
});

test('Stop allows a complete task', () => {
  const app = project();
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord()));
  app.write('src/tax-regime.ts', 'export const taxRegimes = {};\n');
  app.gate(['begin', '--dimension', 'design-patterns'], { session: 'session-reviewer' });
  app.gate(['attest', '--dimension', 'design-patterns', '--stdin'], {
    ...pipe(reviewEnvelope('design-patterns')), session: 'session-reviewer',
  });
  const answer = app.gate(['can-stop', '--hook', '--harness', 'claude-code'], event({
    hook_event_name: 'Stop',
    session_id: 'session-builder',
  }));
  assert.equal(answer.stdout, '');
  assert.equal(answer.code, 0);
});

test('SubagentStop releases the window a reviewer left open', () => {
  const app = project();
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord()));
  app.write('src/tax-regime.ts', 'export const taxRegimes = {};\n');
  app.gate(['begin', '--dimension', 'design-patterns'], { session: 'session-reviewer' });
  assert.equal(app.gate(['can-write', '--path', 'src/price-order.ts']).code, 2);

  const released = app.gate(['release', '--hook', '--harness', 'claude-code'], event({
    hook_event_name: 'SubagentStop',
    session_id: 'session-builder',
    agent_type: 'design-pattern-reviewer',
  }));
  assert.equal(released.code, 0);
  assert.equal(app.gate(['can-write', '--path', 'src/price-order.ts']).code, 0);
  assert.match(app.gate(['status', '--full']).stdout, /released windows: 1/);
});

test('a handoff makes the builder identity known, and a review is refused to it', () => {
  const app = project();
  const handoff = tool => app.gate(['can-write', '--hook', '--harness', 'claude-code'], event({
    hook_event_name: 'PreToolUse',
    session_id: 'session-builder',
    agent_id: 'agent-builder',
    agent_type: 'builder',
    tool_name: 'Bash',
    tool_input: { command: tool },
  }));

  handoff(`${gateCommand} declare --dimension design-patterns --stdin`);
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  handoff(`${gateCommand} record --dimension design-patterns --stdin`);
  app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord()));
  app.write('src/tax-regime.ts', 'export const taxRegimes = {};\n');

  handoff(`${gateCommand} begin --dimension design-patterns`);
  const refused = app.gate(['begin', '--dimension', 'design-patterns']);
  assert.equal(refused.code, 2);
  assert.match(refused.stdout, /refused: identity-refused/);
  assert.match(refused.stdout, /the builder of this task/);
});

test('a harness that reports an agent identifier and sends none refuses the review', () => {
  const app = project();
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord()));
  app.write('src/tax-regime.ts', 'export const taxRegimes = {};\n');
  const refused = app.gate(['begin', '--dimension', 'design-patterns', '--harness', 'claude-code'], {
    session: 'session-reviewer',
  });
  assert.equal(refused.code, 2);
  assert.match(refused.stdout, /refused: identity-refused/);
});

test('a marker that requires a verified identity refuses an unverifiable verdict', () => {
  const app = project({ ...MARKER(['design-patterns']), requireVerifiedIdentity: true });
  app.gate(['declare', '--dimension', 'design-patterns', '--stdin'], pipe(declaration('design-patterns')));
  app.gate(['record', '--dimension', 'design-patterns', '--stdin'], pipe(designRecord()));
  app.write('src/tax-regime.ts', 'export const taxRegimes = {};\n');
  app.gate(['begin', '--dimension', 'design-patterns'], { session: 'session-reviewer' });
  const refused = app.gate(['attest', '--dimension', 'design-patterns', '--stdin'], {
    ...pipe(reviewEnvelope('design-patterns')), session: 'session-reviewer',
  });
  assert.equal(refused.code, 2);
  assert.match(refused.stdout, /requires a verified agent identity/);
});

test('a gate failure under a hook blocks instead of approving', () => {
  const app = makeProject({ marker: MARKER(['invented-dimension']), files: { 'src/price-order.ts': SOURCE } });
  const answer = app.gate(['can-stop', '--hook', '--harness', 'claude-code'], event({
    hook_event_name: 'Stop',
    session_id: 'session-builder',
  }));
  assert.equal(answer.code, 2);
  assert.match(answer.stderr, /gate-failure/);
});
