import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { hashEntries, hashFile } from './hash.mjs';
import { MARKER_FILE, git, gitLines, isInside, matchesPattern, toRepoRelative } from './repo.mjs';

// A path the gate owns or publishes is never part of the state a verdict binds to: the export
// directory carries the verdicts themselves, an evidence root inside the checkout is the index, and
// the marker configures enforcement rather than describing the change.
function excluded(context, path) {
  const { marker, repoRoot, evidenceRoot } = context;
  if (path === MARKER_FILE) return true;
  if (marker.exportDirectory && matchesPattern(path, marker.exportDirectory)) return true;
  if (isInside(repoRoot, evidenceRoot) && matchesPattern(path, toRepoRelative(repoRoot, evidenceRoot))) return true;
  return (marker.ignore ?? []).some(pattern => matchesPattern(path, pattern));
}

function mergeBase(repoRoot, base) {
  if (!base) return null;
  const found = git(['merge-base', base, 'HEAD'], repoRoot);
  if (found.ok && found.stdout) return found.stdout;
  const resolved = git(['rev-parse', '--verify', base], repoRoot);
  return resolved.ok ? resolved.stdout : null;
}

// The tracked diff between the merge-base and the worktree, staged, unstaged and untracked files
// included. A clean HEAD never identifies a dirty worktree, so the untracked half is not optional.
export function changeSet(context, base) {
  const { repoRoot } = context;
  const point = mergeBase(repoRoot, base);
  const names = new Set();
  if (point) {
    for (const name of gitLines(['diff', '--name-only', point], repoRoot)) names.add(name);
    for (const name of gitLines(['diff', '--name-only', '--cached', point], repoRoot)) names.add(name);
  } else {
    for (const name of gitLines(['diff', '--name-only', 'HEAD'], repoRoot)) names.add(name);
  }
  for (const name of gitLines(['ls-files', '--others', '--exclude-standard'], repoRoot)) names.add(name);
  return [...names].filter(name => !excluded(context, name)).sort();
}

function filesUnder(context, repoRoot, relativePath, into) {
  const absolute = join(repoRoot, relativePath);
  if (!existsSync(absolute)) {
    into.set(relativePath, null);
    return;
  }
  if (statSync(absolute).isFile()) {
    if (!excluded(context, relativePath)) into.set(relativePath, hashFile(absolute));
    return;
  }
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    filesUnder(context, repoRoot, `${relativePath.replace(/\/$/, '')}/${entry.name}`, into);
  }
}

// The union of the declared scope paths, the declared configuration files and the change set. A
// scope entry that names a directory expands to its files, so a new file in scope moves the state.
export function sourceFingerprint(context, declaration, change) {
  const { repoRoot } = context;
  const entries = new Map();
  for (const path of declaration?.scope?.paths ?? []) filesUnder(context, repoRoot, path, entries);
  for (const path of declaration?.scope?.configuration ?? []) filesUnder(context, repoRoot, path, entries);
  for (const path of change) {
    if (entries.has(path)) continue;
    entries.set(path, hashFile(join(repoRoot, path)));
  }
  return hashEntries(entries);
}

// Change-set paths outside every applicable declaration. Never a refusal: the gate does not guess
// applicability, and the reviewer still sees what the builder did not declare.
export function undeclaredChanges(change, declarations) {
  const scopes = declarations
    .filter(declaration => declaration?.applicability === 'applicable')
    .flatMap(declaration => declaration.scope?.paths ?? []);
  return change.filter(path => !scopes.some(scope => matchesPattern(path, scope)));
}

export function coveringDimensions(path, declarationsByDimension) {
  return Object.entries(declarationsByDimension)
    .filter(([, declaration]) => declaration?.applicability === 'applicable'
      && (declaration.scope?.paths ?? []).some(scope => matchesPattern(path, scope)))
    .map(([dimension]) => dimension);
}
