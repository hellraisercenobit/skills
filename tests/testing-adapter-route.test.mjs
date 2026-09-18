import assert from 'node:assert/strict';
import test from 'node:test';
import { detectTestingAdapter } from '../skills/engineering/transpose-testing-patterns/references/detect-adapter.mjs';

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
  assert.equal(result.complete, true);
  assert.deepEqual(result.profile, {
    angular: '19.0.0',
    karma: '9.0.0',
    jasmineCore: '5.1.0',
    typescript: '5.6.0',
  });
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

test('Karma without jasmine-core stays unknown and never becomes Vitest', () => {
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
