---
id: ISS-0116
title: "Documentation levels L0–L4 — the right level, decided by the change"
type: feat
priority: P2-normal
effort: M
complexity: standard
domain: [cli, method, docs]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0101, ISS-0107]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0116 — Documentation has levels, not a generic "update docs"

## Context

"Document everything" is over-engineering; "no docs" is debt. A senior decides the **level** from
the change (ADR-0007 §2). A DoD item should be able to name the required level rather than wave
at it.

## The gesture

Extend the `verify:` convention (ISS-0101) with `verify: doc <L>` where L ∈ L0..L4:
- **L0** in-code (docstrings, types) → auto gate (public API documented, examples compile);
- **L1** module README, **L2** architecture/ADR/diagrams → human (staleness is detectable);
- **L3** contract (API schema, changelog) → auto gate (schema ↔ implementation);
- **L4** runbook → overlaps `skills/`.
The DoD parser classifies `doc L0/L3` as auto and `doc L1/L2` as human. The risk matrix
(ISS-0114) decides which level is due.

## Definition of done

- [ ] `verify: doc <L>` parsed and classified auto (L0/L3) / human (L1/L2/L4) — *verify: auto*
- [ ] `lyt show` displays the documentation level required per item — *verify: auto*
- [ ] Convention documented (template + rules) — *verify: doc L1*
- [ ] Parsing tests per level — *verify: auto*

## Notes

- Extends the verification mode (ISS-0101). Ref: ADR-0007 §2. Depends on the kit (ISS-0107).
