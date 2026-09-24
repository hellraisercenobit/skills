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

const majorOf = version => Number(/(\d+)/.exec(version)[1]);

test('the release action reads the publish output of the installed Changesets CLI', () => {
  const cliMajor = majorOf(JSON.parse(readFileSync('package.json', 'utf8')).devDependencies['@changesets/cli']);
  const publish = stepUsing('changesets/action');
  const actionMajor = majorOf(/uses: changesets\/action@(\S+)/.exec(publish)[1]);
  if (cliMajor >= 3) {
    assert.ok(actionMajor >= 2,
      `@changesets/cli ${cliMajor} reports releases through CHANGESETS_OUTPUT, which changesets/action reads from v2; v${actionMajor} pushes no tag and creates no GitHub release`);
    assert.doesNotMatch(publish, /^\s+(version|publish|commit|title):/m, 'changesets/action v2 ignores the v1 input names');
  }
});

test('the publish step authenticates npm through the .npmrc that setup-node writes', () => {
  const setupNode = stepUsing('actions/setup-node');
  const publish = stepUsing('changesets/action');
  if (/registry-url:/.test(setupNode)) {
    assert.match(publish, /NODE_AUTH_TOKEN:\s*\$\{\{\s*secrets\.NPM_TOKEN\s*\}\}/,
      'setup-node points npm at a .npmrc reading NODE_AUTH_TOKEN; without it the publish runs unauthenticated and npm answers E404');
  }
});
