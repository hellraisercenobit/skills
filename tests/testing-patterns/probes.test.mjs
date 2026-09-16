import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const project = resolve('tests/testing-patterns/project');
const evidence = process.env.TESTING_EVIDENCE_DIR;
let runEvidence;
if (evidence) {
  await mkdir(evidence, { recursive: true });
  runEvidence = await mkdtemp(join(evidence, 'run-'));
  console.log(`Evidence: ${runEvidence}`);
}

async function isolated(name, action, source = project) {
  const root = await mkdtemp(join(tmpdir(), `testing-${name}-`));
  try {
    await cp(source, root, { recursive: true, filter: path => !path.includes('node_modules') });
    await symlink(join(source, 'node_modules'), join(root, 'node_modules'), 'dir');
    await action(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}

async function replace(root, file, from, to) {
  const path = join(root, file);
  const content = await readFile(path, 'utf8');
  assert.equal(content.split(from).length, 2, `Unique mutation site: ${file} ${from}`);
  await writeFile(path, content.replace(from, to));
}

async function run(root, name, args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 30000 });
  await writeFile(join(root, `${name}.log`), result.stdout + result.stderr);
  if (runEvidence) {
    const phase = await mkdtemp(join(runEvidence, `${basename(root)}-${name}-`));
    await cp(root, join(phase, 'state'), { recursive: true, filter: path => !path.includes('node_modules') });
    await writeFile(join(phase, 'execution.json'), JSON.stringify({
      command: [process.execPath, ...args], cwd: root, exitCode: result.status,
      signal: result.signal, error: result.error?.message, state: 'state', output: `state/${name}.log`,
    }, null, 2));
  }
  assert.equal(result.error, undefined, result.error?.message);
  return result;
}

async function runtime(root, file, name = 'runtime') {
  const result = await run(root, name, [join(root, 'node_modules/vitest/vitest.mjs'), 'run', file, '--reporter=json', `--outputFile=${name}.json`]);
  const report = JSON.parse(await readFile(join(root, `${name}.json`), 'utf8'));
  return { ...result, report, cases: report.testResults.flatMap(suite => suite.assertionResults) };
}

async function typecheck(root, name = 'types') {
  return run(root, name, [join(project, 'node_modules/typescript/bin/tsc'), '--noEmit', '-p', 'tsconfig.json']);
}

const mutants = [
  ['threshold', 'domain.ts', 'amount >= 100', 'amount > 100', 'domain.test.ts'],
  ['state', 'state.ts', "cancel() {\n      if (state !== 'draft') throw new RangeError('Not a draft');", 'cancel() {', 'state.test.ts'],
  ['omitted-effect', 'orchestration.ts', 'await send({ total: amount + shipping(amount) });', 'return;', 'orchestration.test.ts'],
  ['duplicate-effect', 'orchestration.ts', 'await send({ total: amount + shipping(amount) });', 'await send({ total: amount + shipping(amount) }); await send({ total: amount + shipping(amount) });', 'orchestration.test.ts'],
  ['upsert', 'storage.ts', 'values.set(key, value);', 'if (!values.has(key)) values.set(key, value);', 'storage.test.ts'],
  ['unsafe-cast', 'contracts.ts', "if (typeof input !== 'number' || !Number.isSafeInteger(input) || input < 0)", 'if (false)', 'contracts.test.ts'],
  ['mutex', 'async.ts', 'tail.then(action, action)', 'Promise.resolve().then(action)', 'async.test.ts'],
  ['generator-close', 'iteration.ts', 'finally { close(); }', 'finally {}', 'iteration.test.ts'],
  ['generator-eager', 'iteration.ts', 'try {\n    for', 'produced(-1);\n  try {\n    for', 'iteration.test.ts'],
  ['duplicates', 'properties.ts', '[...new Set(tags)].sort()', '[...tags].sort()', 'properties.test.ts'],
];

for (const [name, file, from, to, testFile] of mutants) {
  test(`plausible ${name} defect fails an executed behavioral assertion`, async () => {
    await isolated(name, async root => {
      if (name === 'unsafe-cast') await replace(root, file, 'return input;', 'return input as number;');
      await replace(root, file, from, to);
      const compiled = await typecheck(root);
      assert.equal(compiled.status, 0, `Mutant must compile before claiming behavioral detection\n${compiled.stdout}\n${compiled.stderr}`);
      const result = await runtime(root, testFile);
      assert.equal(result.status, 1);
      const failures = result.cases.filter(item => item.status === 'failed');
      assert.ok(failures.length > 0, 'An import or runner failure is not a killed behavioral mutant');
      assert.ok(failures.some(item => /AssertionError|Property failed.*after/s.test(item.failureMessages.join('\n'))));
      if (name === 'duplicates') {
        const message = failures.flatMap(item => item.failureMessages).join('\n');
        const replay = /seed: (-?\d+), path: "([^"]+)"/.exec(message);
        assert.ok(replay, 'Property failure must expose reproducible seed/path');
        await replace(root, 'properties.test.ts', 'seed: 20260916, numRuns: 100', `seed: ${replay[1]}, path: '${replay[2]}', numRuns: 100`);
        assert.equal((await runtime(root, testFile, 'replay')).status, 1);
      }
    });
  });
}

test('runtime green cannot hide weakened literal inference', async () => {
  await isolated('static-contract', async root => {
    await replace(root, 'contracts.ts', 'currency, charge }', 'currency: currency as string, charge }');
    assert.equal((await runtime(root, 'contracts.test.ts')).status, 0);
    const result = await typecheck(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /consumer-types\.ts/);
  });
});

test('named fixture cleanup runs after failure on both installed profiles', async () => {
  for (const profile of ['project', 'compat']) {
    await isolated(`named-fixture-${profile}`, async root => {
      await replace(root, 'lifecycle.test.ts', 'expect(resource.closed).toBe(false);', "throw new Error('Injected named fixture failure');");
      const result = await runtime(root, 'lifecycle.test.ts', 'with-named-cleanup');
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.equal(result.report.numFailedTests, 1);
      assert.doesNotMatch(JSON.stringify(result.report), /expected.*closed|AssertionError/);
      await replace(root, 'lifecycle.test.ts', 'resource.closed = true;', '');
      const withoutCleanup = await runtime(root, 'lifecycle.test.ts', 'without-named-cleanup');
      assert.equal(withoutCleanup.status, 1);
      assert.match(withoutCleanup.report.testResults.map(suite => suite.message).join('\n'), /expected.*closed: false.*closed: true/s);
    }, resolve(`tests/testing-patterns/${profile}`));
  }
});

test('negative consumer cases fail for intended argument diagnostics', async () => {
  await isolated('negative-types', async root => {
    const file = join(root, 'consumer-types.ts');
    await writeFile(file, (await readFile(file, 'utf8')).replaceAll(/^\/\/ @ts-expect-error.*\n/gm, ''));
    const result = await typecheck(root);
    assert.notEqual(result.status, 0);
    assert.equal((result.stdout.match(/error TS2345/g) ?? []).length, 2);
    assert.doesNotMatch(result.stdout, /Cannot find|TS2307|TS2304/);
  });
});

test('legacy characterization and direct examples survive an internal refactor', async () => {
  await isolated('refactor', async root => {
    assert.equal((await runtime(root, 'legacy.test.ts', 'before')).status, 0);
    await writeFile(join(root, 'legacy.ts'), "export const legacyLabel = (name: string): string => (name.trim() || 'anonymous').toUpperCase();\n");
    assert.equal((await runtime(root, 'legacy.test.ts', 'after')).status, 0);
    await replace(root, 'legacy.ts', "'anonymous'", "'unknown'");
    assert.equal((await runtime(root, 'legacy.test.ts', 'changed-behavior')).status, 1);
    await writeFile(join(root, 'domain.ts'), 'const isFree = (amount: number) => amount >= 100;\nexport const shipping = (amount: number) => isFree(amount) ? 0 : 10;\n');
    assert.equal((await runtime(root, 'domain.test.ts', 'direct-refactor')).status, 0);
  });
});

test('timer cleanup still runs after a failed test and its removal is observable', async () => {
  await isolated('failure-cleanup', async root => {
    const probe = "import { afterEach, expect, test, vi } from 'vitest';\nafterEach(() => { vi.useRealTimers(); });\ntest('injected failure', () => { vi.useFakeTimers(); throw new Error('Injected failure'); });\ntest('next case uses real timers', () => { expect(vi.isFakeTimers()).toBe(false); });\n";
    await writeFile(join(root, 'cleanup.test.ts'), probe);
    const withCleanup = await runtime(root, 'cleanup.test.ts', 'with-cleanup');
    assert.deepEqual(withCleanup.cases.map(item => item.status), ['failed', 'passed']);
    await replace(root, 'cleanup.test.ts', 'vi.useRealTimers();', '');
    const withoutCleanup = await runtime(root, 'cleanup.test.ts', 'without-cleanup');
    assert.deepEqual(withoutCleanup.cases.map(item => item.status), ['failed', 'failed']);
  });
});

test('file resource teardown runs after a failed body and its removal is observable', async () => {
  await isolated('file-failure-cleanup', async root => {
    await replace(root, 'storage.test.ts', "join(tmpdir(), 'testing-patterns-store-')", `join(${JSON.stringify(root)}, 'resource-')`);
    await replace(root, 'storage.test.ts', 'await contract(fileStore(directory));', "throw new Error('Injected file body failure');");
    const withCleanup = await runtime(root, 'storage.test.ts', 'with-cleanup');
    assert.equal(withCleanup.status, 1);
    assert.equal(withCleanup.cases.filter(item => item.status === 'failed').length, 1);
    assert.equal((await readdir(root)).filter(name => name.startsWith('resource-')).length, 0);
    await replace(root, 'storage.test.ts', 'await rm(directory, { recursive: true, force: true });', '');
    const withoutCleanup = await runtime(root, 'storage.test.ts', 'without-cleanup');
    assert.equal(withoutCleanup.status, 1);
    assert.equal((await readdir(root)).filter(name => name.startsWith('resource-')).length, 1);
    assert.match(JSON.stringify(withoutCleanup.report), /promise resolved|ENOENT/);
  });
});
