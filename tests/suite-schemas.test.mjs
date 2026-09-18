import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import Ajv from 'ajv/dist/2020.js';

const compile = async path => new Ajv({ strict: true, allErrors: true })
  .compile(JSON.parse(await readFile(path, 'utf8')));
const shared = name => `contracts/schemas/${name}.schema.json`;
const design = 'skills/engineering/transpose-design-patterns/references/';
const testing = 'skills/engineering/transpose-testing-patterns/references/';

const rejects = (validate, valid, mutations) => {
  for (const mutate of mutations) {
    const invalid = structuredClone(valid);
    mutate(invalid);
    assert.equal(validate(invalid), false, mutate.toString());
  }
};

test('the marker accepts a minimal opt-in and rejects unknown or malformed settings', async () => {
  const validate = await compile(shared('marker'));
  const minimal = { markerVersion: '1.0.0', dimensions: 'all' };
  assert.equal(validate(minimal), true, JSON.stringify(validate.errors));
  assert.equal(validate({
    markerVersion: '1.0.0',
    dimensions: ['design-patterns', 'testing-patterns'],
    evidenceRoot: '~/.ai-engineering-evidence',
    exportDirectory: '.engineering-evidence',
    ignore: ['dist/**'],
    base: 'origin/main',
    conflictRoundCap: 3,
    roundCap: 12,
    allowReplay: false,
    requireVerifiedIdentity: true,
  }), true, JSON.stringify(validate.errors));
  rejects(validate, minimal, [
    marker => { delete marker.dimensions; },
    marker => { marker.markerVersion = '2.0.0'; },
    marker => { marker.dimensions = 'every'; },
    marker => { marker.dimensions = []; },
    marker => { marker.conflictRoundCap = 0; },
    marker => { marker.roundCap = 1.5; },
    marker => { marker.allowReplay = 'no'; },
    marker => { marker.unknown = true; },
  ]);
});

test('a declaration carries scope only when the dimension applies, and never skips its reason', async () => {
  const validate = await compile(shared('declaration'));
  const applicable = {
    document: 'declaration',
    documentVersion: '1.0.0',
    dimension: 'design-patterns',
    applicability: 'applicable',
    reason: 'The change adds a second tax regime behind one branch.',
    request: 'Support the Irish tax regime.',
    constraints: ['Node 24 is the only runtime.'],
    base: 'origin/main',
    scope: { paths: ['src/pricing/'], configuration: ['tsconfig.json'] },
    revision: { number: 1, previous: null, reason: 'First declaration.' },
  };
  assert.equal(validate(applicable), true, JSON.stringify(validate.errors));
  const nonApplicable = {
    document: 'declaration',
    documentVersion: '1.0.0',
    dimension: 'testing-patterns',
    applicability: 'non-applicable',
    reason: 'The change touches documentation only; no test site exists.',
    request: 'Support the Irish tax regime.',
    constraints: [],
    revision: { number: 1, previous: null, reason: 'First declaration.' },
  };
  assert.equal(validate(nonApplicable), true, JSON.stringify(validate.errors));
  const revised = structuredClone(applicable);
  revised.revision = { number: 2, previous: 'rev-1', reason: 'Widen the scope to the callers.' };
  assert.equal(validate(revised), true, JSON.stringify(validate.errors));
  rejects(validate, applicable, [
    declaration => { delete declaration.reason; },
    declaration => { declaration.reason = ''; },
    declaration => { delete declaration.request; },
    declaration => { delete declaration.scope; },
    declaration => { delete declaration.base; },
    declaration => { declaration.scope.paths = []; },
    declaration => { declaration.applicability = 'maybe'; },
    declaration => { declaration.revision.number = 2; },
    declaration => { declaration.unknown = true; },
  ]);
  rejects(validate, nonApplicable, [
    declaration => { declaration.scope = { paths: ['src/'] }; },
    declaration => { declaration.base = 'origin/main'; },
    declaration => { delete declaration.reason; },
  ]);
});

test('the decision envelope reads every dimension record and separates what it cites from what it plans', async () => {
  const validate = await compile(shared('decision-envelope'));
  for (const path of [
    `${design}record.example.json`,
    'skills/engineering/transpose-modern-typescript/references/record.example.json',
    `${testing}record.example.json`,
  ]) {
    const record = JSON.parse(await readFile(path, 'utf8'));
    assert.equal(validate(record), true, `${path}: ${JSON.stringify(validate.errors)}`);
  }
  const record = JSON.parse(await readFile(`${design}record.example.json`, 'utf8'));
  rejects(validate, record, [
    envelope => { delete envelope.cites; },
    envelope => { delete envelope.plans; },
    envelope => { delete envelope.base; },
    envelope => { delete envelope.contractVersions; },
    envelope => { envelope.scope = []; },
    envelope => { delete envelope.cites[0].claim; },
    envelope => { envelope.cites[0].checkedAt = '18-09-2026'; },
    envelope => { delete envelope.plans[0].role; },
    envelope => { envelope.revision = { number: 2, previous: null, reason: 'no previous' }; },
  ]);
  const revised = structuredClone(record);
  revised.revision = {
    number: 2, previous: 'rec-001@1', reason: 'Address F1.', changed: ['src/pricing/price-order.ts'], addresses: ['F1'],
  };
  assert.equal(validate(revised), true, JSON.stringify(validate.errors));
});

test('a design record answers the eight forces with enumerated values, once each', async () => {
  const validate = await compile(`${design}design-decision-record.schema.json`);
  const record = JSON.parse(await readFile(`${design}record.example.json`, 'utf8'));
  assert.equal(validate(record), true, JSON.stringify(validate.errors));
  const none = structuredClone(record);
  none.decision = {
    pattern: 'none',
    reason: 'The regime set is closed by declaration and branched at one site.',
    extensionCost: 'The next regime edits the union and its exhaustive branch, and the compiler reports the branch.',
    reconsiderWhen: 'A regime starts arriving from configuration.',
  };
  none.framework.transposition = null;
  none.artifacts = [];
  none.forces = none.forces.map(force => (force.force === 'extension'
    ? { ...force, value: 'declaration-only' }
    : force));
  assert.equal(validate(none), true, JSON.stringify(validate.errors));
  rejects(validate, record, [
    r => { r.dimension = 'design'; },
    r => { r.forces[0].value = 'yes'; },
    r => { r.forces[0].value = 'application-wide'; },
    r => { r.forces.pop(); },
    r => { r.forces[1] = structuredClone(r.forces[0]); },
    r => { delete r.forces[0].site; },
    r => { r.forces[0].force = 'vibes'; },
    r => { r.decision.pattern = 'observer'; },
    r => { r.decision.extensionCost = ''; },
    r => { r.plans[0].role = 'test'; },
    r => { r.invariants = []; },
    r => { r.artifacts = []; },
    r => { delete r.cites; },
    r => { r.unknown = true; },
  ]);
});

test('a review envelope types every finding, requires a remedy for evidence and a correction for judgment', async () => {
  const validate = await compile(shared('review-envelope'));
  const sound = {
    document: 'review-envelope',
    documentVersion: '1.0.0',
    dimension: 'design-patterns',
    contractVersion: '1.1.0',
    verdict: 'SOUND',
    records: ['rec-001@1'],
    checks: [{ command: 'npm test', outcome: 'exit 0, 41 tests', guarantee: 'The table stays exhaustive.' }],
    reviewer: { independence: 'Fresh context, brief only.', identity: 'design-pattern-reviewer' },
    findings: [],
    challengedSurvived: ['The sequential composition defence held.'],
  };
  assert.equal(validate(sound), true, JSON.stringify(validate.errors));
  const finding = {
    id: 'F1',
    kind: 'evidence',
    severity: 'Major',
    location: 'src/pricing/price-order.ts:priceOrder',
    rule: 'C04 planned artifact',
    expected: 'The journal the record plans.',
    recorded: 'shipping-events.jsonl',
    actual: 'Evidence not on file.',
    impact: 'The RED cannot be read.',
    defense: 'It could live in the worktree.',
    refutation: 'No file at that path in either place.',
    remedy: { kind: 'produce', artifact: 'shipping-events.jsonl' },
  };
  const reported = { ...sound, verdict: 'SMELLS', findings: [finding] };
  assert.equal(validate(reported), true, JSON.stringify(validate.errors));
  const judgment = {
    ...reported,
    verdict: 'VIOLATIONS',
    findings: [{
      ...finding,
      id: 'F2',
      kind: 'judgment',
      severity: 'Blocker',
      correction: 'Replace the repeated branch with the typed table the record decided.',
      remedy: undefined,
    }],
  };
  delete judgment.findings[0].remedy;
  assert.equal(validate(judgment), true, JSON.stringify(validate.errors));
  for (const remedy of [
    { kind: 'rerun', command: 'npm test' },
    { kind: 'replay', scenario: 'boundary', command: 'vitest run test/shipping.test.ts' },
    { kind: 'dispute' },
  ]) {
    assert.equal(validate({ ...reported, findings: [{ ...finding, remedy }] }), true, JSON.stringify(validate.errors));
  }
  rejects(validate, reported, [
    envelope => { delete envelope.findings[0].remedy; },
    envelope => { envelope.findings[0].remedy = { kind: 'produce' }; },
    envelope => { envelope.findings[0].remedy = { kind: 'rerun' }; },
    envelope => { envelope.findings[0].remedy = { kind: 'replay', scenario: 'boundary' }; },
    envelope => { envelope.findings[0].remedy = { kind: 'invent', artifact: 'x' }; },
    envelope => { envelope.findings[0].kind = 'judgment'; },
    envelope => { envelope.findings[0].severity = 'Critical'; },
    envelope => { delete envelope.findings[0].refutation; },
    envelope => { delete envelope.reviewer.identity; },
    envelope => { envelope.verdict = 'INCOMPLETE'; },
    envelope => { envelope.records = []; },
    envelope => { envelope.fingerprints = { source: 'sha256:0' }; },
  ]);
  rejects(validate, sound, [
    envelope => { envelope.findings = [finding]; },
    envelope => { envelope.verdict = 'SMELLS'; },
  ]);
});

test('the gate binds a verdict to its own fingerprints and attests SOUND only', async () => {
  const validate = await compile(shared('verdict-record'));
  const envelope = {
    document: 'review-envelope',
    documentVersion: '1.0.0',
    dimension: 'design-patterns',
    contractVersion: '1.1.0',
    verdict: 'SOUND',
    records: ['rec-001@1'],
    checks: [],
    reviewer: { independence: 'Fresh context.', identity: 'design-pattern-reviewer' },
    findings: [],
    challengedSurvived: [],
  };
  const attestation = {
    document: 'attestation',
    documentVersion: '1.0.0',
    id: 'att-001',
    dimension: 'design-patterns',
    task: 'REF-15',
    round: 1,
    filedAt: '2026-09-18T08:00:00.000Z',
    gateVersion: '0.6.0',
    fingerprints: { source: 'sha256:a', reference: 'sha256:b', decision: 'sha256:c' },
    identity: { session: 's1', agent: 'a1', agentType: 'design-pattern-reviewer', harness: 'claude-code', verified: true },
    envelope,
  };
  assert.equal(validate(attestation), true, JSON.stringify(validate.errors));
  const report = {
    ...attestation,
    document: 'report',
    id: 'rep-001',
    envelope: { ...envelope, verdict: 'VIOLATIONS' },
    openFindings: ['F1'],
  };
  assert.equal(validate(report), true, JSON.stringify(validate.errors));
  rejects(validate, attestation, [
    v => { v.envelope.verdict = 'SMELLS'; },
    v => { delete v.fingerprints.reference; },
    v => { delete v.identity.verified; },
    v => { v.round = 0; },
    v => { delete v.gateVersion; },
    v => { v.document = 'verdict'; },
  ]);
  rejects(validate, report, [
    v => { v.envelope.verdict = 'SOUND'; },
  ]);
});

test('a dispute needs a pointer to counter-evidence and an arbitration needs a decision', async () => {
  const disputeValidate = await compile(shared('dispute'));
  const dispute = {
    document: 'dispute',
    documentVersion: '1.0.0',
    dimension: 'testing-patterns',
    report: 'rep-001',
    finding: 'F1',
    counterEvidence: [{ path: 'shipping-events.jsonl', claim: 'The journal is on file and carries the RED event.' }],
    position: 'The evidence exists at the path the record plans.',
  };
  assert.equal(disputeValidate(dispute), true, JSON.stringify(disputeValidate.errors));
  rejects(disputeValidate, dispute, [
    d => { d.counterEvidence = []; },
    d => { delete d.counterEvidence[0].claim; },
    d => { delete d.position; },
    d => { delete d.finding; },
  ]);
  const arbitrationValidate = await compile(shared('arbitration'));
  const arbitration = {
    document: 'arbitration',
    documentVersion: '1.0.0',
    dimension: 'testing-patterns',
    dispute: 'dis-001',
    decision: 'uphold',
    words: 'The journal is there; the finding is closed.',
  };
  assert.equal(arbitrationValidate(arbitration), true, JSON.stringify(arbitrationValidate.errors));
  rejects(arbitrationValidate, arbitration, [
    a => { a.decision = 'maybe'; },
    a => { delete a.words; },
    a => { delete a.dispute; },
  ]);
});

test('an evidence append names its record and kind, and a journal event classes its red', async () => {
  const appendValidate = await compile(shared('evidence-append'));
  const append = {
    document: 'evidence-append',
    documentVersion: '1.0.0',
    dimension: 'testing-patterns',
    record: 'rec-001',
    kind: 'journal-event',
    produces: 'shipping-events.jsonl',
    payload: {
      record: 'rec-001',
      scenario: 'boundary',
      phase: 'red',
      command: 'vitest run test/shipping.test.ts',
      exitCode: 1,
      cause: 'expected 0, received 10',
      failureClass: 'expected-behavior-missing',
      output: 'runs/red.txt',
    },
  };
  assert.equal(appendValidate(append), true, JSON.stringify(appendValidate.errors));
  rejects(appendValidate, append, [
    a => { delete a.record; },
    a => { delete a.kind; },
    a => { delete a.payload; },
    a => { a.unknown = true; },
  ]);
  const eventValidate = await compile(`${testing}journal-event.schema.json`);
  assert.equal(eventValidate(append.payload), true, JSON.stringify(eventValidate.errors));
  const green = { ...append.payload, phase: 'green', exitCode: 0 };
  delete green.cause;
  delete green.failureClass;
  assert.equal(eventValidate(green), true, JSON.stringify(eventValidate.errors));
  rejects(eventValidate, append.payload, [
    event => { delete event.failureClass; },
    event => { delete event.cause; },
    event => { event.failureClass = 'red'; },
    event => { event.phase = 'refactoring'; },
    event => { delete event.output; },
    event => { event.exitCode = '1'; },
    event => { event.productionHash = 'sha256:forged'; },
    event => { event.replayed = false; },
  ]);
});

test('the gate output schema pins the states, completion codes, refusal codes and warnings', async () => {
  const schema = JSON.parse(await readFile(shared('gate-output'), 'utf8'));
  const validate = new Ajv({ strict: true, allErrors: true }).compile(schema);
  assert.deepEqual(schema.$defs.state.enum, [
    'undeclared', 'non-applicable', 'declared', 'recorded', 'in-review', 'reported', 'disputed', 'attested', 'stale',
  ]);
  assert.deepEqual(schema.$defs.completionCode.enum, [
    'missing-declaration', 'missing-reason', 'missing-record', 'missing-evidence', 'missing-review',
    'non-sound-review', 'remedies-pending', 'unresolved-dispute', 'arbitration-required', 'round-cap-reached',
    'stale-source', 'stale-reference', 'stale-decision', 'review-in-flight', 'gate-failure',
  ]);
  assert.deepEqual(schema.$defs.refusalCode.enum, [
    'invalid-document', 'dangling-reference', 'unknown-without-source', 'revision-without-change',
    'declaration-locked', 'finding-without-remedy', 'no-window', 'state-moved', 'identity-refused',
    'agent-arbitration-refused', 'replay-forbidden', 'dispute-without-evidence', 'not-review-ready',
    'review-in-flight',
  ]);
  assert.deepEqual(schema.$defs.warning.enum, [
    'duplicate-evidence', 'cross-dimension-conflict', 'undeclared-change', 'scope-wider-than-declaration',
    'reference-mismatch', 'fingerprint-ignored', 'identity-unverified',
  ]);
  const silent = { outputVersion: '1.0.0', command: 'status', gateVersion: '0.6.0', marked: false, ok: true };
  assert.equal(validate(silent), true, JSON.stringify(validate.errors));
  rejects(validate, silent, [
    output => { output.outputVersion = '2.0.0'; },
    output => { output.dimensions = [{ dimension: 'design-patterns', state: 'reviewed' }]; },
    output => { output.completion = { complete: false, codes: ['not-done'] }; },
    output => { output.refusal = { code: 'nope', reason: 'x' }; },
    output => { output.warnings = ['sloppy']; },
  ]);
});

test('the member manifest registers each dimension with everything the gate resolves', async () => {
  const manifest = JSON.parse(await readFile('contracts/members.json', 'utf8'));
  assert.equal(manifest.contractVersion, '1.1.0');
  assert.deepEqual(manifest.members.map(member => member.dimension), [
    'design-patterns', 'modern-typescript', 'testing-patterns',
  ]);
  for (const member of manifest.members) {
    assert.ok(member.contractVersions.includes(manifest.contractVersion), member.dimension);
    assert.ok(['implemented', 'qualified'].includes(member.status), member.status);
    assert.ok(member.decisionSchema.startsWith(member.transpose), member.decisionSchema);
    assert.deepEqual(member.referenceBundle, [`${member.transpose}/references`, `${member.review}/references`]);
    const schema = JSON.parse(await readFile(member.decisionSchema, 'utf8'));
    assert.equal(schema.properties.dimension.const, member.dimension);
    for (const path of Object.values(member.evidenceSchemas)) {
      assert.ok(path.startsWith(member.transpose), path);
      await readFile(path, 'utf8');
    }
  }
});
