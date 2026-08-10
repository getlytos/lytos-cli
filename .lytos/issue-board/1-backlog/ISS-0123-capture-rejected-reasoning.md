---
id: ISS-0123
title: "Log the rejected reasoning — the trench mini-ADR"
type: feat
priority: P2-normal
effort: S
complexity: standard
domain: [cli, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0112]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0123 — The formative "middle" must not go in the bin

## Context

Both panels converge: the mental model lives in the **branches not taken** — the approaches tried
and rejected, and why — and Lytos throws them away with the session (`session.jsonl`, "never read
back"; ADR-0006 §2: "the chat is disposable"). We lose the *rejected* reasoning, which is exactly
what forms judgment and what is missing at 3am.

## The gesture

A "considered / rejected approaches + reason" artifact attached to the diff (level L1), written
before `close` — a trench mini-ADR. Extends the WIP handoff note (ISS-0112) and the park taxonomy
(ADR-0004 §3, already a structured reason when the agent refuses to guess). Dead reasoning
becomes versioned rather than discarded.

## Definition of done

- [ ] Normed "rejected approaches" section, written before `close` — *verify: auto*
- [ ] `lyt show` surfaces it; linked to the diff/issue — *verify: auto*
- [ ] Presence/format tests — *verify: auto*
- [ ] Is the rejected trace genuinely reusable as material — *verify: human*

## Notes

- Refines ADR-0006. Ref: ADR-0008 (Consequences). Training material, not waste.
