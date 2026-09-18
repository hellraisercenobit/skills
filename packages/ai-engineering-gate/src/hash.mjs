import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';

// Content hashes only. A fingerprint never carries a revision, a timestamp or a path's mtime, so a
// content-neutral rebase and a re-checkout leave every verdict current.

export function hashText(text) {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

export function hashFile(path) {
  try {
    if (!statSync(path).isFile()) return null;
    return `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`;
  } catch {
    return null;
  }
}

// Canonical JSON with sorted keys, so two equal documents hash equally whatever their key order.
export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.keys(value).sort()
    .filter(key => value[key] !== undefined)
    .map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
  return `{${entries.join(',')}}`;
}

export function hashJson(value) {
  return hashText(canonicalJson(value));
}

// One fingerprint from a set of named content hashes. `null` marks a member that does not exist,
// so a deleted file changes the fingerprint instead of disappearing from it.
export function hashEntries(entries) {
  const ordered = [...entries].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return hashText(ordered.map(([name, digest]) => `${name}\u0000${digest ?? 'absent'}`).join('\u0001'));
}
