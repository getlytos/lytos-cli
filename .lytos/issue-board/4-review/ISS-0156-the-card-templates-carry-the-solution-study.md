---
id: ISS-0156
title: The card templates carry the solution study and a Solution line in Ready
type: feat
priority: P2-normal
effort: S
complexity: light
domain: [method, templates]
skill: ""
skills_aux: []
status: 4-review
branch: "feat/ISS-0156-the-card-templates-carry-the-solution-study-and-a-solution-line-in-ready"
depends: [ISS-0155]
created: 2026-11-20
updated: 2026-11-20
schema_version: 2
risk: low
assignee: fredericgalline
started_at: 2026-11-20
---
# ISS-0156 — The card templates carry the solution study and a Solution line in Ready

## Context

`cost-review` (ISS-0155) asks that the cheapest robust option be looked for on EVERY card, before
the code, in the card's "Proposed solution". The templates that cards are written from say nothing
about it, so the study would be remembered only by the projects that read the rubric.

## Proposed solution

- `issue-feature.md`: under "Proposed solution", a short instruction (one line at low risk, a table
  of two or three options with cost at 10 / 100 / 500 units from medium risk) and the table; in
  Ready, a **Solution** line.
- `issue-task.md`: a **Solution** line in Ready — one line, the cheapest option that stays robust.
- The default rules say where the study lives and who checks it: the `cost-review` review, not
  `lyt next`.
- Cost study: a template edit; constant. The Ready analysis does not read the new line, so no
  existing issue stops being ready.

## Ready

- **Scope** — the two templates in `method/`, their copies in this repo's `.lytos/`, one paragraph
  in the default rules.
- **Constraints** — English and generic; the Ready labels `lyt next` reads (scope, constraints, out
  of scope) are untouched.
- **Out of scope** — making `lyt next` or `lyt lint` check the Solution line.

## Definition of done

- [x] `issue-feature.md` carries the study under "Proposed solution" (the 10 / 100 / 500 table) and a **Solution** line in Ready — verify: auto
- [x] `issue-task.md` carries a **Solution** line in Ready — verify: auto
- [x] A card written from either template is still read as ready by the Ready analysis once its labels are filled — verify: auto:tests-negative
- [x] The default rules state where the study lives and that `cost-review` checks it — verify: auto
- [x] This repo's own template copies are identical to the shipped ones — verify: auto
