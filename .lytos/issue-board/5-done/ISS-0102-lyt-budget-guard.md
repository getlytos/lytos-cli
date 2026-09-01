---
id: ISS-0102
title: "`lyt budget` — the non-interactive budget guardrail"
type: feat
priority: P2-normal
effort: S
complexity: standard
domain: [cli, dx]
skill: 
skills_aux: []
status: 5-done
branch: claude/claude-loops-lytos-wtkc94
depends: []
created: 2026-08-09
updated: 2026-08-10
schema_version: 2
assignee: Claude
started_at: 2026-08-09
completed_at: 2026-08-10
commits: [349cd9e, 881e87a, d5cf5cb, afae795, ed37ccf, 80d658a, ce6f91d, 230ad0d, 8e0e745, c23fcf6, 76035ed, c34c9cb, a39e1e9, 8665d38, 71e4bfa, 873931c, 31a9a8c, bb502e8, 09f2c4d, 15ba056, 5d3d472, 08d295d, 7aaa7c5, 96fad9d, 24230a0, a8483f3, 7c16fd8, 3c16cd8, a6fac6a, 71ded27, 8b89911, cb17e83, 0933900, c7e454b, f492a0e, 2be7413, f4a5405, d0f5e77, 6a3e84e, 0c86b6c, bce1a82, 35c0d61, 638fc40, a70f8cf, 07e23ed, fa18610, ab68138, 23d0673, 4318a7f, 5740116]
---
# ISS-0102 — A ceiling the loop can read

## Context

An autonomous loop needs a numeric stopping condition. The schema v2 cost fields (`cost_usd`,
`tokens_*`) already exist (ADR-0001) — what is missing is a guardrail a `while` loop or CI can
read (ADR-0004 §8). The CLI does not drive the loop; it exposes the measurement.

## The gesture

`lyt budget` aggregates the sprint's cost (the sum of the issues' `cost_usd`) and compares it to a
ceiling (`--max-usd`, `--max-issues`, or a `budget:` field in `sprint.md`). Exits **non-zero** when
the ceiling is reached, with a `--json` summary. No side effects.

## Definition of done

- [x] Cost / issue-count aggregation over the current sprint — *verify: auto*
- [x] Non-zero exit code on breach; `--json` — *verify: auto*
- [x] Ceiling from a flag or from `sprint.md`; clear message when undefined — *verify: auto*
- [x] Tests: under / at / over the ceiling, and no ceiling set — *verify: auto*

## Notes

- Consumed by the wrapper or CI, not by the CLI itself. Ref: ADR-0004 §8.

## Audit — 2026-08-10

**Verdict:** GO

### Checks
- [x] Tests pass (313)
- [x] Issue checklist complete
- [x] Rules respected
- [x] Documentation aligned

### Notes
The budget calculation rounds monetary totals, distinguishes an unset ceiling from a breach, reports machine-readable results, and exercises boundary cases.
