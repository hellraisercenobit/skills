import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { refuse } from './answer.mjs';
import {
  commandArbitrate, commandDeclare, commandDispute, commandEvidenceAppend, commandRecord,
} from './cmd-write.mjs';
import {
  commandCanStop, commandCanWrite, commandFingerprint, commandStatus, editedPaths, shellCommand,
  suiteView,
} from './cmd-inspect.mjs';
import { commandAttest, commandBegin, commandCanReview, commandRelease, commandReport } from './cmd-review.mjs';
import { commandExport, commandReplay, exportVerificationErrors } from './cmd-transfer.mjs';
import { buildContext } from './context.mjs';
import { recordHandoff } from './identity.mjs';
import { hookAgent, readHookEvent, readStdin, sessionContext, stopBlock, toolDeny } from './hookio.mjs';
import { assertOutputShape, renderStatus, silentJson, statusJson } from './render.mjs';

const DOCUMENT_VERBS = new Set([
  'declare', 'record', 'evidence', 'begin', 'attest', 'report', 'dispute', 'arbitrate', 'replay', 'release',
]);
const WRITING_COMMANDS = new Set(['declare', 'record', 'evidence append', 'dispute', 'arbitrate']);
const EDIT_TOOLS = /^(edit|write|multiedit|multi_edit|notebookedit|notebook_edit|apply_patch|str_replace|create_file)$/i;
const SHELL_TOOLS = /^(bash|shell|run_terminal_cmd|terminal|exec)$/i;
const DISPATCH_TOOLS = /^(task|agent|dispatch_agent|subagent)$/i;

const HELP = `ai-engineering-gate - generic enforcement for the transpose/review suite

usage: ai-engineering-gate [command] [options]

With no command it prints the compact status of every registered dimension for this task.
In a repository that carries no \`.ai-engineering-suite.json\` marker it prints nothing and allows.

commands
  status                     compact state of every registered dimension, plus the next action
  declare  --dimension D --stdin    file a declaration before any record
  record   --dimension D --stdin    file a decision record; refuses a dangling citation
  evidence append --dimension D --stdin   append a journal event, a check output or a snapshot
  replay   --dimension D --record R --scenario S --command C   the gate runs and stamps a red/green pair
  begin    --dimension D     open a review window and freeze the state it binds to
  attest   --dimension D --stdin    file a SOUND review envelope
  report   --dimension D --stdin    file a SMELLS or VIOLATIONS review envelope
  dispute  --dimension D --stdin    contest one finding with a pointer to counter-evidence
  arbitrate --dimension D --stdin   the user's decision on a dispute; refused from an agent call
  release  --dimension D     abandon an open review window
  export                     copy the task's documents into the marker's export directory
  can-write --path P ...     may this path be edited now
  can-review --dimension D   may a fresh review of this dimension start now
  can-stop                   is the task complete; the exit code is the publication lock
  fingerprint [--dimension D]  the three fingerprints, as the gate computes them

options
  --json                     stable machine output, versioned and schema-checked
  --full                     every reason, the missing evidence and the dispatch plan
  --hook                     read the harness event on stdin and answer in its own shape
  --harness NAME             the harness the hook wiring runs under
  --task KEY                 the task key, for a pipeline or a detached head
  --evidence-root PATH       where the evidence lives; also the export directory in CI
  --base REF                 the comparison base, for CI verification
  --from-export              verify exported evidence: gate version and the marker on the base

exit codes
  0 allowed or valid   2 denied by policy   1 gate or infrastructure failure`;

function parseArguments(argv) {
  const args = { paths: [], command: null };
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = () => argv[index += 1];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
    switch (token) {
      case '--json': args.json = true; break;
      case '--full': args.full = true; break;
      case '--hook': args.hook = true; break;
      case '--stdin': args.stdin = true; break;
      case '--from-export': args.fromExport = true; break;
      case '--help': args.help = true; break;
      case '--version': args.version = true; break;
      case '--dimension': args.dimension = next(); break;
      case '--harness': args.harness = next(); break;
      case '--task': args.task = next(); break;
      case '--evidence-root': args.evidenceRoot = next(); break;
      case '--record': args.record = next(); break;
      case '--scenario': args.scenario = next(); break;
      case '--base': args.base = next(); break;
      case '--path': args.paths.push(next()); break;
      case '--command': args.command = next(); break;
      default: throw new Error(`unknown option ${token}; run --help`);
    }
  }
  args.name = positional.length === 0
    ? 'status'
    : (positional[0] === 'evidence' ? positional.slice(0, 2).join(' ') : positional[0]);
  args.positional = positional;
  return args;
}

function documentRefusal(reason) {
  const error = new Error(reason);
  error.refusal = refuse('invalid-document', reason);
  throw error;
}

function readDocument(args) {
  const raw = readStdin();
  if (!raw.trim()) {
    documentRefusal(`${args.name} reads its document on stdin; pipe it and pass --stdin`);
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    documentRefusal(`the document on stdin is not JSON: ${error.message}`);
  }
}

function requireDimensionFlag(args) {
  if (!args.dimension) throw new Error(`${args.name} needs --dimension <identifier>`);
}

function runCommand(context, args) {
  switch (args.name) {
    case 'status': return commandStatus(context);
    case 'can-stop': {
      const result = commandCanStop(context);
      if (!args.fromExport) return result;
      const errors = exportVerificationErrors(context, args.base);
      if (errors.length === 0) return result;
      return {
        ok: false,
        view: result.view,
        code: 'state-moved',
        reason: 'the exported evidence does not verify against this checkout',
        details: errors,
      };
    }
    case 'can-write': return commandCanWrite(context, args);
    case 'can-review': return commandCanReview(context, args);
    case 'fingerprint': return commandFingerprint(context, args);
    case 'declare': requireDimensionFlag(args); return commandDeclare(context, args, readDocument(args));
    case 'record': requireDimensionFlag(args); return commandRecord(context, args, readDocument(args));
    case 'evidence append': requireDimensionFlag(args); return commandEvidenceAppend(context, args, readDocument(args));
    case 'dispute': requireDimensionFlag(args); return commandDispute(context, args, readDocument(args));
    case 'arbitrate': requireDimensionFlag(args); return commandArbitrate(context, args, readDocument(args));
    case 'begin': requireDimensionFlag(args); return commandBegin(context, args);
    case 'attest': requireDimensionFlag(args); return commandAttest(context, args, readDocument(args));
    case 'report': requireDimensionFlag(args); return commandReport(context, args, readDocument(args));
    case 'release': return commandRelease(context, args);
    case 'replay': requireDimensionFlag(args); return commandReplay(context, args);
    case 'export': return commandExport(context);
    default: throw new Error(`unknown command ${args.name}; run --help`);
  }
}

function render(context, args, result) {
  if (args.json) {
    const view = result.view ?? suiteView(context);
    return JSON.stringify(assertOutputShape(context, statusJson(context, view, {
      command: args.name,
      ok: result.ok,
      payload: {
        ...(result.code ? { refusal: { code: result.code, reason: result.reason, ...(result.cause ? { cause: result.cause } : {}), ...(result.details?.length ? { details: result.details } : {}) } } : {}),
        ...(result.payload?.document ? { document: result.payload.document } : {}),
      },
    })), null, 2);
  }
  if (!result.ok) {
    const refusal = refusalText(result);
    return result.view ? `${refusal}\n\n${renderStatus(context, result.view, { full: args.full })}` : refusal;
  }
  if (result.text) {
    const warnings = [...new Set(result.payload?.warnings ?? [])];
    return [result.text, ...(warnings.length > 0 ? [`warn: ${warnings.join(', ')}`] : [])].join('\n');
  }
  return renderStatus(context, result.view, { full: args.full });
}

function refusalText(result) {
  const lines = [`refused: ${result.code}`, `reason: ${result.reason}`];
  if (result.cause) lines.push(`cause: ${result.cause}`);
  for (const detail of result.details ?? []) lines.push(`- ${detail}`);
  return lines.join('\n');
}

// A hook answers on stdout in the event's own shape and exits 0. In a marked repository a failure of
// the gate itself exits 2 with the failure as its reason, which both harnesses treat as blocking; a
// failure is never an approval.
function runHook(context, args) {
  const event = readHookEvent();
  const agent = hookAgent(event);
  const harness = context.harness;
  if (args.name === 'status') {
    const view = suiteView(context);
    const text = renderStatus(context, view, { full: false });
    const answer = sessionContext(`Engineering suite gate: ${context.gateCommand}\n${text}`, harness);
    return { ...(answer ? { stdout: JSON.stringify(answer) } : {}), exitCode: 0 };
  }
  if (args.name === 'can-write') {
    if (DISPATCH_TOOLS.test(agent.toolName ?? '')) return { exitCode: 0 };
    const paths = EDIT_TOOLS.test(agent.toolName ?? '') ? editedPaths(agent.toolInput) : [];
    const command = SHELL_TOOLS.test(agent.toolName ?? '') ? shellCommand(agent.toolInput) : null;
    if (command) noteHandoff(context, agent, command);
    if (paths.length === 0 && !command) return { exitCode: 0 };
    const result = commandCanWrite(context, { ...args, paths, command });
    if (result.ok) return { exitCode: 0 };
    return { stdout: JSON.stringify(toolDeny(refusalText(result), harness)), exitCode: 0 };
  }
  if (args.name === 'can-review') {
    const reviewer = reviewerFor(context, agent.toolInput);
    if (!reviewer) return { exitCode: 0 };
    const result = commandCanReview(context, { ...args, dimension: reviewer });
    if (result.ok) return { exitCode: 0 };
    return { stdout: JSON.stringify(toolDeny(refusalText(result), harness)), exitCode: 0 };
  }
  if (args.name === 'can-stop') {
    if (agent.reentrant) return { exitCode: 0 };
    const view = suiteView(context);
    if (view.completion.complete) return { exitCode: 0 };
    return { stdout: JSON.stringify(stopBlock(renderStatus(context, view, { full: true }), harness)), exitCode: 0 };
  }
  if (args.name === 'release') {
    const reviewer = reviewerFor(context, { subagent_type: agent.agentType }) ?? args.dimension;
    if (!reviewer) return { exitCode: 0 };
    commandRelease(context, { ...args, dimension: reviewer });
    return { exitCode: 0 };
  }
  throw new Error(`${args.name} has no hook form`);
}

// The agent identifier and agent type exist only in hook input inside a subagent call, so the hook
// records them for the gate command that call is about to run.
function noteHandoff(context, agent, command) {
  if (!command.includes('ai-engineering-gate')) return;
  const verb = /ai-engineering-gate(?:\.mjs)?["']?\s+(\S+)/.exec(command)?.[1];
  if (!verb || !DOCUMENT_VERBS.has(verb)) return;
  const dimension = /--dimension\s+([A-Za-z0-9-]+)/.exec(command)?.[1] ?? null;
  recordHandoff(context, {
    session: agent.session,
    verb: verb === 'evidence' ? 'evidence' : verb,
    dimension,
    agent: agent.agent,
    agentType: agent.agentType,
    toolUseId: agent.toolUseId,
  });
}

function reviewerFor(context, toolInput) {
  const type = toolInput?.subagent_type ?? toolInput?.agent_type ?? toolInput?.agentType ?? null;
  if (!type) return null;
  const member = context.members.find(one => one.agent.split('/').pop().replace(/\.md$/, '') === type);
  return member?.dimension ?? null;
}

export function main(argv) {
  let args;
  try {
    args = parseArguments(argv);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
  if (args.help || args.name === 'help') {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }
  let context;
  try {
    context = buildContext({
      harness: args.harness,
      task: args.task,
      evidenceRoot: args.evidenceRoot,
      fromExport: args.fromExport,
    });
  } catch (error) {
    process.stderr.write(`gate-failure: ${error.message}\n`);
    return args.hook ? 2 : 1;
  }
  if (args.version) {
    process.stdout.write(`${context.version}\n`);
    return 0;
  }
  // Silence outside a marked repository, even on failure, so installing the hooks once for every
  // project costs nothing elsewhere.
  if (!context.marked) {
    if (args.json) process.stdout.write(`${JSON.stringify(silentJson(context, args.name), null, 2)}\n`);
    return 0;
  }
  if (args.hook) {
    try {
      const answer = runHook(context, args);
      if (answer.stdout) process.stdout.write(`${answer.stdout}\n`);
      return answer.exitCode;
    } catch (error) {
      process.stderr.write(`gate-failure: ${error.message}\n`);
      return 2;
    }
  }
  try {
    const result = runCommand(context, args);
    const text = render(context, args, result);
    if (text) process.stdout.write(`${text}\n`);
    return result.ok ? 0 : 2;
  } catch (error) {
    if (error.refusal) {
      const text = render(context, args, error.refusal);
      if (text) process.stdout.write(`${text}\n`);
      return 2;
    }
    if (args.json) {
      process.stdout.write(`${JSON.stringify({
        outputVersion: '1.0.0',
        command: args.name,
        gateVersion: context.version,
        marked: true,
        ok: false,
        completion: { complete: false, codes: ['gate-failure'] },
        error: error.message,
      }, null, 2)}\n`);
    } else {
      process.stderr.write(`gate-failure: ${error.message}\n`);
    }
    return 1;
  }
}

function invokedAsCli() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(process.argv[1]));
  } catch {
    return false;
  }
}

if (invokedAsCli()) process.exitCode = main(process.argv.slice(2));
