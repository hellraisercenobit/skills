import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const compile = file => spawnSync('node_modules/.bin/tsc', [
  '--noEmit', '--strict', '--target', 'ES2024', '--module', 'NodeNext',
  `tests/fixtures/modern-typescript/${file}`,
], { encoding: 'utf8' });

test('public clients compile with preserved literal inference', () => {
  const result = compile('consumer-positive.ts');
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('a misspelled policy mode fails at the public type contract', () => {
  const result = compile('consumer-negative.ts');
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /TS2820/);
  assert.match(result.stdout, /consumer-negative\.ts/);
  assert.doesNotMatch(result.stdout + result.stderr, /Cannot find module|command not found/);
});
