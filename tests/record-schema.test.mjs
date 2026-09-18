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
  delete retained.sites[0].semanticDelta;
  assert.equal(validate(retained), true, JSON.stringify(validate.errors));
  const intended = structuredClone(example);
  intended.sites[0].ruleIds = ['MT-05', 'MT-24'];
  intended.sites[0].semanticDelta = {
    expected: 'intended',
    preserved: ['ordering'],
    intended: [{ property: 'type-information', change: 'The key type widens from the literal union to string.', reason: 'The native declaration is looser than the helper it replaces.' }],
  };
  assert.equal(validate(intended), true, JSON.stringify(validate.errors));
  const excludedConsumption = structuredClone(example);
  excludedConsumption.sites[0].consumption = { applicable: false, reason: 'No sequence crosses this site.' };
  assert.equal(validate(excludedConsumption), true, JSON.stringify(validate.errors));
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
    record => { record.schemaVersion = '1.0.0'; },
    record => { record.contractVersions = []; },
    record => { delete record.base; },
    record => { delete record.cites; },
    record => { delete record.plans; },
    record => { record.plans[0].role = 'whatever'; },
    record => { record.cites[0].path = ''; },
    record => { delete record.sites[0].semanticDelta; },
    record => { record.sites[0].semanticDelta.expected = 'intended'; },
    record => { record.sites[0].semanticDelta.preserved = ['colour']; },
    record => { delete record.sites[0].consumption; },
    record => { record.sites[0].consumption.mode = 'whenever'; },
    record => { record.sites[0].consumption = { applicable: false, reason: 'none', mode: 'eager' }; },
    record => { record.sites[0].ruleIds = ['MT-26']; },
    record => { record.profile.evidence = []; },
    record => { record.extra = true; },
  ];
  for (const mutate of mutations) {
    const invalid = structuredClone(example);
    mutate(invalid);
    assert.equal(validate(invalid), false, mutate.toString());
  }
});
