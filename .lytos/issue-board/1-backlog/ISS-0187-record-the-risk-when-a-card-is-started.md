---
id: ISS-0187
title: "Record the risk when a card is started, so a later hand edit is detectable"
type: feat
priority: P3-low
effort: M
complexity: standard
skill: ""
skills_aux: []
status: 1-backlog
branch: ""
depends: []
related: [ISS-0181]
created: 2026-11-20
schema_version: 2
risk: medium
---

# ISS-0187 — Record the risk when a card is started, so a later hand edit is detectable

## Context

First review, finding F7, documented in ADR-0010 "Known limits": lowering `risk: high` to `low` by hand before the first `lyt review` is not detectable. Candidate for the next minor release.

## Proposed solution

Record the risk in the card at `lyt start` (an auto-written field) and let `lyt report` and `lyt review` flag a verdict made at a lower risk than the recorded one. One line of study: the CLI already owns the start transition, the cheapest place to take the snapshot.

## Ready

- **Scope** — the snapshot, the packet line, the check in review.
- **Out of scope** — forbidding the edit.
- **Solution** — an auto-written start record.
- `risk: medium`.

## Definition of done

- [ ] `lyt start` records the risk and a hand edit made afterwards shows in the packet — verify: auto
- [ ] A card started before this change (no record) behaves as before — verify: auto
- [ ] The ADR-0010 limit is updated to match — verify: auto
