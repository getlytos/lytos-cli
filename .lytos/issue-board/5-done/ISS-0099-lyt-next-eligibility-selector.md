---
id: ISS-0099
title: "`lyt next` — the loop-eligible issue selector"
type: feat
priority: P1-high
effort: M
complexity: standard
domain: [cli, dx]
skill: 
skills_aux: []
status: 5-done
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0101]
created: 2026-08-09
updated: 2026-08-10
schema_version: 2
assignee: Claude
started_at: 2026-08-09
completed_at: 2026-08-10
commits: [349cd9e, 881e87a, d5cf5cb, afae795, ed37ccf, 80d658a, ce6f91d, 230ad0d, 8e0e745, c23fcf6, 76035ed, c34c9cb, a39e1e9, 8665d38, 71e4bfa, 873931c, 31a9a8c, bb502e8, 09f2c4d, 15ba056, 5d3d472, 08d295d, 7aaa7c5, 96fad9d, 24230a0, a8483f3, 7c16fd8, 3c16cd8, a6fac6a, 71ded27, 8b89911, cb17e83, 0933900, c7e454b, f492a0e, 2be7413, f4a5405, d0f5e77, 6a3e84e, 0c86b6c, bce1a82, 35c0d61, 638fc40, a70f8cf, 07e23ed, fa18610, ab68138, 23d0673, 4318a7f, 5740116]
---
# ISS-0099 — The next issue the loop is allowed to take

## Context

Loop-B has to pick its next task in a way a **machine can decide**, within the sprint alone (the
upstream human gate). Without that, a `while` loop knows neither what to take nor when to stop
(ADR-0004 §1).

## The gesture

`lyt next` returns the first **loop-eligible** issue of the sprint: a workable `status`, **and**
`depends`/children satisfied, **and** a DoD carrying at least one `verify: auto` item (via
ISS-0101). Deterministic order (priority, then deps, then id). Refuses and **explains** when
nothing is eligible (e.g. "ISS-X is first but its DoD is 100% human → handle it by hand").
`--json` for the wrapper. No side effects: `lyt next` reads, it does not transition.

## Definition of done

- [x] Selection respects sprint + status + deps/children + a machine-verifiable DoD — *verify: auto*
- [x] `--json` and human output; explicit reason when empty or refused — *verify: auto*
- [x] Tests: nominal case, unsatisfied deps, all-human DoD refused, empty sprint — *verify: auto*

## Notes

- Read-only — orchestration (calling `lyt start` behind it) stays with the wrapper or the App.
- Ref: ADR-0004 §1. Depends on ISS-0101 (the verification mode of DoD items).

## Audit — 2026-08-10

**Verdict:** GO

### Checks
- [x] Tests pass (313)
- [x] Issue checklist complete
- [x] Rules respected
- [x] Documentation aligned

### Notes
Eligibility is deterministic, explains each blocked state, checks dependencies in the board, and returns both JSON and human-readable output without mutating the workflow.
