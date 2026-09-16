import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import Ajv from 'ajv/dist/2020.js';

const base = 'skills/engineering/transpose-modern-typescript/references/';

test('decision records accept supported idioms and justified none, reject incomplete or invented decisions', async () => {
  const schema = JSON.parse(await readFile(`${base}decision-record.schema.json`, 'utf8'));
  const example = JSON.parse(await readFile(`${base}record.example.json`, 'utf8'));
  const validate = new Ajv({ strict: true, allErrors: true }).compile(schema);
  assert.equal(validate(example), true, JSON.stringify(validate.errors));
  const retained = structuredClone(example);
  retained.sites[0].decision = {
    ...retained.sites[0].decision, choice: 'none', idioms: [], action: 'retain', mechanism: 'custom',
  };
  assert.equal(validate(retained), true, JSON.stringify(validate.errors));
  const mutations = [
    record => { record.inventory.idioms.sites = []; },
    record => { record.inventory.lifetime.applicable = true; record.inventory.lifetime.sites = []; },
    record => { record.sites[0].ruleIds = ['invented']; },
    record => { record.sites[0].decision.idioms = ['unknown']; },
    record => { record.sites[0].decision.idioms = []; },
    record => { record.sites[0].decision.choice = 'none'; },
    record => { record.sites[0].decision.reconsiderWhen = ''; },
    record => { record.sites[0].alternatives = []; },
    record => { record.sites[0].alternatives = record.sites[0].alternatives.filter(x => x.kind !== 'current'); },
    record => { record.sites[0].invariants = []; },
    record => { delete record.inventory.lifetime; },
    record => { record.catalogVersion = '99.0.0'; },
    record => { record.profile.evidence = []; },
    record => { record.extra = true; },
  ];
  for (const mutate of mutations) {
    const invalid = structuredClone(example);
    mutate(invalid);
    assert.equal(validate(invalid), false, mutate.toString());
  }
});
