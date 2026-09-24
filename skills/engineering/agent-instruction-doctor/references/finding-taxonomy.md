# Finding taxonomy

Use these labels consistently. Prefer one primary label per finding and mention secondary mechanisms in the explanation.

## Instruction and scope

### CONTRADICTION
Two simultaneously applicable instructions require incompatible behavior.

### UNSATISFIABLE_COMBINATION
Several individually reasonable instructions cannot all be satisfied in the same execution path.

### PRECEDENCE_COLLISION
Applicable instructions conflict and the effective winner cannot be established reliably.

### SCOPE_OVERLAP
Two instructions apply to overlapping work and their boundary is materially unclear.

### SCOPE_GAP
An intended invariant does not cover the files/tasks where the user expects it.

### SHADOWED_RULE
A more specific/effective instruction makes another instruction inert for relevant work.

### DEAD_RULE
A rule cannot match any relevant path/task or is otherwise unreachable.

### AMBIGUOUS_TRIGGER
The condition for applying an instruction is underspecified.

### TERMINOLOGY_COLLISION
One term has multiple meanings or the same concept is named differently enough to change behavior.

### NO_COMPLETION_CRITERION
A process instruction lacks an observable done condition and can stop early or drift.

## Pointers, duplication, and information hierarchy

### WEAK_POINTER
A required target is behind a pointer whose trigger is too vague or incomplete.

### BROKEN_POINTER
A pointer target is missing, moved, inaccessible, or malformed.

### DUPLICATE_AUTHORITY
The same rule is maintained in multiple places without a clear canonical source.

### DIVERGENT_DUPLICATE
Duplicated instructions have materially diverged.

### STALE_CACHE_RISK
Agent-facing prose copies information that is authoritative elsewhere and can drift.

### ORPHANED_INSTRUCTION
An instruction exists but no effective path exposes it when needed.

## Skills, agents, and tools

### UNREACHABLE_SKILL
A skill exists but is not discoverable/invocable in the relevant harness or scope.

### SKILL_TRIGGER_GAP
The skill description/pointer fails to cover an intended invocation branch.

### SKILL_COLLISION
Multiple skills claim overlapping triggers with incompatible workflows.

### UNREACHABLE_AGENT
A specialized agent/subagent exists but cannot be selected or receives insufficient context.

### AGENT_CONTEXT_DIVERGENCE
Delegated execution loses or changes a material instruction from the parent path.

### BROKEN_TOOL_REFERENCE
An instruction requires a tool/MCP capability that is absent, renamed, disabled, or inaccessible.

### UNAVAILABLE_CAPABILITY
The intended action is blocked by permissions, sandbox, network, executable availability, or another runtime constraint.

## Hooks and executable configuration

### HOOK_COLLISION
Multiple hooks on an overlapping event produce incompatible effects.

### HOOK_ORDER_AMBIGUITY
Correctness depends on hook order that is not reliably established.

### HOOK_RULE_CONTRADICTION
A hook causes behavior prohibited by an applicable instruction, or prevents required behavior.

### HOOK_SKILL_BYPASS
A hook or command path performs work that bypasses a required skill/workflow.

### BROKEN_HOOK_TARGET
A hook points to a missing/non-executable/invalid local target.

### HOOK_SCOPE_LEAK
A hook intended for a narrow context applies more broadly and changes unrelated work.

### HOOK_REENTRANCY
A hook can retrigger its own event path unexpectedly.

### HOOK_CYCLE
Hooks/scripts form an explicit or likely execution cycle.

### EXECUTION_CYCLE
The broader workflow returns to an earlier state without a stable terminating condition.

### ORDERING_CONFLICT
Multiple required steps need incompatible ordering.

### COMPLETION_INVALIDATION
A later step mutates or invalidates the state used to declare completion.

### NON_TERMINATING_WORKFLOW
The configured workflow can repeatedly fail/rewrite/revalidate without convergence.

## Harness and environment

Use harness-divergence labels only when the user compares harnesses, the symptom occurs in both, or duplicated cross-harness configuration is itself causal.

### HARNESS_DIVERGENCE
Claude and Codex receive materially different effective instructions for equivalent work.

### HARNESS_RULE_DIVERGENCE
Equivalent rules differ across harnesses.

### HARNESS_HOOK_DIVERGENCE
Equivalent events run materially different hooks across harnesses.

### RUNTIME_CONSTRAINT_CONFLICT
An instruction requires behavior the configured runtime disallows.

### ENVIRONMENT_DEPENDENT_BEHAVIOR
Correct behavior depends on unguaranteed environment state such as `PATH`, cwd, variables, shell, OS, or CI/local differences.

### VERSION_SEMANTICS_RISK
The configuration depends on harness/version behavior that is not pinned or confidently established.

## General effectiveness

### INEFFECTIVE_INSTRUCTION
An instruction is syntactically present but has no reliable route to influence the relevant execution.

Use a more specific label whenever possible and reserve this for cross-cutting cases.
