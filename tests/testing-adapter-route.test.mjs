import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { detectTestingAdapter, inspectProject } from '../skills/engineering/transpose-testing-patterns/references/detect-adapter.mjs';

test('codeception 5.0.x lockfile selects the Codeception adapter', () => {
  assert.deepEqual(
    detectTestingAdapter({ composerPackages: { 'codeception/codeception': '5.0.12' } }),
    {
      family: 'codeception',
      adapter: 'transpose-codeception.md',
      complete: true,
      profile: { runner: 'codeception', version: '5.0.12' },
    },
  );
});

test('codeception 5.1.x lockfile selects the Codeception adapter', () => {
  assert.deepEqual(
    detectTestingAdapter({ composerPackages: { 'codeception/codeception': '5.1.2' } }),
    {
      family: 'codeception',
      adapter: 'transpose-codeception.md',
      complete: true,
      profile: { runner: 'codeception', version: '5.1.2' },
    },
  );
});

test('codeception 4.x lockfile selects the Codeception adapter', () => {
  assert.deepEqual(
    detectTestingAdapter({ composerPackages: { 'codeception/codeception': '4.2.2' } }),
    {
      family: 'codeception',
      adapter: 'transpose-codeception.md',
      complete: true,
      profile: { runner: 'codeception', version: '4.2.2' },
    },
  );
});

test('codeception lockfile still selects the adapter when a config file is present', () => {
  assert.deepEqual(
    detectTestingAdapter({
      composerPackages: { 'codeception/codeception': '5.1.2' },
      hasCodeceptionConfig: true,
    }),
    {
      family: 'codeception',
      adapter: 'transpose-codeception.md',
      complete: true,
      profile: { runner: 'codeception', version: '5.1.2', hasConfig: true },
    },
  );
});

test('codeception lockfile still selects the adapter when a config file is absent', () => {
  assert.deepEqual(
    detectTestingAdapter({
      composerPackages: { 'codeception/codeception': '5.0.12' },
      hasCodeceptionConfig: false,
    }),
    {
      family: 'codeception',
      adapter: 'transpose-codeception.md',
      complete: true,
      profile: { runner: 'codeception', version: '5.0.12', hasConfig: false },
    },
  );
});

test('vitest lockfile without codeception selects the Vitest adapter', () => {
  assert.deepEqual(
    detectTestingAdapter({ npmPackages: { vitest: '5.0.1' } }),
    {
      family: 'vitest',
      adapter: 'transpose-vitest.md',
      complete: true,
      profile: { runner: 'vitest', version: '5.0.1' },
    },
  );
});

test('empty evidence selects no adapter family', () => {
  assert.deepEqual(
    detectTestingAdapter({}),
    {
      family: 'unknown',
      adapter: null,
      complete: false,
      profile: { runner: 'unknown', version: null },
    },
  );
});

test('catalog stays free of Codeception runner APIs', async () => {
  const catalog = await readFile(
    'skills/engineering/transpose-testing-patterns/references/catalog.md',
    'utf8',
  );
  assert.doesNotMatch(catalog, /UnitTester/);
  assert.doesNotMatch(catalog, /codecept/);
  assert.doesNotMatch(catalog, /Codeception\\Stub/);
});

test('an undocumented Codeception major stays on the family but is incomplete', () => {
  const result = detectTestingAdapter({
    composerPackages: { 'codeception/codeception': '3.1.0' },
  });
  assert.equal(result.family, 'codeception');
  assert.equal(result.complete, false);
  assert.deepEqual(result.profile.unknowns, ['codeception-major']);
});

test('inspectProject reads composer.json on the Codeception pin', () => {
  const result = inspectProject(resolve('tests/testing-patterns/codeception'));
  assert.equal(result.family, 'codeception');
  assert.equal(result.complete, true);
  assert.equal(result.profile.hasConfig, true);
});

test('Codeception adapter rejects Vitest APIs', async () => {
  const adapter = await readFile(
    'skills/engineering/transpose-testing-patterns/references/transpose-codeception.md',
    'utf8',
  );
  assert.match(adapter, /Do not emit `vi\.fn`/);
  assert.match(adapter, /test\.extend/);
});
