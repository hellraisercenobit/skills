import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { fingerprintsOf, undeclaredFor } from './context.mjs';
import { installedReferenceMismatch } from './registry.mjs';
import { matchesPattern } from './repo.mjs';
import {
  arbitrations, closedWindows, currentRecords, disputes, evidenceAppends, readDeclaration,
  readRounds, readWindow, verdicts,
} from './store.mjs';

const sameFingerprints = (stored, current) => stored.source === current.source
  && stored.reference === current.reference
  && stored.decision === current.decision;

function staleCodes(stored, current) {
  const codes = [];
  if (stored.source !== current.source) codes.push('stale-source');
  if (stored.reference !== current.reference) codes.push('stale-reference');
  if (stored.decision !== current.decision) codes.push('stale-decision');
  return codes;
}

// A planned artifact is produced when it exists in the worktree, under the task's evidence, or as an
// append that names it. Nothing is dispatched to a reviewer to notice an omission a machine can see.
export function missingPlannedArtifacts(context, dimension, records) {
  const appends = evidenceAppends(context.paths, dimension);
  const produced = new Set(appends.map(append => append.produces).filter(Boolean));
  const missing = [];
  for (const record of records) {
    for (const plan of record.document.plans ?? []) {
      if (produced.has(plan.path)) continue;
      if (existsSync(join(context.repoRoot, plan.path))) continue;
      if (existsSync(join(context.paths.root, plan.path))) continue;
      if (!missing.includes(plan.path)) missing.push(plan.path);
    }
  }
  return missing;
}

const findingsOf = report => report?.envelope?.findings ?? [];

function remedySatisfied(context, dimension, finding, report, records) {
  const remedy = finding.remedy;
  if (!remedy) return false;
  const appends = evidenceAppends(context.paths, dimension)
    .filter(append => (append.filedAt ?? '') > (report.filedAt ?? ''));
  if (remedy.kind === 'produce') {
    return appends.some(append => append.produces === remedy.artifact)
      || existsSync(join(context.repoRoot, remedy.artifact))
      || existsSync(join(context.paths.root, remedy.artifact));
  }
  if (remedy.kind === 'rerun') {
    return appends.some(append => append.payload?.command === remedy.command);
  }
  if (remedy.kind === 'replay') {
    return appends.some(append => append.replayed === true && append.payload?.scenario === remedy.scenario);
  }
  return false;
}

function judgmentAddressed(context, dimension, finding, report, records, current) {
  const cites = records.some(record => (record.document.revision?.addresses ?? []).includes(finding.id));
  if (!cites) return false;
  return report.fingerprints.source !== current.source || report.fingerprints.decision !== current.decision;
}

// A finding is pending until it is addressed, disputed or closed by arbitration. A changed
// fingerprint alone addresses nothing: touching a file reopens no review.
export function findingStatus(context, dimension, report, records, current) {
  if (!report) return { pending: [], disputed: [], closed: [] };
  const openDisputes = disputes(context.paths, dimension).filter(one => one.report === report.id);
  const decided = arbitrations(context.paths, dimension);
  const pending = [];
  const disputed = [];
  const closed = [];
  for (const finding of findingsOf(report)) {
    const dispute = openDisputes.find(one => one.finding === finding.id);
    const arbitration = dispute && decided.find(one => one.dispute === dispute.id);
    if (arbitration?.decision === 'uphold') {
      closed.push(finding.id);
      continue;
    }
    if (dispute && !arbitration) {
      disputed.push(finding.id);
      continue;
    }
    const addressed = finding.kind === 'evidence'
      ? remedySatisfied(context, dimension, finding, report, records)
      : judgmentAddressed(context, dimension, finding, report, records, current);
    if (addressed) closed.push(finding.id);
    else pending.push(finding.id);
  }
  return { pending, disputed, closed };
}

export function dimensionState(context, dimension) {
  const declarationRevision = readDeclaration(context.paths, dimension);
  const declaration = declarationRevision?.document ?? null;
  const warnings = [];
  if (installedReferenceMismatch(context.registry, context.members.find(one => one.dimension === dimension))) {
    warnings.push('reference-mismatch');
  }
  if (!declaration) {
    return {
      dimension, state: 'undeclared', codes: ['missing-declaration'], warnings, records: 0,
      missingEvidence: [], openFindings: [], declaration: null,
    };
  }
  if (declaration.applicability === 'non-applicable') {
    return {
      dimension,
      state: 'non-applicable',
      applicability: 'non-applicable',
      codes: declaration.reason ? [] : ['missing-reason'],
      warnings,
      records: 0,
      missingEvidence: [],
      openFindings: [],
      declaration,
    };
  }

  const records = currentRecords(context.paths, dimension);
  const current = fingerprintsOf(context, dimension, declaration);
  const openWindow = (() => {
    const found = readWindow(context.paths, dimension);
    return found && !found.closed ? found : null;
  })();
  const attestations = verdicts(context.paths, 'attestation', dimension);
  const reports = verdicts(context.paths, 'report', dimension);
  const filed = [...attestations, ...reports].sort((a, b) => (a.filedAt < b.filedAt ? -1 : 1));
  const latest = filed.at(-1) ?? null;
  const currentAttestation = attestations.find(one => sameFingerprints(one.fingerprints, current)) ?? null;
  const currentReport = reports.filter(one => sameFingerprints(one.fingerprints, current)).at(-1) ?? null;
  const lastReport = reports.at(-1) ?? null;
  const status = findingStatus(context, dimension, lastReport, records, current);
  const unresolvedDispute = status.disputed.length > 0;

  const codes = [];
  if (records.length === 0) codes.push('missing-record');
  const missingEvidence = missingPlannedArtifacts(context, dimension, records);
  if (missingEvidence.length > 0) codes.push('missing-evidence');
  if (openWindow) codes.push('review-in-flight');
  if (unresolvedDispute) codes.push('unresolved-dispute');
  if (currentReport && status.pending.concat(status.disputed).length > 0) codes.push('non-sound-review');
  if (status.pending.length > 0) codes.push('remedies-pending');
  if (!currentAttestation) {
    const stale = filed.filter(one => !sameFingerprints(one.fingerprints, current)).at(-1) ?? null;
    if (stale) codes.push(...staleCodes(stale.fingerprints, current));
    else if (!currentReport) codes.push('missing-review');
  }

  const state = (() => {
    if (unresolvedDispute) return 'disputed';
    if (openWindow) return 'in-review';
    if (currentAttestation) return 'attested';
    if (currentReport) return 'reported';
    if (latest) return 'stale';
    if (records.length > 0) return 'recorded';
    return 'declared';
  })();

  for (const record of records) {
    const wider = (record.document.scope ?? [])
      .some(path => !(declaration.scope?.paths ?? []).some(scope => matchesPattern(path, scope) || path.startsWith(scope)));
    if (wider && !warnings.includes('scope-wider-than-declaration')) warnings.push('scope-wider-than-declaration');
    const claims = (record.document.cites ?? []).map(citation => citation.claim);
    if (new Set(claims).size !== claims.length && !warnings.includes('duplicate-evidence')) {
      warnings.push('duplicate-evidence');
    }
  }
  if (currentAttestation?.identity?.verified === false) warnings.push('identity-unverified');
  const rounds = readRounds(context.paths);
  if ((rounds.conflicts ?? []).includes(dimension)) warnings.push('cross-dimension-conflict');

  return {
    dimension,
    state,
    applicability: 'applicable',
    codes: [...new Set(codes)],
    warnings,
    records: records.length,
    missingEvidence,
    openFindings: [...status.pending, ...status.disputed],
    fingerprints: { source: current.source, reference: current.reference, decision: current.decision },
    declaration,
    recordRefs: records.map(record => record.reference),
    releasedWindows: closedWindows(context.paths, dimension).filter(one => one.outcome === 'released').length,
  };
}

const NEXT_ACTION = {
  'missing-declaration': 'declare the dimension applicable or non-applicable with its reason, request and constraints',
  'missing-reason': 're-declare the dimension with the reason it does not apply',
  'missing-record': 'write a decision record before the first affected write',
  'missing-evidence': 'file the planned artifacts through `evidence append`',
  'missing-review': 'dispatch the reviewer named in the plan',
  'non-sound-review': 'address or dispute every finding of the report',
  'remedies-pending': 'execute each remedy and append its artifact, or dispute it with counter-evidence',
  'unresolved-dispute': 'ask the user to run `arbitrate`; no agent writes an arbitration',
  'arbitration-required': 'ask the user to arbitrate the repeating cross-dimension conflict',
  'round-cap-reached': 'ask the user to arbitrate: the task reached its total round cap',
  'stale-source': 'the code moved since the verdict; run a new round of reviews',
  'stale-reference': 'a catalog, schema or guide moved; run a new round of reviews',
  'stale-decision': 'a declaration or record moved; run a new round of reviews',
  'review-in-flight': 'wait for the open review to file or release',
  'gate-failure': 'the gate itself failed; read the error and fix the setup',
};

export function completionOf(context, states) {
  const rounds = readRounds(context.paths);
  const codes = states.flatMap(one => one.codes);
  if ((rounds.conflictRounds ?? 0) >= context.conflictRoundCap) codes.push('arbitration-required');
  if ((rounds.round ?? 0) >= context.roundCap) codes.push('round-cap-reached');
  if (context.requireVerifiedIdentity && states.some(one => one.warnings.includes('identity-unverified'))) {
    codes.push('non-sound-review');
  }
  const unique = [...new Set(codes)];
  return {
    complete: unique.length === 0,
    codes: unique,
    next: unique.map(code => `${code}: ${NEXT_ACTION[code] ?? 'read the full status'}`),
  };
}

export function suiteState(context) {
  const states = context.dimensions.map(dimension => dimensionState(context, dimension));
  const undeclared = undeclaredFor(context);
  if (undeclared.length > 0) {
    for (const state of states) {
      if (state.applicability === 'applicable' && !state.warnings.includes('undeclared-change')) {
        state.warnings.push('undeclared-change');
      }
    }
  }
  return { states, undeclaredChanges: undeclared, completion: completionOf(context, states), rounds: readRounds(context.paths) };
}

// A round is ready when every applicable dimension has its records and its planned evidence, no
// finding is pending, no dispute is open and no window is in flight.
export function reviewReady(states) {
  const applicable = states.filter(one => one.applicability === 'applicable');
  if (applicable.length === 0) return false;
  return applicable.every(one => one.records > 0
    && one.missingEvidence.length === 0
    && one.openFindings.length === 0
    && one.state !== 'in-review');
}

export function blockingCause(states) {
  const applicable = states.filter(one => one.applicability === 'applicable');
  for (const code of ['missing-record', 'missing-evidence', 'remedies-pending', 'unresolved-dispute', 'review-in-flight']) {
    if (applicable.some(one => one.codes.includes(code))) return code;
  }
  return null;
}
