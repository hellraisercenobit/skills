// Every command answers in one of two shapes, which the renderer and the exit code both read: a refusal
// carrying the contract's code, or an acceptance carrying the line a human reads plus the payload the
// JSON surface publishes.
export const refuse = (code, reason, details = [], cause = null) => ({
  ok: false,
  code,
  reason,
  details,
  ...(cause ? { cause } : {}),
});

export const accept = (text, payload = {}) => ({ ok: true, text, payload });
