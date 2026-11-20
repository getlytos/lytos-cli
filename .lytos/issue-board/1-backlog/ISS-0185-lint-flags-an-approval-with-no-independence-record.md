---
id: ISS-0185
title: "`lyt lint` flags an approval in review that has no independence record"
type: feat
priority: P2-normal
effort: S
complexity: standard
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

# ISS-0185 — `lyt lint` flags an approval in review that has no independence record

## Context

First review, finding 6: `lyt close` and `lyt lint` are blind to a `review: go` that was typed by hand or written before 1.7, so it carries no `review_independence` record. The packet shows it, but nothing warns before the card is closed.

## Proposed solution

A lint warning (never an error) for a card in `4-review` or later with `review: go` or `go-pending-human` and no independence record, naming the remedy. Cards in `5-done` and schema v1 are ignored, as for the other review-related warnings. One line of study: reuse the packet's own "No independence record" doubt.

## Ready

- **Scope** — the warning and its tests.
- **Out of scope** — blocking `lyt close`.
- **Solution** — a lint rule over the existing record reader.
- `risk: medium`.

## Definition of done

- [ ] An approval with no record warns, with the remedy, and never changes the exit code — verify: auto
- [ ] A card with a valid record, a `no-go`, or in `5-done` does not warn — verify: auto
- [ ] The warning count on this repository's own backlog is stated in the pull request — verify: auto
