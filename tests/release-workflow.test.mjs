import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/release.yml', 'utf8');

const stepUsing = action => {
  const steps = workflow.split(/\n(?=\s*- name:)/);
  const step = steps.find(one => one.includes(`uses: ${action}`));
  assert.ok(step, `release.yml has no step using ${action}`);
  return step;
};

test('the publish step authenticates npm through the .npmrc that setup-node writes', () => {
  const setupNode = stepUsing('actions/setup-node');
  const publish = stepUsing('changesets/action');
  if (/registry-url:/.test(setupNode)) {
    assert.match(publish, /NODE_AUTH_TOKEN:\s*\$\{\{\s*secrets\.NPM_TOKEN\s*\}\}/,
      'setup-node points npm at a .npmrc reading NODE_AUTH_TOKEN; without it the publish runs unauthenticated and npm answers E404');
  }
});
