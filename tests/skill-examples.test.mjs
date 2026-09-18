import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import Ajv from 'ajv/dist/2020.js';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const { members } = read('contracts/members.json');
const envelope = read('contracts/schemas/decision-envelope.schema.json');

// A record example inside a SKILL.md is what a builder copies, so it is held to the same schemas as a
// record the gate accepts. Without this, a schema bump leaves the instructions quietly invalid.
const fenced = markdown => [...markdown.matchAll(/```json\n([\s\S]*?)```/g)].map(match => match[1]);

const validator = schema => new Ajv({ strict: true, allErrors: true }).compile(schema);

test('every record example a transpose skill prints validates against the envelope and its dimension schema', () => {
  let examples = 0;
  for (const member of members) {
    const dimension = read(join(member.decisionSchema));
    const checkEnvelope = validator(envelope);
    const checkDimension = validator(dimension);
    for (const source of [
      join(member.transpose, 'SKILL.md'),
      join(member.transpose, 'references/record.md'),
    ]) {
      let markdown;
      try {
        markdown = readFileSync(source, 'utf8');
      } catch {
        continue;
      }
      for (const block of fenced(markdown)) {
        let document;
        try {
          document = JSON.parse(block);
        } catch {
          continue;
        }
        if (document.dimension !== member.dimension || !document.forces && !document.sites) continue;
        examples += 1;
        assert.ok(checkEnvelope(document), `${source}: ${JSON.stringify(checkEnvelope.errors)}`);
        assert.ok(checkDimension(document), `${source}: ${JSON.stringify(checkDimension.errors)}`);
      }
    }
  }
  assert.ok(examples > 0, 'no record example was found in any transpose skill');
});

test('every shipped record example validates against the envelope and its dimension schema', () => {
  for (const member of members) {
    const example = join(member.transpose, 'references/record.example.json');
    const document = read(example);
    const checkEnvelope = validator(envelope);
    const checkDimension = validator(read(member.decisionSchema));
    assert.ok(checkEnvelope(document), `${example}: ${JSON.stringify(checkEnvelope.errors)}`);
    assert.ok(checkDimension(document), `${example}: ${JSON.stringify(checkDimension.errors)}`);
  }
});

test('the review skills name the gate commands their filing depends on', () => {
  for (const member of members) {
    const skill = readFileSync(join(member.review, 'SKILL.md'), 'utf8');
    for (const command of ['begin', 'attest', 'report']) {
      assert.match(
        skill,
        new RegExp(`ai-engineering-gate ${command} --dimension ${member.dimension}`),
        `${member.review}/SKILL.md never names \`${command}\` for ${member.dimension}`,
      );
    }
    assert.doesNotMatch(skill, /--dimension design\b(?!-)/, `${member.review}/SKILL.md still names the retired \`design\` dimension`);
  }
});

test('each reviewer agent opens its window and files through the gate for its own dimension', () => {
  for (const member of members) {
    const agent = readFileSync(member.agent, 'utf8');
    for (const command of ['begin', 'attest', 'report']) {
      assert.match(
        agent,
        new RegExp(`ai-engineering-gate ${command} --dimension ${member.dimension}`),
        `${member.agent} never names \`${command}\` for ${member.dimension}`,
      );
    }
  }
});

test('the transpose skills name the gate commands their evidence depends on', () => {
  for (const member of members) {
    const skill = readFileSync(join(member.transpose, 'SKILL.md'), 'utf8');
    for (const command of ['declare', 'record']) {
      assert.match(
        skill,
        new RegExp(`ai-engineering-gate ${command} --dimension ${member.dimension}`),
        `${member.transpose}/SKILL.md never names \`${command}\` for ${member.dimension}`,
      );
    }
  }
});
