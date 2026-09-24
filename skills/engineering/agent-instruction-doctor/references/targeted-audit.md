# Targeted audit method

Use this reference when the user supplies a symptom, complaint, or hypothesis with the skill invocation.

## Treat the prompt as evidence, not truth

The user's wording narrows the outcome to explain, not the sources to inspect.

Example:

> `Comments keep appearing even though I added a rule against them.`

Do not search only for `comment` or only inside rule files. The cause may live in a skill trigger, subagent, hook, generator, example, path matcher, settings level, or another instruction using different vocabulary.

## Convert the symptom into an observable behavior

Rewrite the complaint internally into a testable statement.

Examples:

| User symptom | Observable behavior |
|---|---|
| "rules aren't applied" | expected instruction is absent from or loses influence over the effective execution path |
| "comments keep coming back" | code output contains a disallowed comment-like construct after the workflow completes |
| "TDD skill is ignored" | skill is not discovered, not selected, or loses to another workflow branch when test-first work is expected |
| "Claude and Codex differ" | equivalent task reaches materially different instructions/tools/hooks between harnesses |

Clarify the category only when necessary. Otherwise inspect likely interpretations and state which one the evidence supports.

## Build competing hypotheses

Generate 3-8 plausible causes across different layers before deep inspection.

Useful layers:

1. wording: instruction is vague or uses a category narrower than intended
2. activation: trigger/pointer does not reliably fire
3. scope: matcher/path/subtree excludes the affected work
4. precedence: another applicable instruction wins or specializes behavior
5. harness-local routing: the active harness receives different guidance than expected
6. reachability: skill/tool/agent/script is not available
7. executable behavior: hook/generator/formatter mutates output
8. delegation: subagent does not inherit the same context
9. duplication: stale copy differs from source of truth
10. sequencing: later step invalidates an earlier compliant state

Do not force one hypothesis merely because it appears first.

## Trace causal evidence

For each surviving hypothesis, seek a chain:

```text
symptom
-> expected instruction
-> activation/scope/precedence
-> competing or missing effect
-> final behavior
```

Label gaps as unverified.

## Focus the output, not discovery

Discovery stays broad enough to resolve indirect causes.

The report stays narrow:

- root causes related to the symptom
- supporting evidence
- important alternative causes still unresolved
- smallest remediation
- concrete proposed patch
- optional verification experiment

Suppress unrelated configuration hygiene findings unless they materially increase the chance of recurrence.

## Example: no code comments

Suppose the user says:

> `I don't want comments in generated code. I have rules for it but they aren't followed.`

Inspect at least:

- exact wording of the prohibition
- whether it distinguishes comments, docstrings, JSDoc/TSDoc, TODO/FIXME, generated headers
- file/path scope and matcher
- whether the rule is always loaded or behind a context pointer
- overlapping rules asking for documentation or explanations
- skill instructions/examples that contain or request comments
- specialized subagent instructions
- hooks or generators that add headers/comments
- formatter/linter autofixes that introduce or require directives
- local versus global divergence
- cross-harness divergence only when both harnesses are involved or duplicated configuration suggests it

A useful finding is causal:

```text
IMPORTANT - SCOPE_GAP

Observed:
`.claude/rules/no-comments.md` applies only to `src/**/*.ts`.
The failing example is `e2e/foo.spec.ts`.

Inferred:
The no-comment rule never enters the effective instruction set for the failing file.

Smallest repair:
Expand the matcher to the intended test directories, or move the invariant to an
always-applicable authoritative instruction if it truly applies repository-wide.
```

An unhelpful finding is lexical:

```text
The word "comment" appears 17 times.
```
