import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

// Every transpose bundle carries the shared references its readers need without the repository: the
// contract, and the schemas a builder or a reviewer pipes into the gate. They also enter the
// dimension's reference fingerprint, so an edit here expires the verdicts that read them.
const SHARED = [
  ['contracts/suite-contract.md', 'suite-contract.md'],
  ['contracts/schemas/declaration.schema.json', 'declaration.schema.json'],
  ['contracts/schemas/decision-envelope.schema.json', 'decision-envelope.schema.json'],
  ['contracts/schemas/review-envelope.schema.json', 'review-envelope.schema.json'],
  ['contracts/schemas/evidence-append.schema.json', 'evidence-append.schema.json'],
  ['contracts/schemas/dispute.schema.json', 'dispute.schema.json'],
  ['contracts/schemas/arbitration.schema.json', 'arbitration.schema.json'],
  ['contracts/schemas/marker.schema.json', 'marker.schema.json'],
];

async function readIfPresent(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function main() {
  const { values } = parseArgs({ options: {
    check: { type: 'boolean', default: false },
    root: { type: 'string', default: fileURLToPath(new URL('../', import.meta.url)) },
    help: { type: 'boolean', default: false },
  } });
  if (values.help) {
    console.log('usage: node scripts/sync-suite-contract.mjs [--check] [--root <repo>]\ncheck: report missing or stale bundles without writing\nroot: repository root, defaults to this checkout');
    return;
  }
  const { members } = JSON.parse(await readFile(resolve(values.root, 'contracts/members.json'), 'utf8'));
  const sources = [];
  for (const [source, name] of SHARED) {
    const content = await readIfPresent(resolve(values.root, source));
    if (content !== null) sources.push([name, content]);
  }
  let stale = 0;
  for (const { transpose } of members) {
    for (const [name, content] of sources) {
      const target = resolve(values.root, transpose, 'references', name);
      if (await readIfPresent(target) === content) continue;
      stale++;
      if (values.check) {
        console.log(`stale: ${transpose}/references/${name}`);
      } else {
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, content);
      }
    }
  }
  console.log(`bundles: ${members.length} x ${sources.length} shared references\n${values.check ? 'stale' : 'updated'}: ${stale}`);
  if (values.check && stale) {
    console.log('help: npm run sync:contract');
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.log(`error: ${error.message}\nhelp: node scripts/sync-suite-contract.mjs --help`);
  process.exitCode = 1;
});
