---
id: ISS-0100
title: "`parked` status + `lyt park` + a taxonomy of reasons"
type: feat
priority: P1-high
effort: M
complexity: standard
domain: [cli, method]
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
# ISS-0100 — Park rather than guess

## Context

"Don't interpret silently — ask if ambiguous" cannot mean "ask" inside a loop with no human turn.
The rule inverts: **halt, do not guess**. The agent parks the issue with a reason and the loop
moves to the next one (ADR-0004 §3). A park is a first-class exit, not a failure.

## The gesture

A new `parked` status (out of the board's flow, beside `3-in-progress`) and a verb
`lyt park ISS-X --reason <code>`: sets `status: parked`, writes `park_reason` + `parked_at` into
the frontmatter, moves the file, regenerates the board — atomic, like `lyt move`. Closed taxonomy:
`ambiguous-spec`, `missing-dependency`, `gate-failed`, `budget-exhausted`,
`human-judgment-required`, `external-blocker`. `lyt unpark` (or `lyt start`) to resume.

## Definition of done

- [x] `parked` status + folder + atomic `lyt park`/`unpark` — *verify: auto*
- [x] `--reason` validated against the closed taxonomy; refused otherwise — *verify: auto*
- [x] `park_reason`/`parked_at` in the frontmatter; `lyt show` displays them — *verify: auto*
- [x] Tests per reason, plus resumption — *verify: auto*

## Notes

- The taxonomy feeds upstream metrics (a high % of `ambiguous-spec` means under-specification).
- Ref: ADR-0004 §3. The review packet (ISS-0103) lists the sprint's parked issues.

## Audit — 2026-08-10

**Verdict:** GO

### Checks
- [x] Tests pass (313)
- [x] Issue checklist complete
- [x] Rules respected
- [x] Documentation aligned

### Notes
Parking uses a closed reason taxonomy, records the required frontmatter fields, regenerates the board after transitions, and covers the error and recovery paths.
