import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { accept, refuse } from './answer.mjs';
import { excludedFromChangeSet } from './changeset.mjs';
import { stampAppend } from './cmd-write.mjs';
import { captureIdentity } from './identity.mjs';
import { git } from './repo.mjs';
import { appendEvidence, readRecord, verdicts } from './store.mjs';
import { suiteView } from './cmd-inspect.mjs';

// The export directory carries the task's documents into the repository so a CI runner can recompute
// the fingerprints from a clean checkout. It is excluded from the change set and never fingerprinted.
export function commandExport(context) {
  const directory = context.marker.exportDirectory;
  if (!directory) {
    return refuse('invalid-document', 'the marker names no exportDirectory; add one before exporting');
  }
  const dirty = git(['status', '--porcelain'], context.repoRoot).stdout
    .split('\n')
    .map(line => line.slice(3).trim().replace(/^.* -> /, ''))
    .filter(Boolean)
    .filter(path => !path.startsWith(directory));
  const change = dirty.filter(path => !excludedFromChangeSet(context, path));
  if (change.length > 0) {
    return refuse(
      'state-moved',
      'HEAD would recompute different fingerprints than the attestations; commit the change set first',
      change.slice(0, 20),
    );
  }
  const view = suiteView(context);
  if (!view.completion.complete) {
    return refuse('not-review-ready', 'the task is not complete, so its verdicts cannot be published', view.completion.codes);
  }
  const target = join(context.repoRoot, directory, context.task);
  rmSync(target, { recursive: true, force: true });
  mkdirSync(dirname(target), { recursive: true });
  cpSync(context.paths.root, target, { recursive: true });
  const attested = view.states.filter(state => state.applicability === 'applicable').length;
  return accept(
    `exported ${attested} attested dimensions of ${context.task} to ${directory}/${context.task}\nnext: commit the export directory and let CI verify it from a clean checkout`,
    { document: { kind: 'export', path: target } },
  );
}

// The CI half of the direct-PR route: the same completion logic over exported evidence, plus the two
// checks only a clean checkout can make - the gate version the attestations record, and the marker.
export function exportVerificationErrors(context, base) {
  const errors = [];
  for (const dimension of context.dimensions) {
    for (const attestation of verdicts(context.paths, 'attestation', dimension)) {
      if (attestation.gateVersion !== context.version) {
        errors.push(`${dimension}: ${attestation.id} was filed by gate ${attestation.gateVersion} and this gate is ${context.version}`);
      }
    }
  }
  if (base) {
    const onBase = git(['cat-file', '-e', `${base}:.ai-engineering-suite.json`], context.repoRoot).ok;
    if (onBase && !context.marked) {
      errors.push(`the marker exists on ${base} and not on this head`);
    }
  }
  return errors;
}

export function applyExportVerification(context, result, base) {
  const errors = exportVerificationErrors(context, base);
  if (errors.length === 0) return result;
  const versionDrift = errors.some(one => one.includes('was filed by gate'));
  const codes = new Set(result.view?.completion?.codes ?? []);
  if (versionDrift) codes.add('stale-reference');
  const view = result.view && {
    ...result.view,
    completion: {
      complete: false,
      codes: [...codes],
      next: result.view.completion.next,
    },
  };
  if (versionDrift) {
    return { ok: false, view, details: errors };
  }
  return {
    ok: false,
    view,
    code: 'invalid-document',
    reason: 'the exported evidence does not verify against this checkout',
    details: errors,
  };
}

// The gate executes the replay, never the builder. An isolated copy at the record's base carries the
// planned test artifacts alone, so the red it captures is a fact the gate stamped.
export function commandReplay(context, args) {
  if (!context.allowReplay) {
    return refuse('replay-forbidden', 'the marker forbids the replay remedy; rerun a full cycle instead');
  }
  const dimension = args.dimension;
  const record = readRecord(context.paths, dimension, (args.record ?? '').split('@')[0]);
  if (!record) return refuse('invalid-document', `${args.record} is not a record of ${dimension} for this task`);
  if (!args.command) return refuse('invalid-document', 'replay needs the scenario command to run');
  const plans = record.document.plans ?? [];
  const tests = plans.filter(plan => plan.role === 'test');
  const production = plans.filter(plan => plan.role === 'production');
  if (tests.length === 0 || production.length === 0) {
    return refuse('invalid-document', 'a replay needs planned artifacts of role test and of role production');
  }
  const base = record.document.base;
  const point = git(['merge-base', base, 'HEAD'], context.repoRoot);
  if (!point.ok) return refuse('invalid-document', `cannot resolve the record base ${base}`);

  const isolated = mkdtempSync(join(tmpdir(), 'ai-engineering-replay-'));
  const worktree = join(isolated, 'worktree');
  const added = git(['worktree', 'add', '--detach', worktree, point.stdout], context.repoRoot);
  if (!added.ok) {
    rmSync(isolated, { recursive: true, force: true });
    return refuse('invalid-document', `cannot create the isolated copy: ${added.stderr}`);
  }
  try {
    for (const name of ['node_modules', '.venv']) {
      const source = join(context.repoRoot, name);
      if (existsSync(source) && !existsSync(join(worktree, name))) symlinkSync(source, join(worktree, name));
    }
    place(context, worktree, tests);
    const red = run(args.command, worktree);
    const identity = captureIdentity(context, 'replay', dimension);
    const redEvent = appendEvidence(context.paths, dimension, stampAppend(context, dimension, record, {
      document: 'evidence-append',
      documentVersion: '1.0.0',
      dimension,
      record: record.reference,
      kind: 'journal-event',
      payload: {
        record: record.reference,
        scenario: args.scenario ?? 'scenario',
        phase: 'red',
        command: args.command,
        exitCode: red.code,
        output: writeOutput(context, args.scenario, 'red', red.output),
        cause: firstFailure(red.output),
        failureClass: 'expected-behavior-missing',
      },
    }, identity, true, worktree));
    place(context, worktree, production);
    const green = run(args.command, worktree);
    const greenEvent = appendEvidence(context.paths, dimension, stampAppend(context, dimension, record, {
      document: 'evidence-append',
      documentVersion: '1.0.0',
      dimension,
      record: record.reference,
      kind: 'journal-event',
      payload: {
        record: record.reference,
        scenario: args.scenario ?? 'scenario',
        phase: 'green',
        command: args.command,
        exitCode: green.code,
        output: writeOutput(context, args.scenario, 'green', green.output),
      },
    }, identity, true, worktree));
    const events = [redEvent, greenEvent];
    const lines = [
      `replayed ${dimension} ${record.reference} scenario ${args.scenario ?? 'scenario'}`,
      `red exit ${red.code}, green exit ${green.code}`,
    ];
    if (red.code === 0) {
      lines.push('warn: the test passed without the production change, so it discriminates nothing');
    }
    lines.push(`events: ${events.length} appended and stamped by the gate`);
    return accept(lines.join('\n'), { document: { kind: 'replay', dimension, events } });
  } finally {
    git(['worktree', 'remove', '--force', worktree], context.repoRoot);
    rmSync(isolated, { recursive: true, force: true });
  }
}

function writeOutput(context, scenario, phase, output) {
  const relative = join('replays', `${scenario ?? 'scenario'}-${phase}.txt`);
  writeFileSync(ensure(join(context.paths.root, relative)), output);
  return relative;
}

function ensure(path) {
  mkdirSync(dirname(path), { recursive: true });
  return path;
}

function place(context, worktree, plans) {
  for (const plan of plans) {
    const source = join(context.repoRoot, plan.path);
    if (!existsSync(source)) continue;
    writeFileSync(ensure(join(worktree, plan.path)), readFileSync(source));
  }
}

// Variables a caller's own runner uses to talk to its children. Inherited, they change the reporter
// and the exit code of the scenario, so a replay run from inside a test suite would read green where
// a shell reads red.
const RUNNER_PRIVATE = ['NODE_TEST_CONTEXT', 'NODE_V8_COVERAGE', 'VITEST', 'VITEST_WORKER_ID', 'JEST_WORKER_ID'];

function run(command, cwd) {
  const env = { ...process.env };
  for (const name of RUNNER_PRIVATE) delete env[name];
  const result = spawnSync(command, { cwd, env, shell: true, encoding: 'utf8', timeout: 10 * 60 * 1000 });
  return {
    code: result.status ?? 1,
    output: `$ ${command}\n${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

function firstFailure(output) {
  const line = output.split('\n').find(one => /fail|error|expected|assert/i.test(one));
  return (line ?? 'the run failed').trim().slice(0, 300);
}