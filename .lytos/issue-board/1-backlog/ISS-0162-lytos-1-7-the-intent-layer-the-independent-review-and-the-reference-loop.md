---
id: ISS-0162
title: "Lytos 1.7: the intent layer, the independent review and the reference loop"
type: feat
priority: P1-high
effort: XL
complexity: heavy
skill: ""
skills_aux: []
status: 1-backlog
branch: "feat/ISS-0162-lytos-1-7-the-intent-layer"
depends: []
related: [ISS-0163, ISS-0164, ISS-0165, ISS-0166, ISS-0167, ISS-0168, ISS-0169, ISS-0170]
created: 2026-11-20
schema_version: 2
risk: medium
---
# ISS-0162 — Lytos 1.7: the intent layer, the independent review and the reference loop

## Context

The parent of the 1.7 work (the first epic of the project: the `parent` field does not exist yet, so the children are listed here and linked through `related`). Decisions are in ADR-0009 (milestones, epics, leaves, discovery), ADR-0010 (reviewer independence) and ADR-0011 (the loop engine stays out of the CLI core). 1.7 adds: the three-level structure and the discovery gate, the computed independence of the review, the reference wrapper as method content, the design exchange entries, and the release.

## Proposed solution

One leaf card per change, each with its own branch and pull request, merged in order: ISS-0163 (fields and lint), then ISS-0164 (derived views) and ISS-0165 (discovery gate) which both depend on it, ISS-0166 (independence), ISS-0167 (method content), ISS-0168 (reference wrapper), ISS-0169 (design exchanges), and ISS-0170 (release 1.7.0).

## Ready

- **Scope** — deliver the 1.7 decisions above and publish lytos-cli 1.7.0.
- **Out of scope** — a loop engine in the CLI core, a new card status, cross-repository epics, an automatic choice of reviewer.
- **Solution** — one leaf per change, additive and optional fields only, so a project that adopts nothing changes nothing.
- `risk: medium`.

## Definition of done (acceptance scenarios)

- [ ] On a sample project, an epic with two leaves and a milestone shows a derived tree and progress in `lyt board` and `lyt show` — verify: auto
- [ ] A leaf of an epic in `phase: discovery` cannot enter the sprint, a `spike` can, and a recorded human override can — verify: auto
- [ ] A level-3 review at high risk cannot produce `review: go` alone, and the packet shows the independence level — verify: auto
- [ ] The reference wrapper cites only commands and park reasons that exist — verify: auto
- [ ] lytos-cli 1.7.0 is published and a fresh `lyt init` works without a terminal — verify: auto
- [ ] The owner accepts 1.7 on the review packet — verify: human:product-intent
