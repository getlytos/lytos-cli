---
id: ISS-0101
title: "Definition of Done with a verification mode — `verify: auto | human` per item"
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
---
# ISS-0101 — Every DoD item declares how it is verified

## Context

In an autonomous loop, a DoD box ticked by the agent itself is worth nothing: "the
implementer's confidence replaces the actual state" (session-start). We need to know, per
item, whether it is verifiable by a machine (a gate) or only by a human (a checklist).
That is the single source the review packet is split along (ADR-0004 §4).

## The gesture

A convention in the issue body: a DoD item may carry a `— verify: auto` or `— verify: human`
suffix. The checklist counter (cf. ISS-0069) recognises the marker and classifies each item as
`auto-✓ / auto-✗ / human-only`. An unmarked item defaults to `auto` but is **flagged** by
`lyt lint` / `doctor` ("unqualified item"). An issue whose items are *all* `verify: human` is
marked **not loop-eligible**.

## Definition of done

- [x] Parse the `verify:` marker on DoD items, tolerant of case and spacing — *verify: auto*
- [x] `lyt show ISS-X` displays the auto/human count and the "loop-ineligible" flag — *verify: auto*
- [x] `lyt lint` warns on every unqualified DoD item — *verify: auto*
- [ ] Document the convention in the issue template + rules — *verify: human*

## Notes

- Foundation of the epic — `lyt next` (ISS-0099) and the review packet (ISS-0103) depend on it.
- Reuses the existing checklist counting; mind fenced code blocks (cf. ISS-0069).
- Ref: ADR-0004 §4.

## Audit — 2026-08-10

**Verdict:** NO_GO

### Checks
- [x] Tests pass (313)
- [ ] Issue checklist complete
- [x] Rules respected
- [ ] Documentation aligned

### Notes
The parser and its tests cover the advertised `auto|human` syntax, but the documentation DoD item remains unchecked. Under the review contract, unchecked criteria are the source of truth and cannot be approved implicitly.

### To fix before next review
- [x] Validate the template and rules documentation against the intended user workflow, then tick the documentation criterion through the normal task process.

## Response to audit — 2026-08-10

**Accepted in substance: the documentation was genuinely incomplete, not merely unticked.**

State before: the convention was explained in `issue-feature.md` and in this repo's
`rules/cli-rules.md`, but `issue-task.md` carried neither the marker nor any mention of it, and
`method/rules/default-rules.md` — the rules every generated project receives — never mentioned
`verify:` at all. A convention absent from the generated rules does not exist for users.

Delivered:

- `method/issue-board/templates/issue-task.md` — DoD items now ship with `— verify: auto`, and the
  section explains the auto/human split and its loop consequence. A `## Ready` section was added
  at the same time (ISS-0115), deliberately lighter than the feature template's: two lines, not a
  form, because ceremony on an XS task is the bureaucracy ADR-0007 argues against.
- `method/rules/default-rules.md` — new section "An Issue Has Two Gates: Ready and Done", with the
  marker table (who may tick what), the three practical consequences, and the rule that an AI
  auditor may never return NO_GO on an empty `verify: human` box. Includes the anti-loophole
  clause: a promised deliverable that does not exist is a real defect whatever its marker.
- Propagated to `.lytos/` via `lyt upgrade --force` — dogfood and method are back in sync.

The DoD item stays unticked: it is `verify: human`, and the work being delivered is not the same
thing as you having judged it adequate. That is exactly the `GO_PENDING_HUMAN` shape.
