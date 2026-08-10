---
id: ISS-0118
title: "Judgment-exposure metric — competence debt on the balance sheet"
type: feat
priority: P1-high
effort: M
complexity: standard
domain: [cli, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: []
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0118 — Provision the debt instead of discovering it at bankruptcy

## Context

The one grievance neither attack nor defence dissolved: competence is treated as a constant
input, never as a variable the system erodes. Lytos audits everything except the team's
competence trajectory (ADR-0008 §2). This is the missing 5th governance question: *what
competence is the team still accumulating?*

## The gesture

A per-person judgment-exposure metric, derived from the schema v2 substrate: diffs reviewed then
corrected, parks resolved by hand, agreement rate with the adversarial reviewer, share of code
written by hand. Aggregated into the sprint report (ISS-0105). **Alert** when it falls team-wide
while velocity rises — the sceptic's winning scenario, seen coming.

## Definition of done

- [ ] Per-person metric computed from the schema v2 fields — *verify: auto*
- [ ] Aggregated + trended in the sprint report — *verify: auto*
- [ ] Alert on a team-wide fall — *verify: auto*
- [ ] Aggregation and alert-threshold tests — *verify: auto*
- [ ] Do the chosen proxies really reflect judgment — *verify: human*

## Notes

- Ref: ADR-0008 §2. A leading indicator for the falsifiability conditions (the 3-year cohort).
