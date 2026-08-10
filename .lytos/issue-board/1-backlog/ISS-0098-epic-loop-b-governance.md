---
id: ISS-0098
title: "EPIC — Autonomous loop (loop-B) under Lytos governance"
type: feat
priority: P1-high
effort: XL
complexity: heavy
domain: [cli, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0099, ISS-0100, ISS-0101, ISS-0102, ISS-0103, ISS-0104, ISS-0105, ISS-0106]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0098 — EPIC: the autonomous loop under governance

## Context

Loop-B — an agent working through the sprint's issues up to review, with no human turn in
between — collides head-on with the manifest rule "the AI never decides alone". It is
reconcilable nonetheless: the loop is the engine, Lytos is the rail. The governance contract is
settled in **ADR-0004**. This epic groups the CLI building blocks that implement it. The CLI does
*not* run the loop (it calls no AI) — it provides the primitives that the wrapper or the App
orchestrate.

## The gesture

Ship ADR-0004's primitives and guarantee its 5 invariants: the loop never closes itself,
ambiguity parks instead of guessing, no issue without a machine-verifiable DoD enters the loop,
every `verify: human` item ends in a traced sign-off, implementer ≠ reviewer.

## Definition of done

- [ ] ADR-0004 accepted (`Status: Accepted`) after human review — *verify: human*
- [ ] The 8 child issues are delivered and closed — *verify: auto*
- [ ] An end-to-end demonstration run (selection → work → park OR review packet)
      documented on a real issue — *verify: human*

## Notes

- ADR: `.lytos/adr/ADR-0004-autonomous-loop-under-governance.md`
- Children: ISS-0099 (`lyt next`), ISS-0100 (park), ISS-0101 (DoD verify mode),
  ISS-0102 (`lyt budget`), ISS-0103 (review packet), ISS-0104 (checklist + sign-off),
  ISS-0105 (sprint report), ISS-0106 (method propagation).
- App (direction 2, later): a supervision cockpit, reusing ISS-0071 / ISS-0080.
