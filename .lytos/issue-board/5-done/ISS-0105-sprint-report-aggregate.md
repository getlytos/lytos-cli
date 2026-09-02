---
id: ISS-0105
title: "Sprint report — the aggregate of the review packets"
type: feat
priority: P2-normal
effort: M
complexity: standard
domain: [cli, dx]
skill: 
skills_aux: []
status: 5-done
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0103]
created: 2026-08-09
updated: 2026-08-10
schema_version: 2
assignee: Claude
started_at: 2026-08-10
completed_at: 2026-08-10
commits: [349cd9e, 881e87a, d5cf5cb, afae795, ed37ccf, 80d658a, ce6f91d, 230ad0d, 8e0e745, c23fcf6, 76035ed, c34c9cb, a39e1e9, 8665d38, 71e4bfa, 873931c, 31a9a8c, bb502e8, 09f2c4d, 15ba056, 5d3d472, 08d295d, 7aaa7c5, 96fad9d, 24230a0, a8483f3, 7c16fd8, 3c16cd8, a6fac6a, 71ded27, 8b89911, cb17e83, 0933900, c7e454b, f492a0e, 2be7413, f4a5405, d0f5e77, 6a3e84e, 0c86b6c, bce1a82, 35c0d61, 638fc40, a70f8cf, 07e23ed, fa18610, ab68138, 23d0673, 4318a7f, 5740116]
---
# ISS-0105 — The overview of a loop run

## Context

The human can review as it goes (issue by issue) or in a batch at the end of the sprint. In the
second case they need an aggregate: what is done, what was **parked and why**, the budget burn,
the coverage (ADR-0004 §7). This report does not replace the per-issue gate — it rolls it up.

## The gesture

`lyt report --sprint` aggregates the sprint's packets: issues in `4-review` vs `parked` (with
reasons), cumulative cost vs ceiling (via ISS-0102), aggregated coverage, and the list of human
checklists still to be ruled on. Markdown plus `--json`.

## Definition of done

- [x] Aggregate of done/parked (+ reasons), budget, coverage, pending checklists — *verify: auto*
- [x] `--json` + markdown — *verify: auto*
- [x] Aggregation tests (a sprint mixing done, parked and over-budget) — *verify: auto*

## Notes

- Overlaps the App icebox ISS-0071 (structured retro) and ISS-0080 (cost dashboard): the loop gives
  them a reason to exist. Ref: ADR-0004 §7. Depends on ISS-0103.

## Audit — 2026-08-10

**Verdict:** GO

### Checks
- [x] Tests pass (313)
- [x] Issue checklist complete
- [x] Rules respected
- [x] Documentation aligned

### Notes
The sprint aggregate reuses the budget and DoD analyzers, keeps the decision signals ahead of totals, and covers mixed flow, parked reasons, coverage, and an over-budget report.
