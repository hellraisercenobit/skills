# Doubles, data and isolation

Applies TP-03/04/08/09/10/11. First ask whether the real collaborator is cheap,
deterministic and part of the behavior. If so, a sociable test often preserves more meaning.
Isolate a concrete boundary or diagnostic problem, not every object in a constructor.

| Need | Candidate | Cost or alternative |
| --- | --- | --- |
| Controlled input | Stub function or typed literal | Never stub the policy being claimed as tested |
| Observable boundary effect | Spy, typed `vi.fn` or message journal | Assert content; count/order only when contractual |
| Stateful boundary behavior | Fake | Run applicable contracts on the actual adapter; disclose fidelity limits |
| Required collaboration protocol | Mock expectations | Internal call sequences can make refactors expensive |
| Simple fresh valid input | Inline data or factory | Defaults must not conceal the decisive value |
| Named reusable business case | Object mother using a factory | Avoid combinatorial catalogs and shared mutable objects |
| Meaningful construction/history | Builder using legitimate operations | No two-argument threshold or forced fluent API |
| Resource lifetime | Fixture/context or hook | Explicit owner, scope and cleanup, including failure |

`vi.fn` can act as stub or spy; its syntax does not make it a strict mock. Compare typed
functions, object literals and classes for clarity. `satisfies` checks a double without
widening its useful inferred shape. Do not coerce a partial object into a full dependency
with `as unknown as`. A narrow production port must express a genuine consumer contract.

Expose controls needed by the scenario, including an adjustable clock. Assert through
public observations. Builders must not seed private fields or bypass aggregate invariants.
Helper tests are appropriate when helpers have meaningful behavior, but they do not
qualify product policy. A fake cannot be the sole implementation of an untested business rule.

Shared contract checks name the guarantee and execute the same applicable scenarios on
fake and real adapter with fresh resources. File persistence is real infrastructure for a
file port; a second in-memory implementation is not. Persistence, concurrency, transactions,
errors and provider semantics need separate evidence when claimed. Do not require a
contract with an implementation that does not exist.

Testing can reveal the need to control an effect. Reuse an existing seam first. Ask the
design dimension to decide an architectural extraction only when the force warrants it;
do not add a test-only public getter or a full hexagonal architecture by default.
