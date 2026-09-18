import { schemaErrors } from './schema.mjs';

// AXI shape: a useful no-argument output, a compact aggregate by default, reasons on request and one
// `next` line per thing to do. Detail is behind `--full`, automation behind `--json`.
export function renderTable(rows, headers) {
  if (rows.length === 0) return '';
  const widths = headers.map((header, column) => Math.max(
    header.length,
    ...rows.map(row => String(row[column] ?? '').length),
  ));
  const line = cells => cells.map((cell, column) => String(cell ?? '').padEnd(widths[column])).join('  ').trimEnd();
  return [line(headers), ...rows.map(line)].join('\n');
}

export function renderStatus(context, view, { full = false } = {}) {
  const lines = [];
  lines.push(`task ${context.task}  round ${view.rounds.round ?? 0}  gate ${context.version}`);
  lines.push(renderTable(
    view.states.map(state => [state.dimension, state.state, describe(state)]),
    ['dimension', 'state', 'why'],
  ));
  const warnings = [...new Set(view.states.flatMap(state => state.warnings))];
  if (warnings.length > 0) lines.push(`warn: ${warnings.join(', ')}`);
  for (const next of view.completion.next) lines.push(`next: ${next}`);
  if (view.completion.complete) lines.push('next: nothing; every registered dimension is complete');

  if (!full) {
    lines.push(`help: ${context.gateCommand} status --full`);
    return lines.filter(Boolean).join('\n');
  }

  for (const state of view.states) {
    lines.push('');
    lines.push(`## ${state.dimension} - ${state.state}`);
    if (state.declaration) {
      lines.push(`applicability: ${state.declaration.applicability} - ${state.declaration.reason}`);
      if (state.declaration.scope) lines.push(`scope: ${state.declaration.scope.paths.join(', ')}`);
    }
    if (state.records) lines.push(`records: ${state.recordRefs.join(', ')}`);
    if (state.missingEvidence?.length) lines.push(`missing evidence: ${state.missingEvidence.join(', ')}`);
    if (state.openFindings?.length) lines.push(`open findings: ${state.openFindings.join(', ')}`);
    if (state.fingerprints) {
      lines.push(`fingerprints: source ${short(state.fingerprints.source)} reference ${short(state.fingerprints.reference)} decision ${short(state.fingerprints.decision)}`);
    }
    if (state.releasedWindows) lines.push(`released windows: ${state.releasedWindows}`);
    for (const code of state.codes) lines.push(`code: ${code}`);
    for (const warning of state.warnings) lines.push(`warn: ${warning}`);
  }
  if (view.undeclaredChanges.length > 0) {
    lines.push('');
    lines.push('## undeclared changes');
    for (const path of view.undeclaredChanges) lines.push(`- ${path}`);
  }
  if (view.plan?.length) {
    lines.push('');
    lines.push('## dispatch plan');
    lines.push('Launch every reviewer below in one turn, then wait for all filings.');
    for (const entry of view.plan) {
      lines.push('');
      lines.push(`### ${entry.dimension} - agent ${entry.agent}`);
      lines.push(`state: source ${short(entry.fingerprints.source)} reference ${short(entry.fingerprints.reference)} decision ${short(entry.fingerprints.decision)}`);
      lines.push(entry.brief);
    }
  }
  return lines.filter(line => line !== null).join('\n');
}

const short = digest => (digest ?? '').replace('sha256:', '').slice(0, 12);

function describe(state) {
  if (state.state === 'non-applicable') return state.declaration?.reason ?? '';
  if (state.codes.length > 0) return state.codes.join(', ');
  return 'complete';
}

export function statusJson(context, view, extra = {}) {
  return {
    outputVersion: '1.0.0',
    command: extra.command ?? 'status',
    gateVersion: context.version,
    marked: true,
    ok: extra.ok ?? true,
    task: context.task,
    repository: context.repoRoot,
    evidenceRoot: context.evidenceRoot,
    gateCommand: context.gateCommand,
    round: view.rounds.round ?? 0,
    dimensions: view.states.map(state => ({
      dimension: state.dimension,
      state: state.state,
      ...(state.applicability ? { applicability: state.applicability } : {}),
      records: state.records,
      codes: state.codes,
      warnings: state.warnings,
      missingEvidence: state.missingEvidence,
      openFindings: state.openFindings,
      ...(state.fingerprints ? { fingerprints: state.fingerprints } : {}),
    })),
    completion: view.completion,
    warnings: [...new Set(view.states.flatMap(state => state.warnings))],
    undeclaredChanges: view.undeclaredChanges,
    ...(view.plan?.length ? { plan: view.plan } : {}),
    ...extra.payload,
  };
}

export function silentJson(context, command) {
  return {
    outputVersion: '1.0.0',
    command,
    gateVersion: context.version,
    marked: false,
    ok: true,
  };
}

// The gate validates its own JSON against the published output schema, so a drift in the machine
// surface fails here rather than in a driver.
export function assertOutputShape(context, payload) {
  const errors = schemaErrors(context.registry.schemas['gate-output'], payload);
  if (errors.length > 0) throw new Error(`gate output does not match its schema: ${errors.join('; ')}`);
  return payload;
}
