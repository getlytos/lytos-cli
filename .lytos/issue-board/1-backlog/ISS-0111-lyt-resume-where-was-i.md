---
id: ISS-0111
title: "`lyt resume` — \"where was I\" across repos and surfaces"
type: feat
priority: P1-high
effort: M
complexity: standard
domain: [cli, dx]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0112]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0111 — Pick the work back up in one command

## Context

Reopening VSCode or the App tomorrow, you need an immediate answer to "where was I". The board
already carries the active issue (via claim → in-progress); what is missing is the "mine" view
that gathers state + WIP note + freshness, across repos and surfaces (ADR-0006 §2).

## The gesture

`lyt resume`: my in-progress issues (assignee = git identity) in the current repo (or `--all`
across repos), with branch, DoD ticked/remaining, the **WIP note** (ISS-0112) and origin
freshness. Suggests the resume action (`git switch`, `lyt pull-notes` when notes are stranded on
`main`). Read-only; `--json`.

## Definition of done

- [ ] Lists my in-progress issues + branch + DoD + WIP note + freshness — *verify: auto*
- [ ] Detects unrepatriated notes and suggests `pull-notes` — *verify: auto*
- [ ] `--all` across repos; `--json` — *verify: auto*
- [ ] Tests: simple in-progress, multi-repo, notes pending, nothing to resume — *verify: auto*

## Notes

- Builds on what exists: claim (assignee), pull-notes (ISS-0096), board --remote (ISS-0043).
  Does not duplicate the lead view. Ref: ADR-0006 §2. Depends on ISS-0112 (WIP note).
