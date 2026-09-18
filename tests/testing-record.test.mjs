import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import Ajv from 'ajv/dist/2020.js';

const base = 'skills/engineering/transpose-testing-patterns/references/';

test('testing records accept direct and retained choices but reject invented or incomplete guarantees', async () => {
  const schema = JSON.parse(await readFile(`${base}decision-record.schema.json`, 'utf8'));
  const example = JSON.parse(await readFile(`${base}record.example.json`, 'utf8'));
  const validate = new Ajv({ strict: true, allErrors: true }).compile(schema);
  assert.equal(validate(example), true, JSON.stringify(validate.errors));
  const retained = structuredClone(example);
  retained.sites[0].decision.action = 'retain';
  assert.equal(validate(retained), true, JSON.stringify(validate.errors));
  const dependent = structuredClone(example);
  dependent.sites[0].oracle = {
    ...dependent.sites[0].oracle, independence: 'dependent', reason: 'The legacy calculator is the only statement of the rule.',
  };
  assert.equal(validate(dependent), true, JSON.stringify(validate.errors));
  const retainedWithoutOracle = structuredClone(example);
  retainedWithoutOracle.sites[0].decision.action = 'retain';
  delete retainedWithoutOracle.sites[0].oracle;
  delete retainedWithoutOracle.sites[0].plausibleDefect;
  assert.equal(validate(retainedWithoutOracle), true, JSON.stringify(validate.errors));
  const specialized = structuredClone(example);
  specialized.sites[0].decision.choice = 'specialized';
  specialized.sites[0].decision.patterns = ['TP-05'];
  assert.equal(validate(specialized), true, JSON.stringify(validate.errors));
  for (const mutate of [
    r => { r.sites[0].ruleIds = ['invented']; },
    r => { r.sites[0].decision.patterns = ['invented']; },
    r => { r.sites[0].decision.choice = 'specialized'; },
    r => { r.sites[0].alternatives = []; },
    r => { r.sites[0].alternatives[0].kind = 'alternative'; },
    r => { r.sites[0].oracle = 'Raw requirement supplies literal results.'; },
    r => { delete r.sites[0].oracle; },
    r => { delete r.sites[0].plausibleDefect; },
    r => { r.sites[0].oracle.kind = 'vibes'; },
    r => { r.sites[0].oracle.independence = 'dependent'; },
    r => { r.sites[0].plausibleDefect = { description: 'off by one' }; },
    r => { r.plans[0].role = 'fixture'; },
    r => { delete r.plans; },
    r => { delete r.cites; },
    r => { r.cites[0].checkedAt = 'yesterday'; },
    r => { r.contractVersions = ['0.9.0']; },
    r => { r.schemaVersion = '1.0.0'; },
    r => { r.sites[0].invariants = []; },
    r => { delete r.inventory.execution; },
    r => { r.inventory.behavior.sites = []; },
    r => { r.profile.evidence = []; },
    r => { r.adapter.version = '99.0.0'; },
    r => { r.adapter.name = 'jest'; },
    r => { delete r.base; },
    r => { r.revision.number = 2; },
    r => { r.sites[0].mode = 'made-up'; },
    r => { r.sites[0].checks = []; },
    r => { r.observedGreen = true; },
    r => { r.sites[0].decision.extra = true; },
  ]) {
    const invalid = structuredClone(example);
    mutate(invalid);
    assert.equal(validate(invalid), false, mutate.toString());
  }
});
