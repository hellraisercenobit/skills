import { isAbsolute, resolve } from 'node:path';

import { accept, refuse } from './answer.mjs';
import { coveringDimensions } from './changeset.mjs';
import { declarations, fingerprintsOf } from './context.mjs';
import { dispatchPlan } from './plan.mjs';
import { isInside, matchesPattern, toRepoRelative } from './repo.mjs';
import { suiteState } from './state.mjs';
import { arbitrations, currentRecords, readWindow } from './store.mjs';

export function suiteView(context) {
  const view = suiteState(context);
  view.arbitrations = context.dimensions.flatMap(dimension => arbitrations(context.paths, dimension)
    .map(one => ({ ...one, dimension })));
  view.plan = dispatchPlan(context, view);
  return view;
}

export function commandStatus(context) {
  const view = suiteView(context);
  return { ok: true, view };
}

export function commandCanStop(context) {
  const view = suiteView(context);
  return { ok: view.completion.complete, view };
}

// The text form answers the one question a builder asks - what does the gate see right now - while
// `--json` stays the single status shape, whose dimensions already carry the same three digests.
export function commandFingerprint(context, args) {
  const all = declarations(context);
  const wanted = args.dimension ? [args.dimension] : context.dimensions;
  const lines = wanted.map(dimension => {
    const fingerprints = fingerprintsOf(context, dimension, all[dimension]);
    return `${dimension}\n  source    ${fingerprints.source}\n  reference ${fingerprints.reference}\n  decision  ${fingerprints.decision}`;
  });
  return { ok: true, text: lines.join('\n'), view: suiteView(context) };
}

const WRITE_FORM = /(^|[\s;&|])(>|>>|tee\b|sed\s+-i|perl\s+-i|install\b|truncate\b|dd\b|mv\b|cp\b|rm\b|chmod\b|chown\b|ln\b)|git\s+(apply|checkout|restore|stash|clean|rm|mv)\b|\bpatch\b/u;

// `can-write` is mechanical only. It decides by file path, never by the content of a write, and it
// never infers applicability for the builder: a path outside every declared scope passes.
export function commandCanWrite(context, args) {
  const paths = args.paths ?? [];
  const command = args.command ?? null;
  const all = declarations(context);

  const openWindows = context.dimensions
    .map(dimension => ({ dimension, window: readWindow(context.paths, dimension) }))
    .filter(one => one.window && !one.window.closed)
    .map(one => one.dimension);

  const indexHit = paths.some(path => isInside(context.paths.index, absolute(context, path)))
    || (command !== null && command.includes(context.paths.index) && WRITE_FORM.test(command));
  if (indexHit) {
    return refuse('invalid-document', `the gate index is written by gate commands only: ${context.paths.index}`);
  }

  const scoped = [];
  for (const path of paths) {
    const relative = toRepoRelative(context.repoRoot, path);
    for (const dimension of coveringDimensions(relative, all)) {
      if (!scoped.includes(dimension)) scoped.push(dimension);
    }
  }
  if (command !== null && WRITE_FORM.test(command)) {
    for (const [dimension, declaration] of Object.entries(all)) {
      if (declaration?.applicability !== 'applicable') continue;
      const named = (declaration.scope?.paths ?? []).some(scope => command.includes(scope));
      if (named && !scoped.includes(dimension)) scoped.push(dimension);
    }
  }
  if (scoped.length === 0) {
    return accept(paths.length > 0
      ? `allowed: no declared scope covers ${paths.join(', ')}`
      : 'allowed: nothing in a declared scope');
  }
  if (openWindows.length > 0) {
    return refuse(
      'review-in-flight',
      `a review is in flight on ${openWindows.join(', ')}; wait for it to file or release before editing the change set`,
      openWindows,
    );
  }
  const without = scoped.filter(dimension => currentRecords(context.paths, dimension).length === 0);
  if (without.length > 0) {
    return refuse(
      'invalid-document',
      `${without.join(' and ')} has no validated decision record and this path is inside its declared scope; record the decision before the first affected write`,
      without,
    );
  }
  return accept(`allowed: ${scoped.join(', ')} already has a validated decision record`);
}

function absolute(context, path) {
  return isAbsolute(path) ? path : resolve(context.repoRoot, path);
}

// Paths a harness edit tool names, whatever the tool's own shape.
export function editedPaths(toolInput) {
  const found = [];
  for (const key of ['file_path', 'filePath', 'notebook_path', 'notebookPath', 'path', 'target_file']) {
    if (typeof toolInput?.[key] === 'string') found.push(toolInput[key]);
  }
  for (const edit of toolInput?.edits ?? []) {
    if (typeof edit?.file_path === 'string') found.push(edit.file_path);
    if (typeof edit?.path === 'string') found.push(edit.path);
  }
  for (const change of toolInput?.changes ?? []) {
    if (typeof change?.path === 'string') found.push(change.path);
  }
  return [...new Set(found)];
}

export function shellCommand(toolInput) {
  for (const key of ['command', 'cmd', 'script']) {
    if (typeof toolInput?.[key] === 'string') return toolInput[key];
  }
  return null;
}

export function isIgnoredByMarker(context, path) {
  return (context.marker.ignore ?? []).some(pattern => matchesPattern(path, pattern));
}
