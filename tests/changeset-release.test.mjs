import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { assembleReleasePlan } from '@changesets/assemble-release-plan';
import { readConfig } from '@changesets/config';
import { readChangesets } from '@changesets/read';
import { getPackages } from '@manypkg/get-packages';

const syncScript = resolve('scripts/sync-version.sh');

test('pending changesets only name npm workspace packages', async () => {
  const workspace = await getPackages(process.cwd());
  const names = new Set(workspace.packages.map((pkg) => pkg.packageJson.name));
  assert.ok(names.has('@hellraisercenobit/ai-engineering-gate'));
  assert.equal(names.has('hellraisercenobit-skills'), false);
  const { config, errors, warnings } = await readConfig(process.cwd(), workspace);
  assert.equal(errors, undefined, errors?.join('\n'));
  assert.equal(
    warnings.filter((warning) => warning.includes('does not match any package')).length,
    0,
    warnings.join('\n'),
  );
  const plan = assembleReleasePlan(await readChangesets(process.cwd()), workspace, config, undefined);
  for (const release of plan.releases) {
    assert.ok(names.has(release.name), `plan includes ${release.name} which is not a workspace package`);
  }
});

test('version sync copies the gate version onto the plugin manifests', async () => {
  const root = await mkdtemp(join(tmpdir(), 'version-sync-'));
  try {
    await mkdir(join(root, 'scripts'));
    await mkdir(join(root, 'packages/ai-engineering-gate'), { recursive: true });
    await mkdir(join(root, '.claude-plugin'));
    await cp(syncScript, join(root, 'scripts/sync-version.sh'));
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'hellraisercenobit-skills', version: '0.5.0' }));
    await writeFile(join(root, 'packages/ai-engineering-gate/package.json'), JSON.stringify({
      name: '@hellraisercenobit/ai-engineering-gate',
      version: '0.6.0',
    }));
    await writeFile(join(root, '.claude-plugin/plugin.json'), JSON.stringify({ name: 'hellraisercenobit-skills', version: '0.5.0' }));
    await writeFile(join(root, '.claude-plugin/marketplace.json'), JSON.stringify({
      metadata: { version: '0.5.0' },
      plugins: [{ name: 'hellraisercenobit-skills', version: '0.5.0' }],
    }));
    const result = spawnSync('bash', [join(root, 'scripts/sync-version.sh')], { encoding: 'utf8', cwd: root });
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    const read = async (path) => JSON.parse(await readFile(join(root, path), 'utf8'));
    assert.equal((await read('packages/ai-engineering-gate/package.json')).version, '0.6.0');
    assert.equal((await read('package.json')).version, '0.6.0');
    assert.equal((await read('.claude-plugin/plugin.json')).version, '0.6.0');
    const marketplace = await read('.claude-plugin/marketplace.json');
    assert.equal(marketplace.metadata.version, '0.6.0');
    assert.equal(marketplace.plugins[0].version, '0.6.0');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
