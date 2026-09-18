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
      profile: { vitest: '5.0.1' },
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
      profile: {},
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

test('Karma + jasmine-core + Angular 10.2.5 selects the karma-jasmine-angular adapter', () => {
  const result = detectTestingAdapter({
    npmPackages: {
      karma: '6.3.4',
      'jasmine-core': '3.5.0',
      '@angular/core': '10.2.5',
    },
    hasKarmaConfig: true,
    hasAngularProject: true,
  });
  assert.equal(result.family, 'karma-jasmine-angular');
  assert.equal(result.adapter, 'transpose-karma-jasmine-angular.md');
  assert.equal(result.complete, true);
});

test('Angular 10.2.6 with neighbouring Karma and jasmine versions still selects the same adapter', () => {
  const result = detectTestingAdapter({
    npmPackages: {
      karma: '6.4.0',
      'jasmine-core': '3.6.0',
      '@angular/core': '10.2.6',
    },
    hasKarmaConfig: true,
    hasAngularProject: true,
  });
  assert.equal(result.family, 'karma-jasmine-angular');
  assert.equal(result.adapter, 'transpose-karma-jasmine-angular.md');
  assert.equal(result.complete, true);
});

test('Angular 11.x still selects the karma-jasmine-angular adapter', () => {
  const result = detectTestingAdapter({
    npmPackages: {
      karma: '6.4.1',
      'jasmine-core': '3.8.0',
      '@angular/core': '11.2.14',
    },
    hasKarmaConfig: true,
    hasAngularProject: true,
  });
  assert.equal(result.family, 'karma-jasmine-angular');
  assert.equal(result.adapter, 'transpose-karma-jasmine-angular.md');
  assert.equal(result.complete, true);
});

test('jasmine-core without Angular TestBed or Karma does not select karma-jasmine-angular', () => {
  const result = detectTestingAdapter({
    npmPackages: {
      'jasmine-core': '3.5.0',
    },
  });
  assert.notEqual(result.family, 'karma-jasmine-angular');
  assert.equal(result.family, 'unknown');
});

test('vitest without Karma and Angular TestBed selects the Vitest adapter', () => {
  const result = detectTestingAdapter({
    npmPackages: {
      vitest: '5.0.1',
    },
  });
  assert.equal(result.family, 'vitest');
  assert.equal(result.adapter, 'transpose-vitest.md');
  assert.equal(result.complete, true);
  assert.deepEqual(result.profile, { vitest: '5.0.1' });
});

test('an unknown Angular major that still looks like TestBed plus Karma stays on this family', () => {
  const result = detectTestingAdapter({
    npmPackages: {
      karma: '9.0.0',
      'jasmine-core': '5.1.0',
      '@angular/core': '19.0.0',
      typescript: '5.6.0',
    },
    hasKarmaConfig: true,
    hasAngularProject: true,
  });
  assert.equal(result.family, 'karma-jasmine-angular');
  assert.equal(result.adapter, 'transpose-karma-jasmine-angular.md');
  assert.equal(result.complete, false);
  assert.deepEqual(result.profile.unknowns, ['angular-major', 'karma-major', 'jasmine-major']);
});

test('missing Angular TestBed signals stay unknown and never become Vitest', () => {
  const result = detectTestingAdapter({
    npmPackages: {
      karma: '6.3.4',
      'jasmine-core': '3.5.0',
    },
    hasKarmaConfig: true,
  });
  assert.equal(result.family, 'unknown');
  assert.equal(result.complete, false);
  assert.notEqual(result.family, 'vitest');
  assert.notEqual(result.adapter, 'transpose-vitest.md');
});

test('Karma without jasmine-core stays unknown and never become Vitest', () => {
  const result = detectTestingAdapter({
    npmPackages: {
      karma: '6.3.4',
      '@angular/core': '10.2.5',
    },
    hasKarmaConfig: true,
    hasAngularProject: true,
  });
  assert.equal(result.family, 'unknown');
  assert.equal(result.complete, false);
  assert.notEqual(result.adapter, 'transpose-vitest.md');
  assert.deepEqual(result.profile, {});
});

test('catalog stays free of Karma Angular runner APIs', async () => {
  const catalog = await readFile(
    'skills/engineering/transpose-testing-patterns/references/catalog.md',
    'utf8',
  );
  assert.doesNotMatch(catalog, /TestBed/);
  assert.doesNotMatch(catalog, /fakeAsync/);
  assert.doesNotMatch(catalog, /DRIFTED_SPECS/);
  assert.doesNotMatch(catalog, /openssl-legacy-provider/);
});

test('adapter forbids mixing jasmine.clock with fakeAsync', async () => {
  const adapter = await readFile(
    'skills/engineering/transpose-testing-patterns/references/transpose-karma-jasmine-angular.md',
    'utf8',
  );
  assert.match(adapter, /Do not mix with `jasmine\.clock\(\)`/);
});

test('inspectProject reads the Karma Angular pin', () => {
  const result = inspectProject(resolve('tests/testing-patterns/karma-jasmine-angular'));
  assert.equal(result.family, 'karma-jasmine-angular');
  assert.equal(result.complete, true);
});
