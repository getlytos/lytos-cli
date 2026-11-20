---
id: ISS-0167
title: "Method content: the epic and milestone templates and the discovery track"
type: docs
priority: P1-high
effort: M
complexity: standard
skill: ""
skills_aux: []
status: 5-done
branch: docs/ISS-0167-the-epic-and-milestone-templates
depends: [ISS-0163]
related: [ISS-0162]
created: 2026-11-20
schema_version: 2
risk: low
assignee: fredericgalline
updated: 2026-11-20
started_at: 2026-11-20
completed_at: 2026-11-20
commits: [442f366, ab448e7, e27e974, f3cae8f, 4629f73, 1c6e272, 889b647, 0aaa03d, ba6e11a, 27d1fd2, b5e8493, 3fd4185, a54e2a5, 957f8b6]
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
- [x] The text states the three levels, the freeze checklist and the gate — verify: reviewer:over-engineering

## Evidence (review)

Covered by the two independent reviews of 1.7 (a stronger model of the same provider, read-only, level 2, 2026-11-20), both GO with reserves: No finding against the epic and milestone templates or the discovery text; the over-engineering rubric ran on both reviews.
