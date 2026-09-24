import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const workflowDir = '.github/workflows';
const workflows = readdirSync(workflowDir)
  .filter(file => file.endsWith('.yml'))
  .map(file => ({ file, text: readFileSync(join(workflowDir, file), 'utf8') }));

const firstNode24Major = {
  'actions/checkout': 5,
  'actions/setup-node': 5,
  'actions/upload-artifact': 6,
};

test('every official action runs on the Node 24 runtime', () => {
  for (const { file, text } of workflows) {
    for (const [, action, ref] of text.matchAll(/uses:\s*(actions\/[\w-]+)@v(\d+)/g)) {
      const floor = firstNode24Major[action];
      assert.ok(floor, `${file} uses ${action}, whose first node24 major is not recorded here`);
      assert.ok(Number(ref) >= floor, `${file} pins ${action}@v${ref}, which still runs on Node 20; node24 starts at v${floor}`);
    }
  }
});

test('the workflows run the Node major the repository declares in engines', () => {
  const floor = /(\d+)/.exec(JSON.parse(readFileSync('package.json', 'utf8')).engines.node)[1];
  for (const { file, text } of workflows) {
    for (const [, version] of text.matchAll(/node-version:\s*["']?([^"'\s]+)/g)) {
      assert.equal(version, floor, `${file} runs Node ${version}, package.json engines starts at ${floor}`);
    }
  }
});
