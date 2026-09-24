# Report format

Adapt length to the task. A targeted audit should usually be shorter than a general audit.

## Targeted audit

```markdown
# Agent instruction diagnosis - <symptom>

## Diagnosis
<1-3 paragraphs naming the most likely root cause(s) and confidence>

## Evidence chain

### <severity> - <finding label>: <short title>

**Observed**
- `<file:line>` - relevant behavior
- `<file:line>` - relevant behavior

**Inferred**
Explain the causal link to the symptom.

**Smallest repair**
Describe the minimum change.

**Proposed patch**
Show the concrete minimal diff or exact replacement. Do not apply it unless requested.

**Verification**
Give one narrow experiment if runtime confirmation is useful.

## Proposed patch
If multiple findings combine into one repair, provide one consolidated patch here instead of repeating fragments. Prefer a unified diff.

## Alternative causes still open
Only include plausible unresolved causes.

## Related risks
Only include issues materially related to recurrence.
```

If one root cause is strongly evidenced, lead with it rather than producing a long list.

## General audit

```markdown
# Agent instruction diagnosis

## Effective configuration
- Harnesses detected: ...
- Repo root: ...
- Instruction sources: ...
- Skills: ...
- Rules: ...
- Hooks: ...
- Agents/subagents: ...
- MCP/tool configs: ...

## Critical findings
...

## Important findings
...

## Moderate findings
...

## Reachability risks
...

## Execution-path risks
...

## Cleanup candidates
Redundant/stale instructions that can likely be deleted or replaced by pointers.

## Proposed patch
A minimal, reviewable diff that addresses the material findings.
```

## Finding requirements

Each material finding should answer:

1. What behavior is affected?
2. Which sources are involved?
3. Do their scopes actually overlap?
4. What is directly observed versus inferred?
5. Why can this change agent behavior?
6. What is the smallest remediation?
7. What concrete patch implements it?

## Evidence quality

Prefer exact line references when tooling permits.

Use these evidence labels:

- **Observed**: directly read from configuration/source.
- **Inferred**: reasoned effect of observed configuration.
- **Unverified**: requires runtime experiment, harness documentation, or unavailable environment state.

Do not call an inference observed.

## Avoid

Do not include:

- arbitrary health scores
- every minor duplicate
- cosmetic Markdown criticism
- contradictions between instructions whose scopes never intersect
- secret values
- remediation that adds more rules when deletion or consolidation would solve the problem
