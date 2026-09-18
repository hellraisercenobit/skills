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

export function hookAgent(event) {
  // Codex delivers a shell command at the top level of `beforeShellExecution`, with no tool name, so
  // the two harnesses converge here rather than in every caller.
  const shellEvent = typeof event.command === 'string' && !event.tool_name && !event.toolName;
  return {
    session: event.session_id ?? event.sessionId ?? event.conversation_id ?? null,
    agent: event.agent_id ?? event.agentId ?? null,
    agentType: event.agent_type ?? event.agentType ?? event.subagent_type ?? event.subagentType ?? null,
    toolUseId: event.tool_use_id ?? event.toolUseId ?? event.call_id ?? null,
    toolName: event.tool_name ?? event.toolName ?? event.tool ?? (shellEvent ? 'shell' : null),
    toolInput: event.tool_input ?? event.toolInput ?? (shellEvent ? { command: event.command } : {}),
    reentrant: event.stop_hook_active === true || event.stopHookActive === true,
  };
}

// Claude Code shapes.
const claudeCode = {
  sessionContext: text => ({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text },
  }),
  toolDeny: reason => ({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }),
  stopBlock: reason => ({ decision: 'block', reason }),
};

// Codex shapes, from its documented output cheat sheet: a permission decision for `preToolUse`,
// `beforeShellExecution` and `subagentStart`, and a follow-up message for the `stop` and
// `subagentStop` loops. Codex documents no output field that injects context at `sessionStart`, so the
// gate answers nothing there and the installer says so rather than pretending the status was delivered.
const codex = {
  sessionContext: () => null,
  toolDeny: reason => ({ permission: 'deny', agent_message: reason, user_message: reason }),
  stopBlock: reason => ({ followup_message: reason }),
};

const SHAPES = { 'claude-code': claudeCode, codex };

const shapeOf = harness => SHAPES[harness] ?? claudeCode;

export const sessionContext = (text, harness) => shapeOf(harness).sessionContext(text);
export const toolDeny = (reason, harness) => shapeOf(harness).toolDeny(reason);
export const stopBlock = (reason, harness) => shapeOf(harness).stopBlock(reason);
