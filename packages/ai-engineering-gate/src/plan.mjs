import { join } from 'node:path';

import { fingerprintsOf, memberOf } from './context.mjs';
import { memberAgentType } from './registry.mjs';
import { reviewReady } from './state.mjs';
import { readRounds } from './store.mjs';

// The gate never spawns, stops or messages an agent: it prints what to launch. The brief is rendered
// from the declaration alone - the requester's wording, the factual constraints, the scope and the
// base - so nothing of the builder's rationale reaches a reviewer.
export function neutralBrief(context, state, view) {
  const member = memberOf(context, state.dimension);
  const reviewSkill = member.review.split('/').pop();
  const declaration = state.declaration;
  const rounds = readRounds(context.paths);
  const conflict = (rounds.conflicts ?? []).includes(state.dimension);
  const lines = [
    '```text',
    `You are the fresh ${state.dimension} reviewer. Run /${reviewSkill} yourself; do not delegate.`,
    'Read-only: do not modify any file, including code, records, catalogs or fixtures.',
    `Scope: ${(declaration.scope?.paths ?? []).join(', ')}; repository: ${context.repoRoot}.`,
    `Base: ${declaration.base}; include relevant uncommitted and new files.`,
    'Use git diff and file reads, never git log or PR descriptions.',
    `Original request: ${declaration.request}`,
    `Factual constraints: ${(declaration.constraints ?? []).join(' | ') || 'none stated'}.`,
    `Records: ${state.recordRefs.map(reference => join(context.paths.records, state.dimension, reference.replace('@', '/rev-') + '.json')).join(', ')}`,
    `Check evidence: ${join(context.paths.evidence, state.dimension)}`,
    `Undeclared changes: ${view.undeclaredChanges.join(', ') || 'none'}.`,
  ];
  if (declaration.scope?.configuration?.length) {
    lines.push(`Relevant configuration: ${declaration.scope.configuration.join(', ')}.`);
  }
  if (state.warnings.includes('duplicate-evidence')) {
    lines.push('Note: two cited evidence items in one record are identical.');
  }
  if (conflict) {
    lines.push('Note: this dimension turned non-SOUND on a state produced by correcting another; the conflicting findings are in the previous reports.');
  }
  for (const arbitration of arbitrationsOf(view, state.dimension)) {
    lines.push(`Note: the user arbitrated finding ${arbitration.finding} as ${arbitration.decision}: ${arbitration.words}`);
  }
  lines.push(`Open your window first: ${context.gateCommand} begin --dimension ${state.dimension}`);
  lines.push('Report your frozen matrix before opening the records. End with the domain report');
  lines.push('and one verdict, or explain incomplete execution without attestation.');
  lines.push('```');
  return lines.join('\n');
}

const arbitrationsOf = (view, dimension) => (view.arbitrations ?? []).filter(one => one.dimension === dimension);

export function dispatchPlan(context, view) {
  if (!reviewReady(view.states)) return [];
  return view.states
    .filter(state => state.applicability === 'applicable' && state.state !== 'attested')
    .map(state => {
      const member = memberOf(context, state.dimension);
      const fingerprints = fingerprintsOf(context, state.dimension, state.declaration);
      return {
        dimension: state.dimension,
        agent: memberAgentType(member),
        skill: member.review.split('/').pop(),
        fingerprints: {
          source: fingerprints.source,
          reference: fingerprints.reference,
          decision: fingerprints.decision,
        },
        brief: neutralBrief(context, state, view),
      };
    });
}
