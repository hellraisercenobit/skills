import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { assessTestingProfile } from '../skills/engineering/review-testing-patterns/references/compiler-profile.mjs';

test('TypeScript tests without an ES target cannot complete', () => {
  const result = assessTestingProfile({
    language: 'typescript',
    constraints: ['runner: vitest'],
    compiler: {},
    emit: 'vitest-esbuild',
    runtime: 'node',
  });
  assert.equal(result.status, 'incomplete');
});

test('PHP tests complete without an ES target constraint', () => {
  const result = assessTestingProfile({
    language: 'php',
    constraints: ['runner: codeception'],
    compiler: {},
  });
  assert.equal(result.status, 'complete');
  assert.deepEqual(result.findings, []);
});

test('TypeScript compiler.target does not substitute for constraint ES target', () => {
  const result = assessTestingProfile({
    language: 'typescript',
    constraints: ['runner: vitest'],
    compiler: { target: 'ES2015' },
    emit: 'vitest-esbuild',
    runtime: 'node',
  });
  assert.equal(result.status, 'incomplete');
});

test('TypeScript four-layer profile without actual syntax completes', () => {
  const result = assessTestingProfile({
    language: 'typescript',
    constraints: ['compiler: TypeScript 4.0.5, target ES2015, lib es2015'],
    compiler: { target: 'ES2015' },
    emit: 'vitest-esbuild',
    runtime: 'node',
  });
  assert.equal(result.status, 'complete');
  assert.deepEqual(result.findings, []);
});

test('satisfies on an ES2015 profile is incompatible modernization', () => {
  const result = assessTestingProfile({
    language: 'typescript',
    constraints: ['compiler: TypeScript 4.0.5, target ES2015, lib es2015'],
    compiler: { target: 'ES2015' },
    emit: 'vitest-esbuild',
    runtime: 'node',
    actual: { syntax: ['satisfies'] },
  });
  assert.equal(result.status, 'complete');
  assert.deepEqual(result.findings, [{ id: 'incompatible-modernization', rule: 'MT-23' }]);
});

test('constraint ES2015 versus derived ES2022 is a target mismatch', () => {
  const result = assessTestingProfile({
    language: 'typescript',
    constraints: ['compiler: TypeScript 4.0.5, target ES2015, lib es2015'],
    compiler: { target: 'ES2022' },
    emit: 'vitest-esbuild',
    runtime: 'node',
  });
  assert.equal(result.status, 'complete');
  assert.ok(result.findings.some(finding => finding.id === 'target-mismatch'));
});

test('vi.fn on karma-jasmine-angular is a wrong-runner API', () => {
  const result = assessTestingProfile({
    language: 'typescript',
    constraints: ['compiler: TypeScript 4.0.5, target ES2015, lib es2015'],
    compiler: { target: 'ES2015' },
    emit: 'karma-webpack',
    runtime: 'ChromeHeadless',
    adapterFamily: 'karma-jasmine-angular',
    actual: { apis: ['vi.fn'] },
  });
  assert.equal(result.status, 'complete');
  assert.ok(result.findings.some(finding => finding.id === 'wrong-runner-api'));
});

test('TypeScript with unknown emit cannot complete', () => {
  const result = assessTestingProfile({
    language: 'typescript',
    constraints: ['compiler: TypeScript 4.0.5, target ES2015, lib es2015'],
    compiler: { target: 'ES2015' },
    runtime: 'node',
  });
  assert.equal(result.status, 'incomplete');
});

test('TypeScript with unknown runtime cannot complete', () => {
  const result = assessTestingProfile({
    language: 'typescript',
    constraints: ['compiler: TypeScript 4.0.5, target ES2015, lib es2015'],
    compiler: { target: 'ES2015' },
    emit: 'vitest-esbuild',
  });
  assert.equal(result.status, 'incomplete');
});

test('TypeScript without a lib layer cannot complete', () => {
  const result = assessTestingProfile({
    language: 'typescript',
    constraints: ['compiler: TypeScript 4.0.5, target ES2015'],
    compiler: { target: 'ES2015' },
    emit: 'vitest-esbuild',
    runtime: 'node',
  });
  assert.equal(result.status, 'incomplete');
});

test('review-testing-patterns requires the four layers and assessTestingProfile', () => {
  const skill = readFileSync('skills/engineering/review-testing-patterns/SKILL.md', 'utf8');
  assert.match(skill, /parser\/compiler syntax/);
  assert.match(skill, /lib\/types/);
  assert.match(skill, /emit\/runner/);
  assert.match(skill, /actual runtime/);
  assert.match(skill, /incomplete execution/);
  assert.match(skill, /assessTestingProfile/);
  assert.match(skill, /SOUND does not require Vitest/);
});

test('transpose-testing-patterns requires ES target in TypeScript constraints', () => {
  const skill = readFileSync('skills/engineering/transpose-testing-patterns/SKILL.md', 'utf8');
  assert.match(skill, /constraints` must name the ES\/compiler target/);
  assert.match(skill, /tsconfig/);
  assert.match(skill, /not a substitute/);
});

test('declaration constraints describe the required ES target content', () => {
  const schema = JSON.parse(readFileSync('contracts/schemas/declaration.schema.json', 'utf8'));
  assert.equal(schema.properties.constraints.type, 'array');
  assert.equal(schema.properties.constraints.items.type, 'string');
  assert.match(schema.properties.constraints.description, /ES\/compiler target/);
  assert.match(schema.properties.constraints.description, /not a substitute/);
});

test('typescript.md does not recommend satisfies as a default', () => {
  const guide = readFileSync('skills/engineering/transpose-testing-patterns/references/typescript.md', 'utf8');
  assert.match(guide, /satisfies` when the compiler profile\s+supports it/);
  assert.doesNotMatch(guide, /using `satisfies` where useful/);
});

test('review-modern-typescript treats a missing profile as incomplete execution', () => {
  const skill = readFileSync('skills/engineering/review-modern-typescript/SKILL.md', 'utf8');
  assert.match(skill, /missing required compiler profile is incomplete execution/);
  assert.match(skill, /omitted MT-23 from the record/);
});

test('testing smell signatures lead on too-modern syntax and wrong-runner APIs', () => {
  const signatures = readFileSync('skills/engineering/review-testing-patterns/references/smell-signatures.md', 'utf8');
  assert.match(signatures, /satisfies/);
  assert.match(signatures, /vi\.fn/);
  assert.match(signatures, /MT-23/);
});
