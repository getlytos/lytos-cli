---
id: ISS-0082
title: "Cursor: write the Lytos session journal"
type: feat
priority: P3-low
effort: M
complexity: standard
domain: [integration, ai, audit]
skill: ""
skills_aux: []
status: 1-backlog
branch: "feat/ISS-0082-cursor-journal-plugin"
depends: [ISS-0076]
created: 2026-06-13
updated: 2026-06-13
schema_version: 2
---

# ISS-0082 — Cursor: write the Lytos session journal

## Context

Producer side of [[ISS-0076]] /
[ADR-0003](../../adr/ADR-0003-ai-wrapper-journal-contract.md) for Cursor. Emit
journal lines to `.lytos/.runtime/session.jsonl` so `lyt absorb` can fill the
schema v2 audit fields.

## Proposed solution

- Investigate Cursor's extension / rules surface for a hook that fires on
  agent turns or session end.
- Append ADR-0003 journal lines with model, session, tokens, cost when
  available, and the active issue.
- Trigger `lyt absorb --apply` on session close, or document a manual step if
  no programmatic hook exists.

## Definition of done

- [ ] Journal lines emitted from a Cursor agent session, valid per ADR-0003.
- [ ] `lyt absorb --apply` produces correct frontmatter end-to-end.
- [ ] No-op when the repo is not Lytos-managed.

## Notes

- **Feasibility gate**: Cursor's hook surface is narrower than Claude Code's.
  Confirm what's possible before committing scope; a documented manual fallback
  is an acceptable first deliverable.
