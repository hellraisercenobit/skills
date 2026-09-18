import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { hashEntries, hashFile } from './hash.mjs';

const SHARED_SCHEMAS = [
  'marker', 'declaration', 'decision-envelope', 'review-envelope',
  'verdict-record', 'dispute', 'arbitration', 'evidence-append', 'gate-output',
];

// The gate resolves its members and its reference bundles from its own distribution root - the
// plugin root, the npm package or this checkout - and never from the target project, so a
// reference fingerprint means the same thing wherever the gate runs.
export function findDistributionRoot() {
  const override = process.env.AI_ENGINEERING_GATE_ROOT;
  if (override) return override;
  let directory = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 12; depth += 1) {
    if (existsSync(join(directory, 'contracts/members.json'))) return directory;
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  throw new Error('cannot resolve the gate distribution root: contracts/members.json not found');
}

export function loadRegistry(distributionRoot) {
  const manifest = JSON.parse(readFileSync(join(distributionRoot, 'contracts/members.json'), 'utf8'));
  const schemas = {};
  for (const name of SHARED_SCHEMAS) {
    schemas[name] = JSON.parse(readFileSync(join(distributionRoot, `contracts/schemas/${name}.schema.json`), 'utf8'));
  }
  return { ...manifest, schemas, root: distributionRoot };
}

export function gateVersion(distributionRoot) {
  const candidates = [
    join(distributionRoot, 'packages/ai-engineering-gate/package.json'),
    join(distributionRoot, 'package.json'),
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const { version } = JSON.parse(readFileSync(candidate, 'utf8'));
    if (version) return version;
  }
  return '0.0.0';
}

// The dimensions the project registered, resolved against the manifest. An identifier the manifest
// does not carry is an unresolvable registry member, not a dimension the gate invents.
export function registeredMembers(registry, marker) {
  if (marker.dimensions === 'all') return registry.members;
  const byName = new Map(registry.members.map(member => [member.dimension, member]));
  return marker.dimensions.map(name => {
    const member = byName.get(name);
    if (!member) throw new Error(`the marker registers ${name}, which the member manifest does not`);
    for (const path of [member.transpose, member.review, member.agent, member.decisionSchema]) {
      if (!existsSync(join(registry.root, path))) {
        throw new Error(`registry member ${name} does not resolve ${path}`);
      }
    }
    return member;
  });
}

export function memberDecisionSchema(registry, member) {
  return JSON.parse(readFileSync(join(registry.root, member.decisionSchema), 'utf8'));
}

export function memberEvidenceSchema(registry, member, kind) {
  const path = member.evidenceSchemas?.[kind];
  if (!path) return null;
  return JSON.parse(readFileSync(join(registry.root, path), 'utf8'));
}

function walkFiles(root, into = []) {
  if (!existsSync(root)) return into;
  if (statSync(root).isFile()) {
    into.push(root);
    return into;
  }
  for (const entry of readdirSync(root, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) walkFiles(path, into);
    else if (entry.isFile()) into.push(path);
  }
  return into;
}

// Catalog, decision schema, evidence schemas, guides, the review skill's references and the
// generated contract copy, plus the contract version and the gate version. A catalog edit
// therefore reopens every verdict that read it.
export function referenceFingerprint(registry, member, version) {
  const entries = [
    ['contract-version', registry.contractVersion],
    ['gate-version', version],
  ];
  for (const bundle of member.referenceBundle) {
    const absolute = join(registry.root, bundle);
    for (const file of walkFiles(absolute)) {
      entries.push([file.slice(registry.root.length + 1), hashFile(file)]);
    }
  }
  return hashEntries(entries);
}

// The bundle the gate distributes is authoritative. When a discoverable installed copy of the same
// skill differs from it, the state warns rather than guessing which one a reviewer read.
export function installedReferenceMismatch(registry, member) {
  const home = process.env.HOME;
  if (!home) return false;
  const name = member.transpose.split('/').pop();
  for (const base of [join(home, '.claude/skills'), join(home, '.agents/skills')]) {
    const installed = join(base, name, 'references');
    if (!existsSync(installed)) continue;
    const distributed = join(registry.root, member.transpose, 'references');
    for (const file of walkFiles(distributed)) {
      const mirror = join(installed, file.slice(distributed.length + 1));
      if (hashFile(mirror) !== hashFile(file)) return true;
    }
  }
  return false;
}
