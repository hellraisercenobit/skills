import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

export const MARKER_FILE = '.ai-engineering-suite.json';
export const DEFAULT_EVIDENCE_ROOT = join(homedir(), '.ai-engineering-gate', 'evidence');

export function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return {
    ok: result.status === 0,
    stdout: (result.stdout ?? '').trim(),
    stderr: (result.stderr ?? '').trim(),
  };
}

export function gitLines(args, cwd) {
  const result = git(args, cwd);
  if (!result.ok) return [];
  return result.stdout.split('\n').map(line => line.trim()).filter(Boolean);
}

export function findRepoRoot(cwd) {
  const result = git(['rev-parse', '--show-toplevel'], cwd);
  return result.ok ? result.stdout : cwd;
}

export function readMarker(repoRoot) {
  const path = join(repoRoot, MARKER_FILE);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function expandHome(path) {
  if (path === '~') return homedir();
  if (path.startsWith('~/')) return join(homedir(), path.slice(2));
  return path;
}

export function resolveEvidenceRoot({ flag, env, marker, repoRoot }) {
  const chosen = flag ?? env ?? marker?.evidenceRoot;
  if (!chosen) return DEFAULT_EVIDENCE_ROOT;
  const expanded = expandHome(chosen);
  return isAbsolute(expanded) ? expanded : resolve(repoRoot, expanded);
}

// `feature/REF-15-something` names task REF-15, matching the delivery convention. A branch with no
// ticket key falls back to a slug of the whole branch name, so the gate never goes silent for want
// of a key, and an explicit flag or environment variable serves a detached pipeline head.
export function resolveTaskKey({ flag, env, repoRoot }) {
  if (flag) return flag;
  if (env) return env;
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], repoRoot).stdout;
  if (!branch || branch === 'HEAD') return 'detached-head';
  const ticket = /(?<![A-Z0-9])([A-Z][A-Z0-9]+-\d+)(?![0-9])/.exec(branch.toUpperCase());
  if (ticket) return ticket[1];
  return branch.replaceAll(/[^A-Za-z0-9]+/g, '-').replaceAll(/^-+|-+$/g, '').toLowerCase() || 'unnamed';
}

// `*` matches inside one segment, `**` across segments, and a bare directory name matches
// everything under it. Nothing else, so an ignore pattern cannot quietly widen.
export function matchesPattern(path, pattern) {
  const clean = pattern.replace(/^\.\//, '').replace(/\/$/, '');
  if (path === clean || path.startsWith(`${clean}/`)) return true;
  const expression = clean.split('**').map(part => part
    .replaceAll(/[.+^${}()|[\]\\]/g, '\\$&')
    .replaceAll('*', '[^/]*')
    .replaceAll('?', '[^/]')).join('.*');
  return new RegExp(`^${expression}$`, 'u').test(path);
}

export function isInside(parent, child) {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

export function toRepoRelative(repoRoot, path) {
  const absolute = isAbsolute(path) ? path : resolve(repoRoot, path);
  const rel = relative(repoRoot, absolute);
  return rel.split(sep).join('/');
}
