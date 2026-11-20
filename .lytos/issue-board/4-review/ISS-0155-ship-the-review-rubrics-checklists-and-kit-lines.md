---
id: ISS-0155
title: Ship the review rubrics, the human checklists and the new kit lines
type: feat
priority: P1-high
effort: M
complexity: standard
domain: [method, quality-kit]
skill: ""
skills_aux: []
status: 4-review
branch: "feat/ISS-0155-ship-the-review-rubrics-the-human-checklists-and-the-new-kit-lines"
depends: [ISS-0153, ISS-0154]
created: 2026-11-20
updated: 2026-11-20
schema_version: 2
risk: medium
assignee: fredericgalline
started_at: 2026-11-20
---
# ISS-0155 — Ship the review rubrics, the human checklists and the new kit lines

## Context

The shipped kit already tells a project to bind `reviewer` lines to `rubric:<name>` and `human`
lines to `checklist:<name>` — and ships neither. `rubric:over-engineering`, `rubric:security`,
`rubric:architecture`, `checklist:a11y` and `checklist:intent` point at nothing, which is the "rule
that looks enforced and is not" the kit exists to prevent.

A private project (2026-11-20) wrote the missing pieces against its own stack:
a common review format, grids, human lists, three new review lines and two new human lines. The
useful part is not stack-bound. This card generalizes it and ships it, so every `lyt init` starts
with reviews that have a format, a grid and an owner.

## Proposed solution

- `method/quality/rubrics/` — `FORMAT.md` (the common format of a review) and eight grids:
  `security`, `architecture`, `ux`, `design-fidelity`, `red-team`, `over-engineering`,
  `tests-negative`, and `cost-review` (robustness is a floor, cost is the goal).
- `method/quality/checklists/` — `intent`, `a11y`, `legal-accounting`, `real-money`.
- `method/quality/kit.md` — six new lines (`ux-review`, `design-fidelity`, `red-team`,
  `cost-review` at `low,medium,high`, `legal-accounting`, `real-money`), the pointer convention,
  and a section stating the rule on `verify: human`. The six floor gates are not touched.
- `src/lib/method-files.ts` — the list of library files, shared by `init` (now) and `upgrade`
  (ISS-0159). A list rather than a directory walk, pinned against the disk by a test.
- Generalization is enforced by a test: no project-specific term ships in `method/quality/`.
- Cost study (`cost-review`): copying text files is constant per project, with no new dependency
  and no moving part. Rejected: generating the grids from code (a build step for static prose).

## Ready

- **Scope** — the library files, the kit lines and rule, the shared list, `init` shipping them, the
  `LYTOS.md` map.
- **Constraints** — English, generic (no stack, vendor, client or project name); zero runtime
  dependency; the six floor gates untouched; `cost-review` is the only `reviewer` line at `low`.
- **Out of scope** — delivering the library to existing projects (ISS-0159), the card templates
  (ISS-0156), the team catalog (ISS-0157), a doctor check that pointers resolve.

## Definition of done

- [x] The nine rubric files and four checklist files exist under `method/quality/`, each in its documented format — verify: auto
- [x] The shipped kit holds the six new lines with the right kind and tiers, `cost-review` at `low,medium,high`, and the six floor gates are unchanged — verify: auto
- [x] Every `rubric:` and `checklist:` pointer of the shipped kit resolves to a file, and the shared list matches the folders on disk — verify: auto:doc-L3
- [x] `lyt init` writes every library file into `.lytos/quality/` — verify: auto
- [x] No private name, machine path, address or credential ships in `method/quality/` — verify: auto
- [x] The kit states the rule on `verify: human`: last resort, always pinned, `auto:e2e` otherwise — verify: auto
- [x] `cost-review` makes robustness a floor and cost the goal, with the two moments and the 10 / 100 / 500 estimate — verify: auto
- [x] The leak check keeps no name: machine paths, addresses, credentials and private URLs are tested by shape, and private terms come only from `LYTOS_PRIVATE_TERMS` or the git-ignored `.lytos/private-terms.local` (nothing to search for when neither exists) — verify: auto
- [x] ADR-0007 records `cost-review` at `low` as the one deliberate exception to "nothing is always-on" and scopes `ux-review` and `design-fidelity` to projects with an interface; the kit and the README say the same — verify: auto
- [ ] The grids carry their rule without padding or overlap between one another — verify: reviewer:over-engineering
- [ ] Adding `cost-review` at `low` sits right with ADR-0007 ("nothing is always-on") — verify: human:product-intent
