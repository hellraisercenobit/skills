#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOKS_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = resolve(HOOKS_DIR, '..');
const REFERENCES_DIR = join(SKILL_DIR, 'references');
const DISCOVERY_SCRIPT = join(SKILL_DIR, 'scripts/discover-agent-config.sh');
const CONTRACT = JSON.parse(readFileSync(join(HOOKS_DIR, 'contract.json'), 'utf8'));

const INVOCATION = /^\s*\/(?:\S+:)?agent-instruction-doctor\b\s*([\s\S]*)$/;
const CANDIDATE_ID = /^F[0-9]{2}$/;
const CHECKLIST_REPLY = /^\s*F[0-9]{2}(?:\s+F[0-9]{2})*\s*$/;
const REPAIR_STATUS = ['applied', 'stale', 'failed', 'needs-runtime-verification'];
const SEVERITIES = ['Critical', 'Important', 'Moderate', 'Low'];
const REFERENCE = {
  targeted: 'targeted-audit.md',
  harness: ['claude-code-sources.md', 'codex-sources.md'],
  taxonomy: 'finding-taxonomy.md',
  report: 'report-format.md',
};
const PREFIX = 'agent-instruction-doctor guardrail';

export function hashText(text) {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

export function hashFile(path) {
  try {
    if (!statSync(path).isFile()) return null;
    return `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`;
  } catch {
    return null;
  }
}

export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.keys(value).sort()
    .filter(key => value[key] !== undefined)
    .map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
  return `{${entries.join(',')}}`;
}

export const hashJson = value => hashText(canonicalJson(value));

export function hashEntries(entries) {
  const ordered = [...entries].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return hashText(ordered.map(([name, digest]) => `${name}\u0000${digest ?? 'absent'}`).join('\u0001'));
}

const readEvent = () => {
  try {
    const raw = readFileSync(0, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const ledgerDir = () => join(tmpdir(), CONTRACT.ledger_dir);
const ledgerPath = session => join(ledgerDir(), `${session}.jsonl`);

function append(session, entries) {
  mkdirSync(ledgerDir(), { recursive: true });
  const stamped = [].concat(entries).map(entry => {
    const line = { ts: new Date().toISOString(), seq: process.hrtime.bigint().toString(), ...entry };
    return { ...line, line_hash: hashJson(line) };
  });
  appendFileSync(ledgerPath(session), stamped.map(line => `${JSON.stringify(line)}\n`).join(''));
  return stamped;
}

const compareLines = (a, b) => {
  if (a.ts !== b.ts) return a.ts < b.ts ? -1 : 1;
  const bySeq = BigInt(a.seq) - BigInt(b.seq);
  if (bySeq !== 0n) return bySeq < 0n ? -1 : 1;
  return (a.tool_use_id ?? '') < (b.tool_use_id ?? '') ? -1 : 1;
};

function readLedger(session) {
  const path = ledgerPath(session);
  if (!existsSync(path)) return null;
  const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean).map(text => JSON.parse(text));
  for (const line of lines) {
    const { line_hash, ...body } = line;
    if (hashJson(body) !== line_hash) throw new Error(`ledger line altered: ${line.event ?? 'unknown'} at ${line.ts}`);
  }
  return lines.sort(compareLines);
}

function chainOf(lines) {
  return lines.reduce((previous, line) => hashText(`${previous}${line.line_hash}`), 'sha256:genesis');
}

const PROGRESS_EVENTS = new Set(['armed', 'discovery', 'manifest', 'selection', 'closed']);

function consecutiveStopBlocks(lines) {
  let count = 0;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index].event === 'block') count += 1;
    else if (PROGRESS_EVENTS.has(lines[index].event)) break;
  }
  return count;
}

const inactive = run => run.state === 'idle' || run.state === 'closed';

function derive(lines) {
  const armedIndex = lines.findLastIndex(line => line.event === 'armed');
  if (armedIndex === -1) return { state: 'idle' };
  const run = lines.slice(armedIndex);
  const own = run.filter(line => !line.subagent);
  const manifest = own.filter(line => line.event === 'manifest').at(-1) ?? null;
  const selection = manifest ? own.filter(line => line.event === 'selection' && compareLines(line, manifest) > 0).at(-1) ?? null : null;
  const closed = own.some(line => line.event === 'closed');
  const state = closed ? 'closed' : selection ? 'applying' : manifest ? 'awaiting-selection' : 'armed';
  return {
    state,
    armed: run[0],
    manifest,
    selection,
    blocks: consecutiveStopBlocks(own),
    discovered: own.some(line => line.event === 'discovery'),
    sources: own.filter(line => line.event === 'source'),
    reads: own.filter(line => line.event === 'read'),
  };
}

const manifestPathFor = event => (event.scratchpad_dir
  ? join(event.scratchpad_dir, CONTRACT.ledger_dir, CONTRACT.manifest_file)
  : join(ledgerDir(), `${event.session_id}.${CONTRACT.manifest_file}`));

function purgeStaleLedgers() {
  if (!existsSync(ledgerDir())) return;
  const limit = Date.now() - CONTRACT.ledger_max_age_hours * 3600 * 1000;
  for (const name of readdirSync(ledgerDir())) {
    const path = join(ledgerDir(), name);
    try {
      if (statSync(path).mtimeMs < limit) rmSync(path, { force: true });
    } catch {
      continue;
    }
  }
}

function discoverSources(cwd) {
  const result = spawnSync('sh', [DISCOVERY_SCRIPT, '--root', cwd, '--include-global', '--format', 'tsv'], {
    encoding: 'utf8',
    timeout: CONTRACT.discovery_timeout_ms,
  });
  if (result.error?.code === 'ETIMEDOUT') return { files: [], limited: false, timedOut: true };
  if (result.status !== 0) return { files: [], limited: false, failed: true };
  const rows = result.stdout.split('\n').slice(1).filter(Boolean).map(row => {
    const [kind, scope, path] = row.split('\t');
    return { kind, scope, path };
  });
  const limited = rows.length > CONTRACT.source_hash_limit;
  return { files: limited ? rows.filter(row => CONTRACT.source_kinds_when_limited.includes(row.kind)) : rows, limited };
}

const contractDrift = () => hashFile(join(SKILL_DIR, 'SKILL.md')) !== CONTRACT.skill_sha256;

function arm(event, symptom, origin) {
  purgeStaleLedgers();
  const manifest = manifestPathFor(event);
  const cwd = event.cwd ?? process.cwd();
  const discovery = discoverSources(cwd);
  const note = discovery.timedOut ? 'source-discovery-timeout' : discovery.failed ? 'source-discovery-failed' : discovery.limited ? 'source-hash-limit' : null;
  append(event.session_id, [
    { event: 'armed', prompt_id: event.prompt_id ?? null, symptom, subject: manifest, origin },
    ...discovery.files.map(file => ({ event: 'source', kind: file.kind, subject: file.path, digest: hashFile(file.path) })),
    ...(note ? [{ event: 'note', subject: note, digest: null }] : []),
  ]);
  return { manifest, note };
}

const armedContext = ({ manifest, note }) => [
  `${PREFIX} is armed for this session.`,
  note === 'source-discovery-timeout' ? `Warning: source fingerprinting was skipped because discovery exceeded ${CONTRACT.discovery_timeout_ms} ms; the read-only phase is enforced on tool calls only.` : null,
  note === 'source-discovery-failed' ? 'Warning: source fingerprinting was skipped because scripts/discover-agent-config.sh failed; the read-only phase is enforced on tool calls only.' : null,
  `At step 10, write the candidates manifest with the Write tool to exactly: ${manifest}`,
  'It must validate against hooks/candidates.schema.json: {"mode":"targeted"|"general","symptom":"<the symptom or empty>","candidates":[{"id":"F01","title":"...","severity":"Critical|Important|Moderate|Low","observed":["<file:line> - fact"],"affects":["<path relative to cwd or absolute>"],"patch":"<unified diff or exact replacement>","relationship":"independent | depends on Fxx | mutually exclusive with Fxx"}]}',
  'Write it before asking which repairs to apply, even when the candidates list is empty. Every other file write is denied until the user selects candidate ids.',
  contractDrift() ? 'Warning: SKILL.md differs from the version hooks/contract.json describes; its obligations may be out of date.' : null,
].filter(Boolean).join('\n');

function ledgerOrLazyArm(event) {
  const existing = readLedger(event.session_id);
  if (existing) return existing;
  arm(event, '', 'lazy');
  return readLedger(event.session_id);
}

const fromTool = (event, entry) => ({
  ...entry,
  tool_use_id: event.tool_use_id ?? null,
  ...(event.agent_id ? { subagent: true } : {}),
});

const selectedLabels = answers => Object.values(answers ?? {})
  .flatMap(value => String(value).split(',').map(label => label.trim()).filter(Boolean));

const candidateIdOf = label => /^(F[0-9]{2})\b/.exec(label)?.[1] ?? null;

const promptContext = additionalContext => ({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext } });

function prompt(event) {
  const text = event.prompt ?? '';
  const invocation = INVOCATION.exec(text);
  if (invocation) {
    try {
      return promptContext(armedContext(arm(event, invocation[1].trim(), 'prompt')));
    } catch (error) {
      return promptContext(`${PREFIX} could not start: ${error.message}. Nothing will be verified this session; tell the user before continuing.`);
    }
  }
  const lines = readLedger(event.session_id);
  if (!lines) return null;
  const run = derive(lines);
  if (run.state === 'awaiting-selection' && CHECKLIST_REPLY.test(text)) {
    const ids = text.trim().split(/\s+/);
    const known = run.manifest.candidates.map(candidate => candidate.id);
    if (ids.every(id => known.includes(id))) append(event.session_id, { event: 'selection', selected: ids, origin: 'prompt' });
  }
  return null;
}

function validateManifest(value) {
  const errors = [];
  const expect = (condition, path, message) => { if (!condition) errors.push(`${path} ${message}`); };
  const isObject = candidate => candidate !== null && typeof candidate === 'object' && !Array.isArray(candidate);
  expect(isObject(value), '$', 'must be an object');
  if (!isObject(value)) return errors;
  expect(['targeted', 'general'].includes(value.mode), 'mode', 'must be "targeted" or "general"');
  expect(typeof value.symptom === 'string', 'symptom', 'must be a string');
  expect(Array.isArray(value.candidates), 'candidates', 'must be an array');
  const allowedTop = ['mode', 'symptom', 'candidates'];
  for (const key of Object.keys(value)) expect(allowedTop.includes(key), key, 'is not a manifest field');
  if (!Array.isArray(value.candidates)) return errors;
  const nonEmptyStrings = list => Array.isArray(list) && list.length > 0 && list.every(item => typeof item === 'string' && item.length > 0);
  const allowedCandidate = ['id', 'title', 'severity', 'observed', 'affects', 'patch', 'relationship'];
  value.candidates.forEach((candidate, index) => {
    const at = field => `candidates[${index}].${field}`;
    expect(isObject(candidate), `candidates[${index}]`, 'must be an object');
    if (!isObject(candidate)) return;
    expect(typeof candidate.id === 'string' && CANDIDATE_ID.test(candidate.id), at('id'), 'must match ^F[0-9]{2}$');
    expect(typeof candidate.title === 'string' && candidate.title.length > 0, at('title'), 'must be a non-empty string');
    expect(SEVERITIES.includes(candidate.severity), at('severity'), `must be one of ${SEVERITIES.join(', ')}`);
    expect(nonEmptyStrings(candidate.observed), at('observed'), 'must list at least one observed fact');
    expect(nonEmptyStrings(candidate.affects), at('affects'), 'must list at least one affected file');
    expect(typeof candidate.patch === 'string' && candidate.patch.length > 0, at('patch'), 'must be a non-empty string');
    expect(typeof candidate.relationship === 'string' && candidate.relationship.length > 0, at('relationship'), 'must be a non-empty string');
    for (const key of Object.keys(candidate)) expect(allowedCandidate.includes(key), at(key), 'is not a candidate field');
  });
  const ids = value.candidates.map(candidate => candidate?.id);
  ids.forEach((id, index) => expect(ids.indexOf(id) === index, `candidates[${index}].id`, 'is duplicated'));
  return errors;
}

function readManifestFile(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function recordManifest(event, path) {
  let value;
  try {
    value = readManifestFile(path);
  } catch (error) {
    return { decision: 'block', reason: `${PREFIX}: the candidates manifest at ${path} is not valid JSON (${error.message}). Rewrite it as one JSON object.` };
  }
  const errors = validateManifest(value);
  if (errors.length > 0) {
    return { decision: 'block', reason: `${PREFIX}: the candidates manifest at ${path} is invalid: ${errors.join('; ')}. Rewrite it to match hooks/candidates.schema.json.` };
  }
  append(event.session_id, fromTool(event, {
    event: 'manifest',
    subject: path,
    digest: hashFile(path),
    mode: value.mode,
    candidates: value.candidates.map(candidate => ({ id: candidate.id, affects: candidate.affects, patch_digest: hashText(candidate.patch) })),
  }));
  return null;
}

function recordSelection(event, run) {
  if (run.state !== 'awaiting-selection') return null;
  const labels = selectedLabels(event.tool_response?.answers ?? event.tool_input?.answers);
  if (labels.length === 0) return null;
  const known = run.manifest.candidates.map(candidate => candidate.id);
  const ids = labels.map(candidateIdOf);
  if (ids.every(id => id === null)) {
    return { decision: 'block', reason: `${PREFIX}: no selected option names a candidate id. Each option label must start with the candidate id (${known.join(', ')}); ask again with those labels.` };
  }
  const unknown = labels.filter((label, index) => !known.includes(ids[index]));
  if (unknown.length > 0) {
    return { decision: 'block', reason: `${PREFIX}: selected labels are not candidate ids of the manifest: ${unknown.join(', ')}. Offer exactly the manifest ids (${known.join(', ')}) and ask again.` };
  }
  append(event.session_id, fromTool(event, { event: 'selection', selected: ids, origin: 'question' }));
  return null;
}

function record(event) {
  const run = derive(ledgerOrLazyArm(event));
  if (inactive(run)) return null;
  const input = event.tool_input ?? {};
  switch (event.tool_name) {
    case 'Bash':
      if (/discover-agent-config\.sh/.test(input.command ?? '')) append(event.session_id, fromTool(event, { event: 'discovery' }));
      return null;
    case 'Read': {
      const path = resolve(input.file_path ?? '');
      append(event.session_id, fromTool(event, { event: 'read', subject: path, digest: hashFile(path) }));
      return null;
    }
    case 'Write':
      return resolve(input.file_path ?? '') === run.armed.subject && !event.agent_id ? recordManifest(event, run.armed.subject) : null;
    case 'AskUserQuestion':
      return event.agent_id ? null : recordSelection(event, run);
    default:
      return null;
  }
}

const allow = reason => ({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', permissionDecisionReason: reason } });
const deny = reason => ({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: `${PREFIX}: ${reason}` } });

function canWrite(event) {
  const run = derive(ledgerOrLazyArm(event));
  if (inactive(run)) return null;
  const input = event.tool_input ?? {};
  const target = resolve(input.file_path ?? input.notebook_path ?? '');
  if (target === run.armed.subject) return allow('candidates manifest of agent-instruction-doctor');
  if (run.state !== 'applying') {
    return deny(`the audit is read-only until the user selects candidate ids, so ${target} cannot be written. Present the repair candidates and ask which ones to apply.`);
  }
  const cwd = event.cwd ?? process.cwd();
  const selected = run.manifest.candidates.filter(candidate => run.selection.selected.includes(candidate.id));
  const owner = selected.find(candidate => candidate.affects.some(path => resolve(cwd, path) === target));
  if (!owner) return deny(`${target} is not selected: no selected candidate (${selected.map(candidate => candidate.id).join(', ')}) lists it under affects.`);
  const reread = run.reads.filter(read => read.subject === target && compareLines(read, run.selection) > 0).at(-1);
  if (!reread) return deny(`re-read ${target} with the Read tool immediately before editing it (step 12).`);
  if (hashFile(target) !== reread.digest) return deny(`${target} changed since its re-read; re-read it, or report ${owner.id} as stale.`);
  let current;
  try {
    current = readManifestFile(run.armed.subject).candidates.find(candidate => candidate.id === owner.id);
  } catch {
    current = null;
  }
  if (!current || hashText(current.patch) !== owner.patch_digest) {
    return deny(`${owner.id} is stale: its patch differs from the one the user selected. Present the revised candidate and ask again before applying it.`);
  }
  return null;
}

const referenceReads = run => new Set(run.reads
  .filter(read => dirname(read.subject) === REFERENCES_DIR)
  .map(read => basename(read.subject)));

const finding = (id, message) => ({ id, message: `${id}: ${message}` });

function diagnosisFindings(run) {
  const hard = [];
  const soft = [];
  if (!run.discovered) hard.push(finding('D1', 'run scripts/discover-agent-config.sh (step 2) before finishing.'));
  const changed = run.sources.filter(source => hashFile(source.subject) !== source.digest).map(source => source.subject);
  if (changed.length > 0) hard.push(finding('D4', `sources changed during the read-only audit: ${changed.join(', ')}. Restore them; repairs are applied only after the user selects candidate ids.`));
  if (!run.manifest) hard.push(finding('D5', `write the candidates manifest to ${run.armed.subject} (step 10), even with an empty candidates list.`));
  const reads = referenceReads(run);
  const targeted = run.armed.symptom.length > 0 || run.manifest?.mode === 'targeted';
  if (targeted && !reads.has(REFERENCE.targeted)) soft.push(finding('D2', `references/${REFERENCE.targeted} was not read on a targeted audit`));
  if (!targeted && !REFERENCE.harness.some(name => reads.has(name))) soft.push(finding('D2', `no harness reference was read (references/${REFERENCE.harness.join(' or references/')})`));
  const missingFormat = [REFERENCE.taxonomy, REFERENCE.report].filter(name => !reads.has(name));
  if (missingFormat.length > 0) soft.push(finding('D3', `not read: ${missingFormat.map(name => `references/${name}`).join(', ')}`));
  return { hard, soft };
}

function applyingFindings(run, message) {
  const missing = run.selection.selected.filter(id => !new RegExp(`\\b${id}\\b[^\\n]*\\b(${REPAIR_STATUS.join('|')})\\b`).test(message));
  return missing.length > 0
    ? [finding('D8', `report a status (${REPAIR_STATUS.join(', ')}) for ${missing.join(', ')} in the final message (step 13).`)]
    : [];
}

function blockStop(event, hard) {
  append(event.session_id, { event: 'block', obligations: hard.map(one => one.id) });
  return { decision: 'block', reason: `${PREFIX}: ${hard.map(one => one.message).join('\n')}` };
}

function canStop(event) {
  const lines = readLedger(event.session_id);
  if (!lines) return { systemMessage: `${PREFIX}: no ledger for this session, nothing was verified. Invoke /agent-instruction-doctor again to arm it.` };
  const run = derive(lines);
  if (inactive(run)) return null;
  if (run.blocks >= CONTRACT.stop_blocks_before_release) {
    append(event.session_id, { event: 'closed', origin: 'released' });
    return { systemMessage: `${PREFIX} released after ${run.blocks} blocks; the remaining obligations of this audit were not verified.` };
  }
  if (run.state === 'applying') {
    const hard = applyingFindings(run, event.last_assistant_message ?? '');
    if (hard.length > 0) return blockStop(event, hard);
    append(event.session_id, { event: 'closed', origin: 'verified' });
    return null;
  }
  const { hard, soft } = diagnosisFindings(run);
  if (hard.length > 0) return blockStop(event, hard);
  if (soft.length > 0) return { systemMessage: `${PREFIX}: ${soft.map(one => one.message).join('; ')}.` };
  return null;
}

function close(event) {
  const lines = readLedger(event.session_id);
  if (!lines) return null;
  const run = derive(lines);
  if (run.state !== 'idle') rmSync(run.armed.subject, { force: true });
  rmSync(ledgerPath(event.session_id), { force: true });
  return null;
}

function selfCheck(event) {
  const session = event.session_id ?? null;
  const lines = session ? readLedger(session) : null;
  const actual = hashFile(join(SKILL_DIR, 'SKILL.md'));
  return [
    `guardrail: ${fileURLToPath(import.meta.url)}`,
    `node: ${process.version}`,
    `ledger dir: ${ledgerDir()}`,
    `contract: ${actual === CONTRACT.skill_sha256 ? 'current' : `drift (contract ${CONTRACT.skill_sha256}, SKILL.md ${actual})`}`,
    `session: ${session ?? 'none'}`,
    `state: ${lines ? derive(lines).state : 'no ledger'}`,
    `chain: ${lines ? chainOf(lines) : 'none'}`,
    '',
  ].join('\n');
}

const COMMANDS = {
  prompt,
  record,
  'can-write': canWrite,
  'can-stop': canStop,
  close,
  'self-check': selfCheck,
};

function main() {
  const command = process.argv[2];
  const handler = COMMANDS[command];
  if (!handler) return;
  let output;
  try {
    output = handler(readEvent());
  } catch (error) {
    output = { systemMessage: `${PREFIX} ${command} failed: ${error.message}` };
  }
  if (typeof output === 'string') process.stdout.write(output);
  else if (output) process.stdout.write(JSON.stringify(output));
}

const invokedAs = () => {
  try {
    return realpathSync(process.argv[1] ?? '');
  } catch {
    return null;
  }
};

if (invokedAs() === fileURLToPath(import.meta.url)) main();
