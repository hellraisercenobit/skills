import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

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
  const source = await readFile(resolve(values.root, 'contracts/suite-contract.md'), 'utf8');
  const { members } = JSON.parse(await readFile(resolve(values.root, 'contracts/members.json'), 'utf8'));
  let stale = 0;
  for (const { transpose } of members) {
    const target = resolve(values.root, transpose, 'references/suite-contract.md');
    let current;
    try {
      current = await readFile(target, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (current === source) continue;
    stale++;
    if (values.check) {
      console.log(`stale: ${transpose}/references/suite-contract.md`);
    } else {
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, source);
    }
  }
  console.log(`bundles: ${members.length}\n${values.check ? 'stale' : 'updated'}: ${stale}`);
  if (values.check && stale) {
    console.log('help: npm run sync:contract');
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.log(`error: ${error.message}\nhelp: node scripts/sync-suite-contract.mjs --help`);
  process.exitCode = 1;
});
