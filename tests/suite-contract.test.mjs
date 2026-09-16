import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const script = resolve('scripts/sync-suite-contract.mjs');

test('distribution can repair missing or stale contract bundles and check without writing', async () => {
  const root = await mkdtemp(join(tmpdir(), 'suite-contract-'));
  try {
    await mkdir(join(root, 'contracts'), { recursive: true });
    await writeFile(join(root, 'contracts/suite-contract.md'), '# Contract 1.0.0\n\nDecide before writing.\n');
    await writeFile(join(root, 'contracts/members.json'), JSON.stringify({
      contractVersion: '1.0.0',
      members: [{ transpose: 'skills/example', review: 'skills/review-example' }],
    }));
    const run = (...args) => spawnSync(process.execPath, [script, '--root', root, ...args], { encoding: 'utf8' });
    assert.equal(run('--check').status, 1);
    assert.equal(run().status, 0);
    const output = join(root, 'skills/example/references/suite-contract.md');
    assert.equal(await readFile(output, 'utf8'), '# Contract 1.0.0\n\nDecide before writing.\n');
    assert.equal(run('--check').status, 0);
    await writeFile(output, 'stale');
    assert.equal(run('--check').status, 1);
    assert.equal(await readFile(output, 'utf8'), 'stale');
    assert.equal(run().status, 0);
    assert.equal(run('--check').status, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
