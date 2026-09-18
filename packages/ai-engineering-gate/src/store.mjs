import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { canonicalJson, hashText } from './hash.mjs';

// Seven kinds of document live under a task's evidence directory. The first six are written through
// a gate command; `index` is the gate's own and nobody else writes it.
export function taskPaths(evidenceRoot, task) {
  const root = join(evidenceRoot, task);
  return {
    root,
    declarations: join(root, 'declarations'),
    records: join(root, 'records'),
    evidence: join(root, 'evidence'),
    disputes: join(root, 'disputes'),
    arbitrations: join(root, 'arbitrations'),
    index: join(root, 'index'),
  };
}

export function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

// Write then rename, one document at a time, so concurrent attestations of two dimensions never
// interleave and a crashed writer leaves no half document behind.
export function writeJsonAtomic(path, value) {
  mkdirSync(join(path, '..'), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporary, path);
  return path;
}

export function listDirectories(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}

export function listJsonFiles(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.json') && !entry.name.endsWith('.snapshot.json'))
    .map(entry => entry.name)
    .sort();
}

const revisionNumber = name => Number.parseInt(/^rev-(\d+)\.json$/.exec(name)?.[1] ?? '0', 10);

function latestRevision(directory) {
  const files = listJsonFiles(directory).filter(name => revisionNumber(name) > 0);
  if (files.length === 0) return null;
  const name = files.sort((a, b) => revisionNumber(a) - revisionNumber(b)).at(-1);
  const document = readJson(join(directory, name));
  return document && { number: revisionNumber(name), path: join(directory, name), document };
}

export function readDeclaration(paths, dimension) {
  return latestRevision(join(paths.declarations, dimension));
}

export function declarationRevisions(paths, dimension) {
  const directory = join(paths.declarations, dimension);
  return listJsonFiles(directory)
    .filter(name => revisionNumber(name) > 0)
    .sort((a, b) => revisionNumber(a) - revisionNumber(b))
    .map(name => ({ number: revisionNumber(name), document: readJson(join(directory, name)) }));
}

export function writeDeclaration(paths, dimension, number, document) {
  return writeJsonAtomic(join(paths.declarations, dimension, `rev-${number}.json`), document);
}

// A record identifier is `rec-001` per dimension; a revision is `rec-001@2`. Revision 1 opens a new
// record, a later one names its predecessor and extends that chain, so no revision is overwritten.
export function recordIds(paths, dimension) {
  return listDirectories(join(paths.records, dimension));
}

export function readRecord(paths, dimension, recordId) {
  const revision = latestRevision(join(paths.records, dimension, recordId));
  return revision && { ...revision, id: recordId, reference: `${recordId}@${revision.number}` };
}

export function readRecordRevision(paths, dimension, recordId, number) {
  const path = join(paths.records, dimension, recordId, `rev-${number}.json`);
  const document = readJson(path);
  return document && { number, path, document, id: recordId, reference: `${recordId}@${number}` };
}

export function currentRecords(paths, dimension) {
  return recordIds(paths, dimension)
    .map(id => readRecord(paths, dimension, id))
    .filter(Boolean);
}

export function nextRecordId(paths, dimension) {
  const used = recordIds(paths, dimension)
    .map(id => Number.parseInt(/^rec-(\d+)$/.exec(id)?.[1] ?? '0', 10));
  return `rec-${String(Math.max(0, ...used) + 1).padStart(3, '0')}`;
}

export function writeRecord(paths, dimension, recordId, number, document) {
  return writeJsonAtomic(join(paths.records, dimension, recordId, `rev-${number}.json`), document);
}

export function writeRecordSnapshot(paths, dimension, recordId, number, snapshot) {
  return writeJsonAtomic(join(paths.records, dimension, recordId, `rev-${number}.snapshot.json`), snapshot);
}

export function readRecordSnapshot(paths, dimension, recordId, number) {
  return readJson(join(paths.records, dimension, recordId, `rev-${number}.snapshot.json`));
}

export function appendEvidence(paths, dimension, document) {
  const directory = join(paths.evidence, dimension);
  const sequence = String(listJsonFiles(directory).length + 1).padStart(4, '0');
  const name = `${sequence}-${document.kind.replaceAll(/[^a-z0-9-]/gi, '-')}.json`;
  return writeJsonAtomic(join(directory, name), document);
}

export function evidenceAppends(paths, dimension) {
  const directory = join(paths.evidence, dimension);
  return listJsonFiles(directory).map(name => readJson(join(directory, name))).filter(Boolean);
}

function sequencedWrite(directory, prefix, document) {
  const sequence = String(listJsonFiles(directory).length + 1).padStart(3, '0');
  const id = `${prefix}-${sequence}`;
  writeJsonAtomic(join(directory, `${id}.json`), { ...document, id });
  return id;
}

function sequencedList(directory) {
  return listJsonFiles(directory).map(name => readJson(join(directory, name))).filter(Boolean);
}

export function writeVerdict(paths, kind, dimension, document) {
  const directory = join(paths.index, `${kind}s`, dimension);
  const prefix = kind === 'attestation' ? 'att' : 'rep';
  return sequencedWrite(directory, prefix, document);
}

export function verdicts(paths, kind, dimension) {
  return sequencedList(join(paths.index, `${kind}s`, dimension));
}

export function writeDispute(paths, dimension, document) {
  return sequencedWrite(join(paths.disputes, dimension), 'dis', document);
}

export function disputes(paths, dimension) {
  return sequencedList(join(paths.disputes, dimension));
}

export function writeArbitration(paths, dimension, document) {
  return sequencedWrite(join(paths.arbitrations, dimension), 'arb', document);
}

export function arbitrations(paths, dimension) {
  return sequencedList(join(paths.arbitrations, dimension));
}

export function windowPath(paths, dimension) {
  return join(paths.index, 'windows', `${dimension}.json`);
}

export function readWindow(paths, dimension) {
  return readJson(windowPath(paths, dimension));
}

export function writeWindow(paths, dimension, document) {
  return writeJsonAtomic(windowPath(paths, dimension), document);
}

export function closeWindow(paths, dimension, outcome) {
  const open = readWindow(paths, dimension);
  if (!open) return null;
  const directory = join(paths.index, 'closed-windows', dimension);
  sequencedWrite(directory, 'win', { ...open, outcome, closedAt: new Date().toISOString() });
  writeJsonAtomic(windowPath(paths, dimension), { closed: true });
  return open;
}

export function closedWindows(paths, dimension) {
  return sequencedList(join(paths.index, 'closed-windows', dimension));
}

export function readRounds(paths) {
  return readJson(join(paths.index, 'rounds.json')) ?? { round: 0, conflictRounds: 0, history: [] };
}

export function writeRounds(paths, value) {
  return writeJsonAtomic(join(paths.index, 'rounds.json'), value);
}

export function readStopSnapshot(paths) {
  return readJson(join(paths.index, 'stop-snapshot.json'));
}

export function writeStopSnapshot(paths, value) {
  return writeJsonAtomic(join(paths.index, 'stop-snapshot.json'), value);
}

export function invocationHash(command) {
  const tokens = String(command).trim().split(/\s+/).filter(Boolean);
  const gateAt = tokens.findIndex(token => token.includes('ai-engineering-gate'));
  const rest = gateAt >= 0 ? tokens.slice(gateAt + 1) : tokens;
  return hashText(canonicalJson(rest));
}

// Keyed on session, tool-use id and the hash of the gate argv so two same-verb calls
// stay distinct, and a leftover of another verb cannot be consumed as this one.
export function handoffKey(session, toolUseId, commandHash) {
  return hashText(canonicalJson([session ?? '', toolUseId ?? '', commandHash ?? ''])).slice(7, 39);
}

export function writeHandoff(paths, key, document) {
  return writeJsonAtomic(join(paths.index, 'handoffs', `${key}.json`), document);
}

export function readHandoff(paths, key) {
  return readJson(join(paths.index, 'handoffs', `${key}.json`));
}

export function handoffs(paths) {
  const directory = join(paths.index, 'handoffs');
  return listJsonFiles(directory).map(name => ({ key: name.replace(/\.json$/, ''), document: readJson(join(directory, name)) }));
}

export function dropHandoff(paths, key) {
  const path = join(paths.index, 'handoffs', `${key}.json`);
  if (existsSync(path)) writeJsonAtomic(path, { consumed: true, at: new Date().toISOString() });
}

export function readBuilders(paths) {
  return readJson(join(paths.index, 'builders.json')) ?? { agents: [], sessions: [] };
}

// The builder identities seen writing declarations, records and evidence. `attest` refuses a caller
// that appears here, which checks consistency and never proves independence.
export function noteBuilder(paths, identity) {
  const known = readBuilders(paths);
  const agents = [...new Set([...known.agents, identity.agent].filter(Boolean))];
  const sessions = [...new Set([...known.sessions, identity.session].filter(Boolean))];
  writeJsonAtomic(join(paths.index, 'builders.json'), { agents, sessions });
}
