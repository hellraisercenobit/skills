# Report format

Adapt length to the task. A targeted audit should usually be shorter than a general audit.

## Targeted audit

````markdown
# Agent instruction diagnosis - <symptom>

## Diagnosis
<1-3 paragraphs naming the most likely root cause(s) and confidence>

## Repair candidates

### [ ] F01 - <short title>

**Observed**
- `<file:line>` - relevant behavior
- `<file:line>` - relevant behavior

**Inferred**
Explain the causal link to the symptom.

**Smallest repair**
Describe the minimum change.

**Patch**
```diff
<exact reviewable diff>
```

**Affects**
- `<path>`

**Relationship**
Independent, depends on `Fxx`, or mutually exclusive with `Fxx`.

### [ ] F02 - <short title>
...

## Selection
Use a native multi-select when available. Otherwise ask the user to reply with IDs, for example `F01 F03`.

## Alternative causes still open
Only include plausible unresolved causes.

## Related risks
Only include issues materially related to recurrence.
````

If one root cause is strongly evidenced, lead with it rather than producing a long list.

## After application

```markdown
## Applied repairs
- [x] F01 - applied
- [x] F03 - needs-runtime-verification

## Remaining
- [ ] F02 - not selected

## Verification
- `F01`: <what was re-read/rechecked and result>
- `F03`: <static result and narrow runtime experiment if still needed>
```

Do not silently fold an unselected repair into another edit.

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

## Repair candidates

### [ ] F01 - <severity>: <short title>
Evidence, root cause, smallest repair, exact patch, affected files.

### [ ] F02 - <severity>: <short title>
...

## Selection
Use native multi-select when available; otherwise ask for IDs.

## Non-applyable findings
Findings that need more evidence before a safe patch can be proposed.

## Cleanup candidates
Only material redundant/stale instructions; do not turn every hygiene issue into a patch candidate.
```

## Finding requirements

Each material finding should answer:

1. What behavior is affected?
2. Which sources are involved?
3. Do their scopes actually overlap?
4. What is directly observed versus inferred?
5. Why can this change agent behavior?
6. What is the smallest remediation?
7. What exact patch implements it?
8. Can the patch be selected independently?

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
- patch candidates that cannot be applied safely from current evidence
