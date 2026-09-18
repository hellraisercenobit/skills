# Detection leads

These are search leads, not normative rules. Read the transpose-owned rule and context,
then steelman before confirming. Do not count words, mocks, classes or lines as defects.

| Candidate | Rule | Strongest plausible defense to examine |
| --- | --- | --- |
| Expected result repeats production algorithm | TP-01/05/15 | Independent specification or simpler model |
| Test reads private representation or seeds invalid state | TP-02/09/11 | Legitimate public read model or unknown boundary |
| Only verifies a business object's method was called | TP-03/08/10 | Interaction itself is an external protocol |
| Fake owns policy; only fake is exercised | TP-04/08 | Tooling test labelled honestly, product policy tested elsewhere |
| Fake/real shared tests never execute real adapter | TP-04/14 | No substitutability claim, limited stub role |
| Builder/mother hides the decisive input | TP-09/15 | Named reusable business case remains explicit |
| Every collaborator mocked or every resource real | TP-08/10 | Specific diagnostic/fidelity requirement |
| New getter/port exists only for assertion | TP-11 | Real unstable boundary or supported library consumer |
| Cast makes malformed data appear valid | TP-12 | Validated boundary with an explicit narrowing proof |
| Runtime green offered as type proof | TP-12/16 | Separate checker covers files and consumer contracts |
| Message-only error check accepts wrong error | TP-15 | Message is the whole public error contract |
| Promise assertion is unawaited; catch can skip assertions | TP-13/15 | Runner actually awaits returned operation |
| Concurrency test never forces overlap | TP-13 | Claim is eventual result, not exclusion |
| Generator cleanup/abort only tested on success | TP-13/16 | Contract has no ownership of that resource |
| Browser/provider claim backed by DOM/network simulation | TP-14 | Guarantee is within simulation fidelity |
| RED is import failure or changed oracle | TP-07 | Labelled setup or restarted cycle with preserved observations |
| TDD inferred from final files or commit messages | TP-07 | Retrospective quality audit with no chronology claim |
| Green run has missing required scenarios, skips or retries | TP-16 | Explicit non-required limitation, not claimed proof |
| Spec uses syntax the frozen compiler/`target` cannot parse (`satisfies`, `using`) | MT-23 | Compiler profile actually supports that syntax |
| Spec uses a runner API from a different adapter (`vi.fn` on Karma/Jasmine) | adapter-family | Detected adapter family actually owns that API |

An experiment must preserve the audited tree. Ask the builder to run a scoped isolated
probe when evidence is unavailable. Do not inject a defect or rewrite a test yourself.
