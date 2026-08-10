---
id: ISS-0104
title: "Structural check library + review checklist + traced sign-off"
type: feat
priority: P1-high
effort: L
complexity: heavy
domain: [cli, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0101]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0104 — A review without a checklist is vibecoding at the gate

## Context

If the human does not know what to check, they rubber-stamp. Across several projects, "what to
check" cannot be memorised: it is **generated and persisted in the repo**, versioned, and it
travels with the issue (ADR-0004 §6). This is the keystone of the human gate.

## The gesture

Two sources → one checklist: (a) the issue's `verify: human` DoD items (via ISS-0101), (b)
**structural checks** drawn from a versioned library (`.lytos/review-checks/*.md`) by
type/domain (UI → visual, auth/data → security, user-facing copy → tone). The structural checks
are **not** invented by the loop. Guard-rails: a "free look / not covered here" slot, and an
empty checklist as a signal of under-specification. **Traced sign-off**: ticking an item records
who/what/when in the frontmatter (`human_signoff`), readable by the audit.

## Definition of done

- [ ] `review-checks/` library + type/domain → checks mapping — *verify: auto*
- [ ] `lyt` generates the checklist (human DoD ∪ structural checks) + free-look slot — *verify: auto*
- [ ] Sign-off recorded (`human_signoff`: handle + date + item) — *verify: auto*
- [ ] An empty or trivial checklist is flagged, not green by default — *verify: human*
- [ ] Docs: how to add a check to the library — *verify: human*

## Notes

- A new governance metric: "which human validated, against which checklist".
- Feeds the review packet (ISS-0103). Ref: ADR-0004 §6.
