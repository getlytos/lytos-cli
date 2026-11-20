---
id: ISS-0184
title: "`lyt next` never selects a card of type epic"
type: fix
priority: P2-normal
effort: XS
complexity: light
skill: ""
skills_aux: []
status: 1-backlog
branch: ""
depends: []
related: [ISS-0181]
parent: ISS-0181
created: 2026-11-20
schema_version: 2
risk: medium
---

# ISS-0184 — `lyt next` never selects a card of type epic

## Context

An epic placed in the sprint with an `auto` Definition of Done is loop-eligible, so `lyt next` can hand an epic to the loop as if it were a leaf. An epic is closed by its scenarios and the owner's acceptance, not worked by an iteration.

## Proposed solution

Skip a card of `type: epic` in `lyt next` with its own reason, `is-epic`, listed with the other reasons in `--json` and in the help. One line of study: the simplest rule that keeps an intent card out of the loop.

## Ready

- **Scope** — the exclusion, the reason, the help and the reference-loop drift test.
- **Out of scope** — a new command.
- **Solution** — a new blocked reason.
- `risk: medium`.

## Definition of done

- [ ] An epic in the sprint with an `auto` item is never returned and is reported under `blocked` with `is-epic` — verify: auto
- [ ] A leaf and a spike are unaffected — verify: auto
- [ ] The reference-loop skill names the new reason and its drift test stays green — verify: auto
