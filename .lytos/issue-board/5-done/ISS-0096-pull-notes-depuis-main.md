---
id: ISS-0096
title: "`lyt pull-notes` — repatriate the .lytos commits from main onto the current branch"
type: feat
priority: P2-medium
effort: S
complexity: light
domain: [cli, git, dx]
skill: 
skills_aux: []
status: 5-done
branch: feat/1.4.0-retour-terrain
depends: []
created: 2026-08-04
updated: 2026-08-10
schema_version: 2
completed_at: 2026-08-10
---
# ISS-0096 — Mobile notes land on main, the work lives on branches

## Field feedback (immo, 03–04/08)

Twice in 24 hours: a note written from mobile lands on `main` (NOTE-0002 on tourism, then a whole
corpus of thinking produced at €690) while the work lives on a stack of branches — the branch's
board cannot see the notes, and repatriating them was done by hand-picking SHAs by eye and
cherry-picking them one at a time.

## The gesture

`lyt pull-notes`: lists the commits on `origin/main` missing from HEAD that touch **only**
`.lytos/`, cherry-picks them (`-x`) in order, regenerates the board. Refuses — and lists — the
ones that also touch code: those belong to a merge, not to a repatriation.

- [x] `.lytos`-only detection, ordered `-x` cherry-picks, board regenerated
- [x] `--dry-run` that lists without acting; reasoned refusal of mixed commits
- [x] Tests: pure notes, mixed commit refused, nothing to repatriate

## Audit — 2026-08-10

**Verdict:** GO

### Checks
- [x] Tests pass (313)
- [x] Issue checklist complete
- [x] Rules respected
- [x] Documentation aligned

### Notes
`scanOriginNotes` classifies only `.lytos/` commits, preserves chronological cherry-pick order, refuses mixed changes, and aborts a failed cherry-pick instead of leaving a conflicted operation behind.
