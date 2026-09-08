#!/usr/bin/env bash
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

node - <<'JS'
const fs = require("fs");
const read = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const write = (path, data) => fs.writeFileSync(path, JSON.stringify(data, null, 2) + "\n");

const { version } = read("package.json");

const plugin = read(".claude-plugin/plugin.json");
plugin.version = version;
write(".claude-plugin/plugin.json", plugin);

const marketplace = read(".claude-plugin/marketplace.json");
marketplace.metadata.version = version;
for (const entry of marketplace.plugins) {
  if (entry.name === plugin.name) entry.version = version;
}
write(".claude-plugin/marketplace.json", marketplace);

console.log(`synced version ${version} to plugin.json and marketplace.json`);
JS
