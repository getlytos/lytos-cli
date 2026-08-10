---
id: ISS-0124
title: "`lyt journal` — the derived logbook (a changelog of the why)"
type: feat
priority: P2-normal
effort: M
complexity: standard
domain: [cli, docs, app]
skill: 
skills_aux: []
status: 4-review
branch: claude/claude-loops-lytos-wtkc94
depends: []
created: 2026-08-09
updated: 2026-08-10
schema_version: 2
assignee: Claude
started_at: 2026-08-10
---
# ISS-0124 — The project's narrative, derived instead of written

## Context

Between the changelog (the *what*) and the ADR (the *verdict*), a **readable logbook** is
missing: the chronological narrative of the *why* and the *how*, pointing back to the issues for
detail. Key point: that content **already exists** in closed issues (context, `review` verdict,
rejected reasoning, fixes). So there is nothing to write — it is a **derived view**, like
`BOARD.md` (ADR-0002): it cannot rot, zero ceremony.

Three readers, three doors: the **stakeholder** (a changelog of the why), the **newcomer**
onboarding (a chronological summary), the **learner** (companionship material — the why and the
dead ends). This is the "transmission" face of ADR-0008, in passive form.

## The gesture

`lyt journal` recomposes a `JOURNAL.md` (derived, regenerated — the `BOARD.md`/ADR-0002
precedent) from **`5-done` + archive** issues, chronologically. Grouped **by sprint** (section =
the sprint objective from `sprint.md`), each issue is one line: the *why* (one sentence of
context), the **verdict** (`review: go|no-go`), and a **link to the fiche** for detail. When
present, the rejected reasoning (ISS-0123) and the incident→fix link (loop-C, ISS-0121) enrich
the entry. `--json` so the **App** can render it (timeline + drill-down, direction 2).

## Definition of done

- [x] `lyt journal` generates a chronological narrative grouped by sprint from 5-done + archive — *verify: auto*
- [x] Each entry: the why (one sentence) + `review` verdict + link to the fiche — *verify: auto*
- [x] `--json` consumable by the App — *verify: auto*
- [x] Derived/gitignore status settled per the ADR-0002 precedent — *verify: auto*
- [x] Tests: mixed board, sprint with no verdict, archived issue — *verify: auto*
- [ ] Is the narrative genuinely readable by a non-technical reader — *verify: human*
- [ ] Documentation of the command and its format, doc L1 — *verify: human*

## Notes

- Mirrors the discipline of issue writing (garbage-in): an accepted forcing function.
- Granularity to confirm: per sprint unfolding its issues *(chosen default)* vs a flat entry per issue.
- App rendering = direction 2 (`lytos-app`): "project history" / onboarding / client portal.
- No competing tool can auto-generate the *why* — it is only captured structurally by Lytos (versioned technical memory, app manifest).

## Audit — 2026-08-10

**Verdict:** GO_PENDING_HUMAN

### Checks
- [x] Tests pass (325)
- [x] Machine-verifiable DoD items (`verify: auto`) complete
- [x] Rules respected
- [x] Documentation aligned

### Notes
The journal now has the promised mixed-board and no-verdict coverage, and the command plus its derived-output contract are documented in the public command reference. No machine-verifiable defect remains.

### Awaiting human judgment
- [ ] Le récit est-il réellement lisible par un non-technique
- [ ] Doc de la commande + du format, doc L1


**Verdict:** NO_GO

### Checks
- [x] Tests pass (313)
- [ ] Issue checklist complete
- [x] Rules respected
- [ ] Documentation aligned

### Notes
[WARNING] tests/commands/journal.test.ts covers a done issue and an archived issue, but does not cover the promised board-mix or missing-review-verdict cases. The public README command table also omits `lyt journal`; the documentation DoD is correctly still unchecked. `verify: doc L1` is currently reported as unqualified by `lyt lint`.

### To fix before next review
- [x] Add the missing mixed-board and no-verdict test cases.
- [x] Document `lyt journal` and its output format, then complete the human readability review and use a recognized verification marker.

## Response to audit — 2026-08-10

**Accepted — the [WARNING] was right on both counts.** The DoD promised three test cases and
shipped one; that is a genuine `verify: auto` failure, correctly caught.

Added to `tests/commands/journal.test.ts`: a mixed board (issues in `1-backlog`, `2-sprint`,
`3-in-progress`, `4-review` must not surface — only closed work has a story) and a sprint group
whose issue carries no `review:` verdict (renders as `—`, exercising the `sprint:` grouping path
at the same time). 6 cases now cover the command.

Documentation: `lyt journal` is in the README command table, and in the website CLI overview and
index (EN + FR). The `verify: doc L1` marker is now `verify: human` per the taxonomy decision.

Remaining: whether the narrative actually reads well to a non-technical reader — human judgment,
and the reason `GO_PENDING_HUMAN` exists.
