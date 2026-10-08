#!/usr/bin/env bash
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

node - <<'JS'
const fs = require("fs");
const read = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const write = (path, data) => fs.writeFileSync(path, JSON.stringify(data, null, 2) + "\n");

const gate = "packages/ai-engineering-gate/package.json";
const { version } = read(gate);

const root = read("package.json");
root.version = version;
write("package.json", root);

const plugin = read(".claude-plugin/plugin.json");
plugin.version = version;
write(".claude-plugin/plugin.json", plugin);

const marketplace = read(".claude-plugin/marketplace.json");
marketplace.metadata.version = version;
for (const entry of marketplace.plugins) {
  if (entry.name === plugin.name) entry.version = version;
}
write(".claude-plugin/marketplace.json", marketplace);

console.log(`synced version ${version} from the gate to package.json, plugin.json and marketplace.json`);

const gateChangelog = "packages/ai-engineering-gate/CHANGELOG.md";
if (fs.existsSync(gateChangelog)) {
  const sections = (text) => text.split(/\n(?=## )/).slice(1).map((section) => section.replace(/\n+$/, ""));
  const versionOf = (section) => /^## (\S+)/.exec(section)[1];
  const rootChangelog = "CHANGELOG.md";
  const legacy = fs.existsSync(rootChangelog) ? sections(fs.readFileSync(rootChangelog, "utf8")) : [];
  const fromGate = sections(fs.readFileSync(gateChangelog, "utf8"));
  const covered = new Set(fromGate.map(versionOf));
  const merged = [...fromGate, ...legacy.filter((section) => !covered.has(versionOf(section)))];
  fs.writeFileSync(rootChangelog, `${["# Changelog", ...merged].join("\n\n")}\n`);
  console.log(`synced ${rootChangelog} from ${gateChangelog}: ${fromGate.length} gate sections above ${merged.length - fromGate.length} legacy sections`);
}
JS
