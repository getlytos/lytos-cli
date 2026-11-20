---
id: ISS-0181
title: "Lytos 1.7.1: hardening after the independent reviews"
type: epic
priority: P2-normal
effort: M
complexity: standard
skill: ""
skills_aux: []
status: 1-backlog
branch: ""
depends: []
related: [ISS-0182, ISS-0183, ISS-0184, ISS-0185, ISS-0186, ISS-0187, ISS-0188, ISS-0189]
milestone: 1-7-1
phase: frozen
created: 2026-11-20
schema_version: 2
risk: medium
---

# ISS-0181 — Lytos 1.7.1: hardening after the independent reviews

## Context

Two independent reviews of 1.7 (a stronger model of the same provider, read-only) returned GO with reserves. The blocking items were fixed before the release. What remains is hardening of edge cases and small documentation gaps: none corrupts data and none is urgent, but together they make the first public weeks cleaner. This epic is the first real use of the intent layer on this project: leaves carry `parent`, the version is a milestone.

## Intent

A reader who tries to bypass the independence check or the discovery gate by an unusual configuration or an unusual command finds the same behavior as the rules say, and the documents describe the CLI as it is.

## Ready

- **Scope** — leaves ISS-0182 to ISS-0186. Candidates for the next minor release (not in 1.7.1): ISS-0187 (record the risk at start), ISS-0188 (lint milestone files), ISS-0189 (consolidate the independence modules).
- **Out of scope** — new features.
- **Solution** — one small leaf per finding, each with its tests.
- `risk: medium`.

## Definition of done (acceptance scenarios)

- [ ] A provider rule with a gateway prefix cannot raise a high-risk review to level 1 on its own — verify: auto
- [ ] A discovery override with no git user is refused or marked, and the wrapper contract names `lyt close` — verify: auto
- [ ] `lyt next` never selects a card of `type: epic`, even with an `auto` Definition of Done — verify: auto
- [ ] `lyt lint` warns on a card in `4-review` or later whose approval has no independence record — verify: auto
- [ ] The maintainer accepts 1.7.1 on the review packet — verify: human:product-intent
