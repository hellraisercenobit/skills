import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { changeSet, sourceFingerprint, undeclaredChanges } from './changeset.mjs';
import { hashEntries, hashJson } from './hash.mjs';
import {
  findDistributionRoot, gateVersion, loadRegistry, referenceFingerprint, registeredMembers,
} from './registry.mjs';
import { findRepoRoot, readMarker, resolveEvidenceRoot, resolveTaskKey } from './repo.mjs';
import { currentRecords, listDirectories, readDeclaration, taskPaths } from './store.mjs';

// Everything a command reads, resolved once. `marked` is false in a repository that carries no
// marker, and every command then allows and prints nothing that blocks.
export function buildContext(options) {
  const cwd = options.cwd ?? process.cwd();
  const repoRoot = findRepoRoot(cwd);
  const marker = readMarker(repoRoot);
  const distributionRoot = findDistributionRoot();
  const registry = loadRegistry(distributionRoot);
  const version = gateVersion(distributionRoot);
  const context = {
    cwd,
    repoRoot,
    marker,
    marked: marker !== null,
    registry,
    version,
    gateCommand: options.gateCommand ?? gateCommandLine(distributionRoot),
    harness: options.harness ?? null,
  };
  if (!context.marked) return context;
  context.members = registeredMembers(registry, marker);
  context.dimensions = context.members.map(member => member.dimension);
  context.evidenceRoot = resolveEvidenceRoot({
    flag: options.evidenceRoot,
    env: process.env.AI_ENGINEERING_GATE_EVIDENCE_ROOT,
    marker,
    repoRoot,
  });
  context.task = resolveTaskKey({
    flag: options.task,
    // A CI checkout is a detached merge ref, so no branch names the task. One export carries one
    // task, which is a fact the export itself states better than a pipeline variable could.
    env: process.env.AI_ENGINEERING_GATE_TASK ?? (options.fromExport ? soleTask(context.evidenceRoot) : null),
    repoRoot,
  });
  context.paths = taskPaths(context.evidenceRoot, context.task);
  context.conflictRoundCap = marker.conflictRoundCap ?? 3;
  context.roundCap = marker.roundCap ?? 12;
  context.allowReplay = marker.allowReplay !== false;
  context.requireVerifiedIdentity = marker.requireVerifiedIdentity === true;
  return context;
}

function soleTask(evidenceRoot) {
  const tasks = listDirectories(evidenceRoot).filter(name => name !== 'index');
  return tasks.length === 1 ? tasks[0] : null;
}

// The command line the gate prints for the next step. It names the entry point it is running from,
// so a checkout, a plugin install and an npm install each print something the reader can paste.
export function gateCommandLine(distributionRoot) {
  for (const candidate of ['packages/ai-engineering-gate/bin/ai-engineering-gate.mjs', 'bin/ai-engineering-gate.mjs']) {
    if (existsSync(join(distributionRoot, candidate))) return `node ${join(distributionRoot, candidate)}`;
  }
  return 'ai-engineering-gate';
}

export function memberOf(context, dimension) {
  const member = context.members?.find(one => one.dimension === dimension);
  if (!member) throw new Error(`${dimension} is not a dimension this project registers`);
  return member;
}

export function declarations(context) {
  const found = {};
  for (const dimension of context.dimensions) {
    found[dimension] = readDeclaration(context.paths, dimension)?.document ?? null;
  }
  return found;
}

// The base a dimension compares against: its declaration's, the marker's default, or none.
export function baseOf(context, declaration) {
  return declaration?.base ?? context.marker.base ?? null;
}

// The three fingerprints, always computed here and never accepted from a document.
export function fingerprintsOf(context, dimension, declaration) {
  const member = memberOf(context, dimension);
  const change = changeSet(context, baseOf(context, declaration));
  return {
    source: sourceFingerprint(context, declaration, change),
    reference: referenceFingerprint(context.registry, member, context.version),
    decision: decisionFingerprint(context, dimension),
    change,
  };
}

// The dimension's declaration and every one of its records, each with its revision number. A
// re-declaration or a record revision therefore expires the verdicts that read the old ones.
export function decisionFingerprint(context, dimension) {
  const declaration = readDeclaration(context.paths, dimension);
  const entries = [
    ['declaration', declaration ? `${declaration.number}:${hashJson(declaration.document)}` : 'absent'],
  ];
  for (const record of currentRecords(context.paths, dimension)) {
    entries.push([`record:${record.id}`, `${record.number}:${hashJson(record.document)}`]);
  }
  return hashEntries(entries);
}

export function undeclaredFor(context) {
  const all = declarations(context);
  const applicable = Object.values(all).filter(one => one?.applicability === 'applicable');
  const base = applicable[0]?.base ?? context.marker.base ?? null;
  return undeclaredChanges(changeSet(context, base), Object.values(all));
}
