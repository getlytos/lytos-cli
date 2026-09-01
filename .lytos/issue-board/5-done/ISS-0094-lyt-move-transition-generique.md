---
id: ISS-0094
title: "`lyt move ISS-X <stage>` — the atomic generic transition"
type: feat
priority: P1-high
effort: S
complexity: light
domain: [cli, dx]
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
# ISS-0094 — A verb for every transition, not only for the two ends

## Field feedback (immo, 03–04/08)

`lyt start` and `lyt close` cover the two ends — but the Lytos **closing phase** (work finished →
`4-review`, awaiting the audit) has no verb. Over two days of intensive use by an agent, every
move into review cost three manual operations (edit the frontmatter, `git mv`, regenerate the
board), about ten times over — through throwaway Python scripts.

## The gesture

`lyt move ISS-0192 4-review`: updates `status` + `updated`, moves the file, regenerates the board
— atomic, the way `start` already is for its own transition. It refuses the transitions that have
a richer dedicated verb (`3-in-progress` → "use lyt start", `5-done` → "lyt close") so that their
guardrails cannot be bypassed.

- [x] Free transitions between stages with no dedicated verb, documented refusal otherwise
- [x] `--json`, and the same origin freshness check as start (`--force`)
- [x] Tests per transition, refusals included

## Audit — 2026-08-10

**Verdict:** GO

### Checks
- [x] Tests pass (313)
- [x] Issue checklist complete
- [x] Rules respected
- [x] Documentation aligned

### Notes
`src/commands/move.ts` keeps lifecycle guardrails by rejecting the two reserved stages, preserves the origin freshness check and has focused transition/refusal coverage.
