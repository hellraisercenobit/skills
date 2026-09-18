#!/usr/bin/env node
// The npm package must be a distribution root of its own: it carries the same `contracts/`,
// `skills/` and `agents/` trees the plugin carries, so `referenceFingerprint` reads byte-identical
// bytes under either install. Staged by `prepack`, removed by `postpack`, never committed.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packageRoot = join(repoRoot, 'packages/ai-engineering-gate');
const clean = process.argv.includes('--clean');

const manifest = JSON.parse(readFileSync(join(repoRoot, 'contracts/members.json'), 'utf8'));
const trees = new Set(['contracts']);
for (const member of manifest.members) {
  trees.add(member.transpose);
  trees.add(member.review);
  trees.add(dirname(member.agent));
}
const staged = [...trees].sort();

for (const tree of staged) {
  rmSync(join(packageRoot, tree), { recursive: true, force: true });
}
rmSync(join(packageRoot, 'README.md'), { force: true });
for (const name of ['skills', 'agents']) {
  const directory = join(packageRoot, name);
  if (existsSync(directory) && !staged.includes(name)) rmSync(directory, { recursive: true, force: true });
}

if (clean) {
  process.stdout.write(`removed the staged trees from the gate package: ${staged.join(', ')}\n`);
} else {
  for (const tree of staged) {
    const target = join(packageRoot, tree);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(repoRoot, tree), target, { recursive: true });
  }
  writeFileSync(join(packageRoot, 'README.md'), readFileSync(join(repoRoot, 'docs/ai-engineering-gate.md')));
  process.stdout.write(`staged into the gate package: ${staged.join(', ')}, README.md\n`);
}
