import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const promotedBuckets = ['engineering', 'productivity'];

const promotedSkills = () => promotedBuckets.flatMap(bucket =>
  readdirSync(join('skills', bucket), { withFileTypes: true })
    .filter(entry => entry.isDirectory() && existsSync(join('skills', bucket, entry.name, 'SKILL.md')))
    .map(entry => ({ bucket, name: entry.name, path: `skills/${bucket}/${entry.name}` })));

const declaredName = skillPath => {
  const frontmatter = /^---\n([\s\S]*?)\n---/.exec(readFileSync(join(skillPath, 'SKILL.md'), 'utf8'))?.[1] ?? '';
  return /^name:\s*["']?([^"'\n]+?)["']?\s*$/m.exec(frontmatter)?.[1];
};

const assertSameSet = (actual, expected, label) => {
  const missing = expected.filter(one => !actual.includes(one));
  const extra = actual.filter(one => !expected.includes(one));
  assert.deepEqual({ missing, extra }, { missing: [], extra: [] }, label);
};

test('the plugin ships exactly the promoted skills on disk', () => {
  const plugin = JSON.parse(readFileSync('.claude-plugin/plugin.json', 'utf8'));
  assertSameSet(plugin.skills, promotedSkills().map(skill => `./${skill.path}`), 'plugin.json skills');
});

test('every promoted skill declares the name of its folder', () => {
  for (const skill of promotedSkills()) {
    assert.equal(declaredName(skill.path), skill.name, `${skill.path}/SKILL.md name`);
  }
});

test('every promoted skill has one docs page and no page outlives its skill', () => {
  for (const bucket of promotedBuckets) {
    const pages = readdirSync(join('docs', bucket))
      .filter(file => file.endsWith('.md') && file !== 'README.md')
      .map(file => file.slice(0, -'.md'.length));
    const skills = promotedSkills().filter(skill => skill.bucket === bucket).map(skill => skill.name);
    assertSameSet(pages, skills, `docs/${bucket} pages`);
  }
});
