import { accept, refuse } from './answer.mjs';
import { fingerprintsOf, memberOf } from './context.mjs';
import { captureIdentity, isBuilderIdentity, storedIdentity } from './identity.mjs';
import { blockingCause, dimensionState, findingStatus, suiteState } from './state.mjs';
import {
  closeWindow, currentRecords, readDeclaration, readRounds, readWindow, verdicts, writeRounds,
  writeVerdict, writeWindow,
} from './store.mjs';
import { ignoredFingerprints, sharedErrors } from './validate.mjs';

function reviewReadiness(context, dimension) {
  const view = suiteState(context);
  const own = view.states.find(state => state.dimension === dimension);
  if (!own) return refuse('invalid-document', `${dimension} is not a dimension this project registers`);
  if (own.applicability !== 'applicable') {
    return refuse('not-review-ready', `${dimension} is declared non-applicable; there is nothing to review`, [], 'missing-declaration');
  }
  const open = readWindow(context.paths, dimension);
  if (open && !open.closed) {
    return refuse('review-in-flight', `${dimension} already has an open review window opened at ${open.openedAt}`);
  }
  // Corrections are batched: while any dimension of the task has a pending finding, no review reopens.
  const cause = blockingCause(view.states);
  if (cause) {
    const upheld = (view.rounds.upheld ?? []).some(one => one.dimension === dimension);
    if (!(cause === 'remedies-pending' && upheld)) {
      const blocking = view.states.filter(state => state.codes.includes(cause)).map(state => state.dimension);
      return refuse('not-review-ready', `${cause} on ${blocking.join(', ')}`, blocking, cause);
    }
  }
  if ((view.rounds.conflictRounds ?? 0) >= context.conflictRoundCap) {
    return refuse('not-review-ready', `${dimension} reached the cross-dimension conflict cap; the user arbitrates before another review`, [], 'arbitration-required');
  }
  if ((view.rounds.round ?? 0) >= context.roundCap) {
    return refuse('not-review-ready', `the task reached its total round cap of ${context.roundCap}`, [], 'round-cap-reached');
  }
  return { ok: true, view, own };
}

export function commandCanReview(context, args) {
  const dimension = args.dimension;
  if (!dimension) return accept('allowed: no dimension named, nothing to gate');
  const readiness = reviewReadiness(context, dimension);
  if (!readiness.ok) return readiness;
  return accept(`allowed: ${dimension} is ready for a fresh review`);
}

// A reviewer's first gate call. It opens the window, snapshots the state the verdict will bind to and
// captures the caller identity, whatever route dispatched it.
export function commandBegin(context, args) {
  const dimension = args.dimension;
  const readiness = reviewReadiness(context, dimension);
  if (!readiness.ok) return readiness;
  const identity = captureIdentity(context, 'begin', dimension);
  if (identity.providesAgents && !identity.agent) {
    return refuse('identity-refused', 'this harness reports an agent identifier and none reached the gate; a review cannot begin without one');
  }
  if (isBuilderIdentity(context, identity)) {
    return refuse('identity-refused', 'the caller is the builder of this task; a review is dispatched to a fresh context');
  }
  const declaration = readDeclaration(context.paths, dimension).document;
  const fingerprints = fingerprintsOf(context, dimension, declaration);
  const window = {
    dimension,
    openedAt: new Date().toISOString(),
    identity: storedIdentity(identity),
    fingerprints: {
      source: fingerprints.source,
      reference: fingerprints.reference,
      decision: fingerprints.decision,
    },
    closed: false,
  };
  writeWindow(context.paths, dimension, window);
  const lines = [
    `window open for ${dimension}`,
    `state: source ${fingerprints.source} reference ${fingerprints.reference} decision ${fingerprints.decision}`,
    `records: ${currentRecords(context.paths, dimension).map(record => record.reference).join(', ')}`,
  ];
  lines.push(`next: file with \`${context.gateCommand} attest --dimension ${dimension} --stdin\` for SOUND, \`report\` otherwise`);
  return accept(lines.join('\n'), {
    document: { kind: 'window', dimension, fingerprints: window.fingerprints },
    warnings: identity.verified ? [] : ['identity-unverified'],
  });
}

function fileVerdict(context, args, document, kind) {
  const dimension = args.dimension;
  const member = memberOf(context, dimension);
  const errors = sharedErrors(context, 'review-envelope', document);
  if (errors.length > 0) return refuse('invalid-document', 'the review envelope does not match its schema', errors);
  if (document.dimension !== dimension) {
    return refuse('invalid-document', `the envelope reviews ${document.dimension}, the command reviews ${dimension}`);
  }
  if (!member.contractVersions.includes(document.contractVersion)) {
    return refuse('invalid-document', `${dimension} supports contract ${member.contractVersions.join(' or ')}, the envelope declares ${document.contractVersion}`);
  }
  if (kind === 'attestation' && document.verdict !== 'SOUND') {
    return refuse('invalid-document', 'attest accepts SOUND only; file SMELLS and VIOLATIONS through report');
  }
  if (kind === 'report' && document.verdict === 'SOUND') {
    return refuse('invalid-document', 'report accepts SMELLS and VIOLATIONS; file SOUND through attest');
  }
  for (const finding of document.findings) {
    if (finding.kind === 'evidence' && !finding.remedy) {
      return refuse('finding-without-remedy', `finding ${finding.id} is about evidence and names no remedy the builder can execute`);
    }
  }

  const open = readWindow(context.paths, dimension);
  if (!open || open.closed) {
    return refuse('no-window', `no open review window for ${dimension}; run \`${context.gateCommand} begin --dimension ${dimension}\` first`);
  }
  const identity = captureIdentity(context, kind === 'attestation' ? 'attest' : 'report', dimension);
  if (identity.providesAgents && !identity.agent) {
    return refuse('identity-refused', 'this harness reports an agent identifier and none reached the gate');
  }
  if (identity.agent && open.identity.agent && identity.agent !== open.identity.agent) {
    return refuse('no-window', `the window for ${dimension} was opened by another agent`);
  }
  if (isBuilderIdentity(context, identity)) {
    return refuse('identity-refused', 'the caller is the builder of this task; only a fresh reviewer files a verdict');
  }
  if (context.requireVerifiedIdentity && !identity.verified) {
    return refuse('identity-refused', 'the marker requires a verified agent identity and this harness reports none');
  }

  const state = dimensionState(context, dimension);
  const missing = state.missingEvidence;
  if (missing.length > 0) {
    return refuse('not-review-ready', 'a planned artifact is still not produced', missing, 'missing-evidence');
  }
  const current = fingerprintsOf(context, dimension, state.declaration);
  const moved = ['source', 'reference', 'decision'].filter(one => current[one] !== open.fingerprints[one]);
  if (moved.length > 0) {
    closeWindow(context.paths, dimension, 'voided');
    return refuse('state-moved', `the ${moved.join(' and ')} fingerprint moved since this review began; the review is void and a fresh one is needed`, moved);
  }

  const warnings = [];
  if (ignoredFingerprints(document)) warnings.push('fingerprint-ignored');
  if (!identity.verified) warnings.push('identity-unverified');
  if (document.reviewer.agentType && document.reviewer.agentType !== member.agent.split('/').pop().replace(/\.md$/, '')) {
    warnings.push('identity-unverified');
  }

  const rounds = readRounds(context.paths);
  const round = (rounds.round ?? 0) + (rounds.filedOn === current.source ? 0 : 1);
  const previous = verdicts(context.paths, 'attestation', dimension).at(-1) ?? null;
  const verdict = {
    document: kind,
    documentVersion: '1.0.0',
    dimension,
    task: context.task,
    round,
    filedAt: new Date().toISOString(),
    gateVersion: context.version,
    fingerprints: {
      source: current.source,
      reference: current.reference,
      decision: current.decision,
    },
    identity: storedIdentity(identity),
    envelope: document,
    ...(kind === 'report' ? { openFindings: document.findings.map(finding => finding.id) } : {}),
    warnings,
  };
  // The gate holds itself to the same schema it holds every writer to, so a drift in what it stores
  // fails here rather than reappearing as an unreadable index later.
  const stored = sharedErrors(context, 'verdict-record', { ...verdict, id: 'pending' });
  if (stored.length > 0) {
    throw new Error(`the gate composed a ${kind} its own schema refuses: ${stored.join('; ')}`);
  }
  const id = writeVerdict(context.paths, kind, dimension, verdict);
  closeWindow(context.paths, dimension, 'filed');

  // A dimension that was SOUND and turns non-SOUND on a state produced by correcting another is a
  // cross-dimension conflict. The next briefs carry it and a repeating one goes to the user.
  const conflict = kind === 'report' && previous !== null;
  const conflicts = new Set(rounds.conflicts ?? []);
  if (conflict) conflicts.add(dimension);
  writeRounds(context.paths, {
    ...rounds,
    round,
    filedOn: current.source,
    conflicts: [...conflicts],
    conflictRounds: conflict ? (rounds.conflictRounds ?? 0) + 1 : (conflicts.size === 0 ? 0 : rounds.conflictRounds ?? 0),
    history: [...(rounds.history ?? []), { round, dimension, verdict: document.verdict, id }],
  });

  const lines = [`filed ${kind} ${id} for ${dimension}: ${document.verdict}`];
  if (kind === 'report') {
    lines.push(`findings: ${document.findings.map(finding => `${finding.id} (${finding.kind}, ${finding.severity})`).join(', ')}`);
    lines.push('next: the builder addresses or disputes every finding before any review of this task reopens');
  }
  return accept(lines.join('\n'), {
    document: { kind, dimension, id },
    warnings: conflict ? [...warnings, 'cross-dimension-conflict'] : warnings,
  });
}

export function commandAttest(context, args, document) {
  return fileVerdict(context, args, document, 'attestation');
}

export function commandReport(context, args, document) {
  return fileVerdict(context, args, document, 'report');
}

// A reviewer that ended without filing. Recorded, shown in the status, and the window is freed.
export function commandRelease(context, args) {
  const dimension = args.dimension;
  if (!dimension) return accept('nothing to release: no dimension named');
  const released = closeWindow(context.paths, dimension, 'released');
  if (!released) return accept(`no open window for ${dimension}`);
  return accept(`released the open review window for ${dimension}\nnext: dispatch a fresh reviewer for ${dimension}`);
}

export function pendingFindingsOf(context, dimension) {
  const state = dimensionState(context, dimension);
  const report = verdicts(context.paths, 'report', dimension).at(-1) ?? null;
  const status = findingStatus(context, dimension, report, currentRecords(context.paths, dimension), state.fingerprints ?? {});
  return status.pending;
}
