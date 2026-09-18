import { join } from 'node:path';

import { accept, refuse } from './answer.mjs';
import { memberOf } from './context.mjs';
import { hashFile } from './hash.mjs';
import { captureIdentity, stampBuilder, storedIdentity } from './identity.mjs';
import { missingPlannedArtifacts } from './state.mjs';
import {
  appendEvidence, arbitrations, currentRecords, declarationRevisions, disputes, nextRecordId,
  readDeclaration, readRecord, readWindow, verdicts, writeArbitration, writeDeclaration,
  writeDispute, writeRecord, writeRecordSnapshot, writeRounds, readRounds,
} from './store.mjs';
import {
  citationSnapshot, danglingCitations, danglingCounterEvidence, evidenceErrors, ignoredFingerprints,
  recordErrors, revisionChangeErrors, sharedErrors, unsourcedUnknowns,
} from './validate.mjs';

function requireDimension(context, dimension) {
  memberOf(context, dimension);
  return dimension;
}

// A declaration locks once a record, a report, a window or a dispute depends on it, so a
// re-declaration cannot erase a stored verdict. Widening the scope or adding constraints is allowed.
function declarationLock(context, dimension, next) {
  const previous = readDeclaration(context.paths, dimension);
  if (!previous) return null;
  const dependents = [
    currentRecords(context.paths, dimension).length > 0 && 'a decision record',
    verdicts(context.paths, 'report', dimension).length > 0 && 'a report',
    verdicts(context.paths, 'attestation', dimension).length > 0 && 'an attestation',
    readWindow(context.paths, dimension)?.closed === false && 'an open review window',
    disputes(context.paths, dimension).length > 0 && 'a dispute',
  ].filter(Boolean);
  if (dependents.length === 0) return null;
  if (onlyWidens(previous.document, next)) return null;
  return dependents;
}

function onlyWidens(previous, next) {
  if (previous.applicability !== next.applicability) return false;
  if (previous.request !== next.request) return false;
  if (previous.reason !== next.reason) return false;
  if (previous.applicability === 'non-applicable') return false;
  if (previous.base !== next.base) return false;
  const kept = (previous.scope?.paths ?? []).every(path => (next.scope?.paths ?? []).includes(path));
  const keptConfiguration = (previous.scope?.configuration ?? [])
    .every(path => (next.scope?.configuration ?? []).includes(path));
  const keptConstraints = (previous.constraints ?? []).every(one => (next.constraints ?? []).includes(one));
  return kept && keptConfiguration && keptConstraints;
}

export function commandDeclare(context, args, document) {
  const dimension = requireDimension(context, args.dimension);
  if (document?.dimension !== dimension) {
    return refuse('invalid-document', `the document declares ${document?.dimension ?? 'no dimension'}, the command declares ${dimension}`);
  }
  const errors = sharedErrors(context, 'declaration', document);
  if (errors.length > 0) return refuse('invalid-document', 'the declaration does not match its schema', errors);

  const revisions = declarationRevisions(context.paths, dimension);
  const expected = revisions.length + 1;
  if (document.revision.number !== expected) {
    return refuse('invalid-document', `the next declaration revision of ${dimension} is ${expected}`);
  }
  const locked = declarationLock(context, dimension, document);
  if (locked) {
    return refuse('declaration-locked', `${locked.join(' and ')} depends on the declaration of ${dimension}; a revision may only widen its scope or add constraints`);
  }
  const identity = captureIdentity(context, 'declare', dimension);
  stampBuilder(context, identity);
  const path = writeDeclaration(context.paths, dimension, document.revision.number, document);
  return accept(
    `declared ${dimension} ${document.applicability} at revision ${document.revision.number}\nnext: write a decision record before the first affected write`,
    { document: { kind: 'declaration', dimension, revision: document.revision.number, path } },
  );
}

export function commandRecord(context, args, document) {
  const dimension = requireDimension(context, args.dimension);
  if (document?.dimension !== dimension) {
    return refuse('invalid-document', `the document records ${document?.dimension ?? 'no dimension'}, the command records ${dimension}`);
  }
  const declaration = readDeclaration(context.paths, dimension)?.document ?? null;
  if (!declaration) {
    return refuse('invalid-document', `declare ${dimension} before recording a decision for it`);
  }
  if (declaration.applicability !== 'applicable') {
    return refuse('invalid-document', `${dimension} is declared non-applicable; a non-applicable dimension has a declaration and nothing else`);
  }
  const errors = recordErrors(context, dimension, document);
  if (errors.length > 0) return refuse('invalid-document', 'the record does not match its envelope or its dimension schema', errors);

  const dangling = danglingCitations(context, document);
  if (dangling.length > 0) {
    return refuse('dangling-reference', 'a cited path does not exist in the worktree or under the task evidence', dangling);
  }
  const unsourced = unsourcedUnknowns(document);
  if (unsourced.length > 0) {
    return refuse('unknown-without-source', 'a claim of unknown about a checkable fact cites no source consulted and no path searched', unsourced);
  }

  const number = document.revision.number;
  let recordId;
  if (number === 1) {
    recordId = nextRecordId(context.paths, dimension);
  } else {
    const reference = /^(rec-\d+)@(\d+)$/.exec(document.revision.previous ?? '');
    if (!reference) {
      return refuse('invalid-document', 'revision previous must name the preceding revision as `rec-001@1`');
    }
    recordId = reference[1];
    const existing = readRecord(context.paths, dimension, recordId);
    if (!existing) return refuse('invalid-document', `${recordId} is not a record of ${dimension} for this task`);
    if (existing.number !== number - 1 || Number(reference[2]) !== number - 1) {
      return refuse('invalid-document', `the next revision of ${recordId} is ${existing.number + 1}`);
    }
    const changeErrors = revisionChangeErrors(context, dimension, recordId, document);
    if (changeErrors.length > 0) {
      return refuse('revision-without-change', 'the revision announces a correction that no cited artifact shows', changeErrors);
    }
  }

  const warnings = ignoredFingerprints(document) ? ['fingerprint-ignored'] : [];
  const identity = captureIdentity(context, 'record', dimension);
  stampBuilder(context, identity);
  const path = writeRecord(context.paths, dimension, recordId, number, document);
  writeRecordSnapshot(context.paths, dimension, recordId, number, {
    revision: number,
    cites: citationSnapshot(context, document),
    builder: storedIdentity(identity),
    writtenAt: new Date().toISOString(),
  });
  const planned = (document.plans ?? []).map(plan => plan.path);
  const lines = [`recorded ${dimension} ${recordId}@${number}`];
  if (planned.length > 0) lines.push(`plans: ${planned.join(', ')}`);
  lines.push('next: write the implementation, then file every planned artifact through `evidence append`');
  return accept(lines.join('\n'), {
    document: { kind: 'record', dimension, id: recordId, revision: number, path },
    warnings,
  });
}

export function commandEvidenceAppend(context, args, document) {
  const dimension = requireDimension(context, args.dimension);
  if (document?.dimension !== dimension) {
    return refuse('invalid-document', `the append names ${document?.dimension ?? 'no dimension'}, the command names ${dimension}`);
  }
  const errors = evidenceErrors(context, dimension, document);
  if (errors.length > 0) return refuse('invalid-document', 'the evidence append does not match its schema', errors);
  const record = readRecord(context.paths, dimension, document.record.split('@')[0]);
  if (!record) return refuse('invalid-document', `${document.record} is not a record of ${dimension} for this task`);

  const identity = captureIdentity(context, 'evidence', dimension);
  stampBuilder(context, identity);
  const stamped = stampAppend(context, dimension, record, document, identity, false);
  const stampErrors = sharedErrors(context, 'evidence-append', stamped);
  if (stampErrors.length > 0) {
    throw new Error(`the gate stamped an append its own schema refuses: ${stampErrors.join('; ')}`);
  }
  const path = appendEvidence(context.paths, dimension, stamped);
  return accept(`appended ${document.kind} to ${dimension} ${record.reference}`, {
    document: { kind: 'evidence-append', dimension, path },
  });
}

// Every append carries the content hashes of the record's planned artifacts, by role, so an event
// proves the state of test and production files at the moment it was filed.
export function stampAppend(context, dimension, record, document, identity, replayed, hashRoot = context.repoRoot) {
  const roles = {};
  for (const plan of record.document.plans ?? []) {
    const digest = hashFile(join(hashRoot, plan.path)) ?? hashFile(join(context.paths.root, plan.path));
    roles[plan.role] = { ...(roles[plan.role] ?? {}), [plan.path]: digest };
  }
  return {
    ...document,
    filedAt: new Date().toISOString(),
    artifactHashes: roles,
    builder: storedIdentity(identity),
    replayed,
  };
}

export function commandDispute(context, args, document) {
  const dimension = requireDimension(context, args.dimension);
  const errors = sharedErrors(context, 'dispute', document);
  if (errors.length > 0) return refuse('invalid-document', 'the dispute does not match its schema', errors);
  if (document.dimension !== dimension) {
    return refuse('invalid-document', `the dispute names ${document.dimension}, the command names ${dimension}`);
  }
  const report = verdicts(context.paths, 'report', dimension).find(one => one.id === document.report);
  if (!report) return refuse('invalid-document', `${document.report} is not a report of ${dimension} for this task`);
  const finding = (report.envelope.findings ?? []).find(one => one.id === document.finding);
  if (!finding) return refuse('invalid-document', `${document.report} carries no finding ${document.finding}`);
  const dangling = danglingCounterEvidence(context, document);
  if (dangling.length > 0) {
    return refuse('dispute-without-evidence', 'the counter-evidence points at a path that does not exist', dangling);
  }
  const already = disputes(context.paths, dimension).find(one => one.finding === document.finding
    && !arbitrations(context.paths, dimension).some(decided => decided.dispute === one.id));
  if (already) return refuse('invalid-document', `${document.finding} is already disputed as ${already.id}`);

  const identity = captureIdentity(context, 'dispute', dimension);
  stampBuilder(context, identity);
  const id = writeDispute(context.paths, dimension, {
    ...document, filedAt: new Date().toISOString(), builder: storedIdentity(identity),
  });
  return accept(
    `disputed ${dimension} finding ${document.finding} as ${id}\nnext: the user decides; run \`${context.gateCommand} arbitrate --dimension ${dimension} --stdin\` yourself, no agent writes an arbitration`,
    { document: { kind: 'dispute', dimension, id } },
  );
}

// Only a human writes an arbitration. Every agent tool call the hook saw left a handoff; a command
// the user types passes through no hook and leaves none, and that absence is the mechanical sign.
export function commandArbitrate(context, args, document) {
  const dimension = requireDimension(context, args.dimension);
  const identity = captureIdentity(context, 'arbitrate', dimension);
  if (identity.handoffPresent) {
    return refuse('agent-arbitration-refused', 'an agent tool call invoked arbitrate; only a command the user types can write an arbitration');
  }
  const errors = sharedErrors(context, 'arbitration', document);
  if (errors.length > 0) return refuse('invalid-document', 'the arbitration does not match its schema', errors);
  if (document.dimension !== dimension) {
    return refuse('invalid-document', `the arbitration names ${document.dimension}, the command names ${dimension}`);
  }
  const dispute = disputes(context.paths, dimension).find(one => one.id === document.dispute);
  if (!dispute) return refuse('invalid-document', `${document.dispute} is not a dispute of ${dimension} for this task`);
  if (arbitrations(context.paths, dimension).some(one => one.dispute === document.dispute)) {
    return refuse('invalid-document', `${document.dispute} is already arbitrated`);
  }
  const id = writeArbitration(context.paths, dimension, {
    ...document, finding: dispute.finding, filedAt: new Date().toISOString(),
  });
  if (document.decision === 'uphold') {
    const rounds = readRounds(context.paths);
    writeRounds(context.paths, {
      ...rounds, conflictRounds: 0, conflicts: [], upheld: [...(rounds.upheld ?? []), { dimension, arbitration: id }],
    });
  }
  const next = document.decision === 'uphold'
    ? `next: one fresh review of ${dimension} is allowed on this same state`
    : `next: execute the remedy or correction of ${dispute.finding}`;
  return accept(`arbitrated ${document.dispute} as ${document.decision} (${id})\n${next}`, {
    document: { kind: 'arbitration', dimension, id },
  });
}

export function plannedEvidenceMissing(context, dimension) {
  return missingPlannedArtifacts(context, dimension, currentRecords(context.paths, dimension));
}
