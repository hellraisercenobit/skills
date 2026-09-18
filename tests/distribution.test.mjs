import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import Ajv from 'ajv/dist/2020.js';

test('distributed companions expose a usable local contract, catalog and schema', async () => {
  const root = await mkdtemp(join(tmpdir(), 'installed-skills-'));
  try {
    const manifest = JSON.parse(await readFile('contracts/members.json', 'utf8'));
    const plugin = JSON.parse(await readFile('.claude-plugin/plugin.json', 'utf8'));
    for (const member of manifest.members) {
      for (const path of [member.transpose, member.review]) {
        assert.ok(plugin.skills.includes(`./${path}`));
        await cp(path, join(root, basename(path)), { recursive: true });
      }
      assert.ok(plugin.agents.includes(`./${member.agent}`));
      assert.ok((await stat(member.agent)).isFile());
      assert.equal(await readFile(join(root, basename(member.transpose), 'references/suite-contract.md'), 'utf8'),
        await readFile('contracts/suite-contract.md', 'utf8'));
    }
    const testing = join(root, 'transpose-testing-patterns/references');
    for (const file of ['catalog.md', 'tdd.md', 'doubles-data.md', 'typescript.md', 'transpose-vitest.md', 'transpose-codeception.md', 'record.md']) {
      assert.ok((await stat(join(testing, file))).isFile());
    }
    const testingSchema = JSON.parse(await readFile(join(testing, 'decision-record.schema.json'), 'utf8'));
    const testingRecord = JSON.parse(await readFile(join(testing, 'record.example.json'), 'utf8'));
    const validateTesting = new Ajv({ strict: true }).compile(testingSchema);
    assert.equal(validateTesting(testingRecord), true, JSON.stringify(validateTesting.errors));
    const installed = join(root, 'transpose-modern-typescript/references');
    for (const file of ['catalog.md', 'compatibility.md', 'idioms.md', 'collections.md', 'platform.md', 'types.md', 'record.md']) {
      assert.ok((await stat(join(installed, file))).isFile());
    }
    const schema = JSON.parse(await readFile(join(installed, 'decision-record.schema.json'), 'utf8'));
    const record = JSON.parse(await readFile(join(installed, 'record.example.json'), 'utf8'));
    const validate = new Ajv({ strict: true }).compile(schema);
    assert.equal(validate(record), true, JSON.stringify(validate.errors));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('distribution check accepts the committed generated contract bundles', () => {
  const result = spawnSync(process.execPath, ['scripts/sync-suite-contract.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
