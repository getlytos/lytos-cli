---
id: ISS-0167
title: "Method content: the epic and milestone templates and the discovery track"
type: docs
priority: P1-high
effort: M
complexity: standard
skill: ""
skills_aux: []
status: 4-review
branch: docs/ISS-0167-the-epic-and-milestone-templates
depends: [ISS-0163]
related: [ISS-0162]
created: 2026-11-20
schema_version: 2
risk: low
assignee: fredericgalline
updated: 2026-11-20
started_at: 2026-11-20
---
# ISS-0167 — Method content: the epic and milestone templates and the discovery track

## Context

ADR-0009. The method needs the templates and the explanation of the discovery track, shipped by `init` and `upgrade`.

## Proposed solution

Add `issue-epic.md` (intent in product words, acceptance scenarios, constraints, out of scope, cost class, design links, risk, the feasibility matrix and the freeze checklist) and a milestone template; extend `team-and-loop.md` and `default-rules.md` with the discovery track and the three levels.

## Ready

- **Scope** — two templates and the method text.
- **Out of scope** — code changes to the CLI.
- **Solution** — content only, delivered through the existing method-file mechanism.
- `risk: low`.

## Definition of done

- [x] `init` scaffolds the two templates and `upgrade` adds them without touching a modified file — verify: auto
- [x] A test fills the epic template and proves the Ready analysis does not misread it — verify: auto
- [ ] The text states the three levels, the freeze checklist and the gate — verify: reviewer:over-engineering
