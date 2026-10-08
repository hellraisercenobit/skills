import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const SCRIPT = resolve('skills/engineering/agent-instruction-doctor/scripts/discover-agent-config.sh');

function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'doctor-discovery-')));
  const home = join(root, 'home');
  const project = join(root, 'project');
  const skill = join(home, '.claude/skills/foo');
  mkdirSync(join(skill, 'references'), { recursive: true });
  mkdirSync(join(home, '.agents/skills'), { recursive: true });
  mkdirSync(project, { recursive: true });
  writeFileSync(join(skill, 'SKILL.md'), '---\nname: foo\n---\n');
  writeFileSync(join(skill, 'references/method.md'), '# method\n');
  writeFileSync(join(skill, 'hooks.json'), '{}\n');
  mkdirSync(join(skill, 'agents'), { recursive: true });
  writeFileSync(join(skill, 'agents/openai.yaml'), 'interface: {}\n');
  symlinkSync(skill, join(home, '.agents/skills/foo'));
  writeFileSync(join(project, 'CLAUDE.md'), '# rules\n');
  const discover = format => {
    const result = spawnSync('sh', [SCRIPT, '--root', project, '--include-global', '--format', format], {
      encoding: 'utf8',
      env: { ...process.env, HOME: home },
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  const rows = tsv => tsv.trim().split('\n').slice(1).map(line => line.split('\t'));
  return { home, project, discover, rows, dispose: () => rmSync(root, { recursive: true, force: true }) };
}

const withFixture = (name, body) => test(name, () => {
  const f = fixture();
  try { body(f); } finally { f.dispose(); }
});

withFixture('every SKILL.md under a skills folder is a skill row at each location it is reachable from', f => {
  const kinds = new Map(f.rows(f.discover('tsv')).map(([kind, , path]) => [path, kind]));
  assert.equal(kinds.get(join(f.home, '.claude/skills/foo/SKILL.md')), 'skill');
  assert.equal(kinds.get(join(f.home, '.agents/skills/foo/SKILL.md')), 'skill');
  assert.equal(kinds.get(join(f.home, '.claude/skills/foo/references/method.md')), 'skill-resource');
  assert.equal(kinds.get(join(f.home, '.agents/skills/foo/hooks.json')), 'skill-resource');
  assert.equal(kinds.get(join(f.home, '.claude/skills/foo/agents/openai.yaml')), 'skill-resource');
});

withFixture('the markdown manifest lists skills without their resource files and says how many it left out', f => {
  const markdown = f.discover('markdown');
  assert.match(markdown, new RegExp(`\\| skill \\| global \\| \`${join(f.home, '.claude/skills/foo/SKILL.md')}\` \\|`));
  assert.match(markdown, new RegExp(`\\| skill \\| global \\| \`${join(f.home, '.agents/skills/foo/SKILL.md')}\` \\|`));
  assert.doesNotMatch(markdown, /skill-resource/);
  assert.doesNotMatch(markdown, /references\/method\.md/);
  assert.match(markdown, /skill resources omitted: `6`/);
});

withFixture('the tsv manifest keeps every resource row for the fingerprint', f => {
  const paths = f.rows(f.discover('tsv')).map(([, , path]) => path);
  for (const location of ['.claude', '.agents']) {
    assert.ok(paths.includes(join(f.home, location, 'skills/foo/references/method.md')), `${location} method.md`);
    assert.ok(paths.includes(join(f.home, location, 'skills/foo/hooks.json')), `${location} hooks.json`);
  }
});
