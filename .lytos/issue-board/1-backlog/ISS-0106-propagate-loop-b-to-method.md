---
id: ISS-0106
title: "Propagate the loop-B decision (ADR-0004) into lytos-method"
type: chore
priority: P2-normal
effort: S
complexity: standard
domain: [method, docs]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0098]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0106 — Push the method back down into the method repo

## Context

ADR-0004 is a *method* decision, but it was recorded in `lytos-cli` (where ADR-0001→0003 already
live, and because `lytos-method` is a stub with no ADR convention). It has to come back down into
`lytos-method`, as ISS-0067 and ISS-0092 already do for other decisions.

## The gesture

Carry into `lytos-method` the decisions **ADR-0004** (loop-B), **ADR-0005** (executable
standards), **ADR-0006** (multi-surface / multi-user continuity), **ADR-0007** (risk-proportional
gates + documentation levels + Definition of Ready) **and ADR-0008** (the human capability
contract: comprehension, competence, operability): the two real gates plus the ban on
self-closing, park-on-ambiguity, the DoD verification mode, the review checklist as a
first-class object. **And above all, raise to a front-rank Lytos principle** (manifest /
LYTOS.md): **"Lytos does not dictate the stack, it guarantees the stack is respected"** — the
project chooses (languages, libraries, design system, AI provider); the kit records, the gates
verify conformance. Decide along the way whether `lytos-method` finally gets an `adr/` folder
(and then copy ADR-0004/0005 into it) or whether LYTOS.md and the rules are enough.

## Definition of done

- [ ] Loop-B contract (ADR-0004) + standards (ADR-0005) + continuity (ADR-0006) + proportional gates (ADR-0007) + human capability (ADR-0008) reflected in LYTOS.md / rules — *verify: human*
- [ ] Human capability (ADR-0008) raised to the 5th governance question in the manifest — *verify: human*
- [ ] The principle "Lytos does not dictate the stack, it guarantees the stack is respected" stated in the manifest — *verify: human*
- [ ] The "adr/ in method?" decision settled and applied — *verify: human*
- [ ] Cross-consistency cli ↔ method verified (no contradiction) — *verify: human*

## Notes

- Do not duplicate blindly: `lytos-method` is still a stub (empty manifest).
- Ref: ADR-0004 (Consequences → Propagation). Follows the ISS-0067/0092 pattern.
