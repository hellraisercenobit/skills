---
"@hellraisercenobit/ai-engineering-gate": minor
---

`agent-instruction-doctor` ships a hook guardrail on Claude Code (`hooks/guardrail.mjs`): writes are denied until you select candidate ids, the turn cannot end before the discovery ran and the candidates manifest is written, an edit is allowed only on a selected file re-read and unchanged since, a stale candidate is refused, and the final message must report a status per selected repair. Evidence is an append-only ledger of content hashes; the guardrail is fail-visible and never blocks on its own errors.
