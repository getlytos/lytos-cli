---
id: ISS-0081
title: "Claude Code hook for the Lytos session journal"
type: feat
priority: P2-normal
effort: M
complexity: standard
domain: [integration, ai, audit]
skill: ""
skills_aux: []
status: 1-backlog
branch: "feat/ISS-0081-claude-code-journal-hook"
depends: [ISS-0076]
created: 2026-06-13
updated: 2026-06-13
schema_version: 2
---

# ISS-0081 — Claude Code hook for the Lytos session journal

## Context

[[ISS-0076]] defined the journal contract
([ADR-0003](../../adr/ADR-0003-ai-wrapper-journal-contract.md)) and shipped the
consumer (`lyt absorb`). This issue is the **producer** for Claude Code: a hook
that appends journal lines so `lyt absorb` can fill `ai_implementer`, tokens,
cost, and `skills_used`.

Claude Code has the richest hook surface of the initial targets (SessionStart,
Stop, PostToolUse, …), so it's the natural first producer.

## Proposed solution

- A `Stop` (or per-turn) hook that, when the project is Lytos-managed
  (`.lytos/` present), appends one JSON line to `.lytos/.runtime/session.jsonl`
  with the fields available from the Claude Code environment: model id, session
  id, token usage, cost when exposed, and the active issue (resolved from the
  branch name or the single `3-in-progress/` issue).
- Optionally a `SessionEnd` hook that runs `lyt absorb --apply`.
- Ship as a documented snippet for `.claude/settings.json`, plus a `lyt`
  helper to install it if that proves ergonomic.

## Definition of done

- [ ] Documented hook config that appends valid journal lines per ADR-0003.
- [ ] Verified end-to-end: a real Claude Code session produces a journal that
      `lyt absorb --apply` turns into correct frontmatter.
- [ ] Graceful no-op when the repo is not Lytos-managed.
- [ ] Feasibility of token/cost exposure from Claude Code confirmed (or the
      gap documented).

## Notes

- **Feasibility gate**: confirm which audit fields Claude Code actually exposes
  to hooks before promising delivery. If cost isn't exposed, ship model/session/
  tokens and document the gap.
