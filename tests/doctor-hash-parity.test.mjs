import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import * as gate from '../packages/ai-engineering-gate/src/hash.mjs';
import * as guardrail from '../skills/engineering/agent-instruction-doctor/hooks/guardrail.mjs';

test('the guardrail hashes text, files, canonical JSON and entry sets like the gate', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hash-parity-'));
  try {
    const file = join(dir, 'CLAUDE.md');
    writeFileSync(file, '# rules\n- no comments\n');
    const missing = join(dir, 'absent.md');
    const text = 'Observed: `.claude/rules/no-comments.md` applies only to `src/**/*.ts`.';
    const json = { z: 1, a: [3, { y: null, x: 'é' }], u: undefined };
    const entries = [['b', 'sha256:2'], ['a', null], ['c', 'sha256:3']];
    assert.equal(guardrail.hashText(text), gate.hashText(text));
    assert.equal(guardrail.hashFile(file), gate.hashFile(file));
    assert.equal(guardrail.hashFile(missing), gate.hashFile(missing));
    assert.equal(guardrail.hashFile(missing), null);
    assert.equal(guardrail.hashJson(json), gate.hashJson(json));
    assert.equal(guardrail.hashEntries(entries), gate.hashEntries(entries));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
