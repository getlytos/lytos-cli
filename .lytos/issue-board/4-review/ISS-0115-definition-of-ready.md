---
id: ISS-0115
title: Definition of Ready — the entry gate, twin of the DoD
type: feat
priority: P1-high
effort: M
complexity: standard
domain: [cli, method]
skill: 
skills_aux: []
status: 4-review
branch: claude/claude-loops-lytos-wtkc94
depends: []
created: 2026-08-09
updated: 2026-08-10
schema_version: 2
assignee: Claude
started_at: 2026-08-09
review: go-pending-human
review_at: 2026-08-10
reviewer: fredericgalline
---
# ISS-0115 — Catch ambiguity before spending tokens on it

## Context

Park-on-ambiguity (ADR-0004 §3) is **reactive**: we stop *after* hitting the ambiguity. A
"ready" gate shifts that left — an under-specified issue never enters the loop (ADR-0007 §3).
That is what turns "40% of parks are ambiguous-spec" into prevention.

## The gesture

An issue is **ready** when: the scope is clear, the constraints are stated, **out-of-scope is
explicit**, the DoD is testable (ADR-0004 §4), and `risk` is set. A normed `## Ready` section in
the template. `lyt next` **refuses** a non-ready issue (new ineligibility reason `not-ready`);
`lyt lint` flags it. Complements the existing loop-eligibility rule (machine-verifiable DoD).

## Definition of done

- [ ] Ready criteria defined + `## Ready` section in the template (project + method/), doc L1 — *verify: human*
- [x] `lyt next`: a non-ready issue is not eligible (reason `not-ready`) — *verify: auto*
- [x] `lyt lint` flags non-ready sprint issues — *verify: auto*
- [x] Tests: fully ready / missing field / no out-of-scope — *verify: auto*
- [ ] Are the criteria sufficient without being bureaucratic — *verify: human*

## Notes

- The upstream twin of the DoD. Extends `lyt next` (ISS-0099). Ref: ADR-0007 §3.

## Audit — 2026-08-10

**Verdict:** NO_GO

### Checks
- [x] Tests pass (313)
- [ ] Issue checklist complete
- [x] Rules respected
- [ ] Documentation aligned

### Notes
The Ready analyzer and template section are present, but the documentation criterion is unchecked and `lyt lint` reports its `verify: doc L1` item as unqualified. The human sufficiency criterion is also still pending.

### To fix before next review
- [x] Complete the Ready documentation and explicitly record the human scope review.
- [x] Use a verification marker accepted by the current parser, or implement support for the documented level marker.

## Response to audit — 2026-08-10

**Partly accepted.** The audit was right that the documentation criterion was incomplete, but the
gap was narrower than "the Ready section is missing": `issue-feature.md` already carried a full
`## Ready` section. What was missing was the other half of the surface.

Delivered:

- `method/issue-board/templates/issue-task.md` — a `## Ready` section sized for a task: the
  out-of-scope line plus `risk:`, and nothing else. A task is XS/S; asking for the four-field form
  there would be the bureaucracy this issue's own human criterion asks you to guard against. The
  note says so explicitly, and points out that an agent hitting ambiguity mid-work will park it
  `ambiguous-spec` anyway — Ready moves that cost left, it does not add a new one.
- `method/rules/default-rules.md` — the Ready criteria, the `lyt lint` / `lyt next` consequences
  (`not-ready` ineligibility), and the proportionality caveat, in the rules every generated
  project receives.
- Propagated to `.lytos/` via `lyt upgrade --force`.

The `verify: doc L1` marker is now `verify: human`, per the decision to keep the ISS-0101 taxonomy
closed at `auto | human`; the doc level stays in the item text. ISS-0116 owns making levels
first-class.

Remaining, and genuinely yours: whether these criteria are sufficient without being bureaucratic.
The concrete way to answer it — would you accept filling this in on an XS task?
