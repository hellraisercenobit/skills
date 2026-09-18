import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { memberOf } from './context.mjs';
import { hashFile } from './hash.mjs';
import { memberDecisionSchema, memberEvidenceSchema } from './registry.mjs';
import { schemaErrors } from './schema.mjs';
import { readRecordSnapshot } from './store.mjs';

// A record is validated twice: against the envelope every dimension shares, and against the
// dimension's own schema. The gate reads the envelope; the body stays the dimension's business.
export function recordErrors(context, dimension, document) {
  const member = memberOf(context, dimension);
  return [
    ...schemaErrors(context.registry.schemas['decision-envelope'], document),
    ...schemaErrors(memberDecisionSchema(context.registry, member), document),
  ];
}

export function sharedErrors(context, name, document) {
  return schemaErrors(context.registry.schemas[name], document);
}

export function evidenceErrors(context, dimension, document) {
  const errors = sharedErrors(context, 'evidence-append', document);
  const schema = memberEvidenceSchema(context.registry, memberOf(context, dimension), document.kind);
  if (schema) errors.push(...schemaErrors(schema, document.payload));
  return errors;
}

// A cited path must exist in the worktree or under the task's evidence when the record is validated.
// `plans` are deliberately not checked here, so a record can precede the first affected write.
export function resolveCitation(context, path) {
  for (const candidate of [join(context.repoRoot, path), join(context.paths.root, path)]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export function danglingCitations(context, document) {
  return (document.cites ?? [])
    .map(citation => citation.path)
    .filter(path => resolveCitation(context, path) === null);
}

export function citationSnapshot(context, document) {
  const cites = {};
  for (const citation of document.cites ?? []) {
    const resolved = resolveCitation(context, citation.path);
    cites[citation.path] = resolved ? hashFile(resolved) : null;
  }
  return cites;
}

const CHECKABLE_FACT = /^unknown\b|^unknown$/i;

function walkStrings(value, path, into) {
  if (typeof value === 'string') {
    into.push([path, value]);
    return into;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkStrings(item, `${path}/${index}`, into));
    return into;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) walkStrings(child, `${path}/${key}`, into);
  }
  return into;
}

// A claim of unknown about a checkable fact is accepted only with the sources consulted cited, or
// with the paths searched and not found. Nothing else: a fleet declared unknown without opening a
// file is what this refuses.
export function unsourcedUnknowns(document) {
  const citations = document.cites ?? [];
  const searched = citations.some(citation => (citation.searched ?? []).length > 0);
  if (searched) return [];
  const covered = new Set(citations.flatMap(citation => citation.covers ?? []));
  return walkStrings(document, '', [])
    .filter(([path, value]) => CHECKABLE_FACT.test(value.trim()) && !path.startsWith('/cites'))
    .filter(([path]) => {
      const segments = path.split('/').filter(Boolean).filter(segment => !/^\d+$/.test(segment));
      return !segments.some(segment => covered.has(segment)) && !covered.has(path);
    })
    .map(([path]) => path);
}

// A revision that announces a correction is refused when no cited artifact changed, so a record
// cannot describe work a script did not apply.
export function revisionChangeErrors(context, dimension, recordId, document) {
  const number = document.revision.number;
  if (number < 2) return [];
  const snapshot = readRecordSnapshot(context.paths, dimension, recordId, number - 1);
  if (!snapshot) return [`no snapshot for revision ${number - 1} of ${recordId}`];
  const current = citationSnapshot(context, document);
  const named = document.revision.changed ?? null;
  if (named) {
    return named
      .filter(path => (snapshot.cites?.[path] ?? null) === (current[path] ?? null))
      .map(path => `${path} is named as changed and its content is identical`);
  }
  const moved = Object.keys(current).some(path => (snapshot.cites?.[path] ?? null) !== current[path]);
  return moved ? [] : ['no cited artifact differs from the previous revision'];
}

// A dispute needs a pointer to counter-evidence that exists now.
export function danglingCounterEvidence(context, document) {
  return (document.counterEvidence ?? [])
    .map(pointer => pointer.path)
    .filter(path => resolveCitation(context, path) === null);
}

export function ignoredFingerprints(document) {
  const found = walkStrings(document, '', [])
    .map(([path]) => path)
    .filter(path => /fingerprint/i.test(path));
  const keys = Object.keys(document).filter(key => /fingerprint/i.test(key));
  return found.length > 0 || keys.length > 0;
}
