import { readFileSync } from 'node:fs';

export function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

export function readHookEvent() {
  const raw = readStdin().trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function hookEventName(event) {
  return event.hook_event_name ?? event.hookEventName ?? event.event ?? null;
}

export function hookAgent(event) {
  return {
    session: event.session_id ?? event.sessionId ?? null,
    agent: event.agent_id ?? event.agentId ?? null,
    agentType: event.agent_type ?? event.agentType ?? event.subagent_type ?? null,
    toolUseId: event.tool_use_id ?? event.toolUseId ?? null,
    toolName: event.tool_name ?? event.toolName ?? null,
    toolInput: event.tool_input ?? event.toolInput ?? {},
    reentrant: event.stop_hook_active === true || event.stopHookActive === true,
  };
}

// Claude Code shapes. A Codex wiring passes `--harness codex` and its installer verifies these
// against Codex's own event names before that route is claimed.
export function sessionContext(text) {
  return { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } };
}

export function toolDeny(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  };
}

export function stopBlock(reason) {
  return { decision: 'block', reason };
}
