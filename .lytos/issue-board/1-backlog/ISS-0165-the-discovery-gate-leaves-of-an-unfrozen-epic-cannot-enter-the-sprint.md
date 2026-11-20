---
id: ISS-0165
title: "The discovery gate: the leaves of an unfrozen epic cannot enter the sprint"
type: feat
priority: P1-high
effort: M
complexity: standard
skill: ""
skills_aux: []
status: 1-backlog
branch: "feat/ISS-0165-the-discovery-gate"
depends: [ISS-0163]
related: [ISS-0162]
created: 2026-11-20
schema_version: 2
risk: medium
---
# ISS-0165 — The discovery gate: the leaves of an unfrozen epic cannot enter the sprint

## Context

ADR-0009 §3. Work committed to a sprint before its intent is settled makes the loop build on a moving target.

## Proposed solution

Refuse the 1-backlog to 2-sprint move (and `lyt start`) for a leaf whose parent epic is in `phase: discovery`; make `lyt next` exclude such leaves. Two exemptions: a leaf marked `spike`, and a human override that takes a reason and is recorded in the card.

| Option | Build cost | Maintenance | Robustness |
|---|---|---|---|
| A. A hard refusal with two exemptions | low | low | cannot be bypassed silently |
| B. A warning only | lowest | lowest | does not prevent the failure it targets |

Decision: **A**.

## Ready

- **Scope** — the refusal in `move` and `start`, the exclusion in `next`, the `spike` exemption, the recorded override.
- **Out of scope** — the freeze checklist (method content, ISS-0167).
- **Solution** — a hard gate with two exemptions.
- `risk: medium`.

## Definition of done

- [ ] A leaf of a discovery epic is refused at the sprint entry and excluded by `lyt next` — verify: auto
- [ ] A `spike` leaf and a recorded override both pass, and the override reason is written into the card — verify: auto
- [ ] A card with no parent epic is unaffected — verify: auto
- [ ] The refusal message names the epic and the way forward — verify: auto
