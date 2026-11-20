---
id: ISS-0164
title: "Derived views: the tree and progress in board and show, and milestone files"
type: feat
priority: P1-high
effort: L
complexity: standard
skill: ""
skills_aux: []
status: 1-backlog
branch: "feat/ISS-0164-derived-tree-progress-and-milestones"
depends: [ISS-0163]
related: [ISS-0162]
created: 2026-11-20
schema_version: 2
risk: medium
---
# ISS-0164 — Derived views: the tree and progress in board and show, and milestone files

## Context

ADR-0009 §2: children and progress are derived from the `parent` fields of the leaves, never written by hand (ADR-0002).

## Proposed solution

`lyt board` shows an epic with its leaves indented and a progress count; `lyt show` on an epic lists its children and progress; a `lyt milestone` command reads `.lytos/milestones/<id>.md` (frontmatter: id, title, status, exit criteria) and derives its progress from its epics and leaves.

| Option | Build cost | Maintenance | Robustness |
|---|---|---|---|
| A. Derive on read, store nothing | low | low | always consistent with the cards |
| B. Store counts in the epic file | low | high: goes stale | a hand-edited count is wrong by construction |

Decision: **A**, the same principle as `BOARD.md`.

## Ready

- **Scope** — the tree and progress in board and show, the milestone file format and the read-only command.
- **Out of scope** — editing a milestone, cross-repository views.
- **Solution** — derive on read.
- `risk: medium`.

## Definition of done

- [ ] On a sample project the tree and progress are correct and change when a leaf moves — verify: auto
- [ ] A milestone's progress is derived from its epics and leaves — verify: auto
- [ ] A project without the fields sees the board exactly as before — verify: auto
- [ ] Nothing in the output is read from a hand-written list or count — verify: reviewer:architecture-review
