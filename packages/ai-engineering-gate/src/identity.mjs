import { handoffKey, noteBuilder, readBuilders, readHandoff, writeHandoff } from './store.mjs';

// Harnesses that expose an agent identifier in hook input inside a subagent call. Elsewhere the
// identity claim cannot be checked, and the gate says so rather than pretending it verified one.
const HARNESSES_WITH_AGENT_IDENTITY = new Set(['claude-code']);
const HANDOFF_LIFETIME_MS = 5 * 60 * 1000;

export function sessionIdentifier() {
  return process.env.CLAUDE_SESSION_ID
    ?? process.env.CODEX_SESSION_ID
    ?? process.env.AI_ENGINEERING_GATE_SESSION
    ?? null;
}

// A harness exposes its session identifier to the hook but not always to the tool call the hook is
// about to allow, so the handoff is written under both keys and the invoked command consumes
// whichever it can name.
export function recordHandoff(context, { session, verb, dimension, agent, agentType, toolUseId }) {
  const document = {
    session, verb, dimension, agent, agentType, toolUseId,
    harness: context.harness,
    recordedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + HANDOFF_LIFETIME_MS).toISOString(),
    consumed: false,
  };
  const keys = [...new Set([handoffKey(session, verb, dimension), handoffKey(null, verb, dimension)])];
  for (const key of keys) writeHandoff(context.paths, key, document);
  return keys;
}

function takeHandoff(context, verb, dimension) {
  const session = sessionIdentifier();
  const keys = [...new Set([handoffKey(session, verb, dimension), handoffKey(null, verb, dimension)])];
  const found = keys
    .map(key => ({ key, stored: readHandoff(context.paths, key) }))
    .find(one => one.stored && !one.stored.consumed
      && !(one.stored.expiresAt && one.stored.expiresAt < new Date().toISOString()));
  if (!found) return null;
  for (const key of keys) {
    const stored = readHandoff(context.paths, key);
    if (stored) writeHandoff(context.paths, key, { ...stored, consumed: true });
  }
  return found.stored;
}

// Every gate call carries the session identifier. The agent identifier arrives only through the
// handoff a PreToolUse hook recorded, which is why its absence is the mechanical sign of a
// human-typed command.
export function captureIdentity(context, verb, dimension) {
  const handoff = takeHandoff(context, verb, dimension);
  const providesAgents = HARNESSES_WITH_AGENT_IDENTITY.has(context.harness ?? handoff?.harness ?? '');
  return {
    session: sessionIdentifier(),
    agent: handoff?.agent ?? null,
    agentType: handoff?.agentType ?? null,
    harness: context.harness ?? handoff?.harness ?? null,
    handoffPresent: Boolean(handoff),
    providesAgents,
    verified: providesAgents && Boolean(handoff?.agent),
  };
}

export function stampBuilder(context, identity) {
  noteBuilder(context.paths, identity);
}

export function isBuilderIdentity(context, identity) {
  const known = readBuilders(context.paths);
  return Boolean(identity.agent) && known.agents.includes(identity.agent);
}

export function storedIdentity(identity) {
  return {
    session: identity.session,
    agent: identity.agent,
    agentType: identity.agentType,
    harness: identity.harness,
    verified: identity.verified,
  };
}
