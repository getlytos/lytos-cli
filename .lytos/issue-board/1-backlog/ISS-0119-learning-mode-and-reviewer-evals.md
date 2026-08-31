---
id: ISS-0119
title: "Learning mode — invert the routing + rotation + reviewer trap diffs"
type: feat
priority: P2-normal
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
# ISS-0119 — Train judgment, do not merely route it

## Context

The defence conceded the real risk: systematically routing the writing to the machine deprives
juniors *and* seniors of the practice that forms and maintains judgment. The terminal skill —
evaluating a fallible output — is teachable, but it has to be organised (ADR-0008 §2).

## The gesture

A `learning: on` axis (per person/issue) that **inverts the routing**: the human writes, the AI
becomes the human's adversarial reviewer — the same apparatus (gates, checklist, cross-review)
serves training. Plus: **mandatory rotation** of reviewers on `risk: high`, and **calibrated trap
diffs** (a known defect) injected into the review flow — an eval for the human reviewer, not just
for the model: it measures whether the nose still works.

## Definition of done

- [ ] `learning: on` inverts implementer/reviewer for the issue — *verify: auto*
- [ ] Reviewer rotation applied and verified on `risk: high` — *verify: auto*
- [ ] Trap-diff injection + reviewer detection score — *verify: auto*
- [ ] Tests for the three mechanisms — *verify: auto*
- [ ] Does the apparatus actually train (human pilot) — *verify: human*

## Notes

- Ref: ADR-0008 §2. Reuses the existing implementer/reviewer roles (ADR-0004 §5).
