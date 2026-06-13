---
id: ISS-0083
title: "Codex CLI: write the Lytos session journal"
type: feat
priority: P3-low
effort: M
complexity: standard
domain: [integration, ai, audit]
skill: ""
skills_aux: []
status: 1-backlog
branch: "feat/ISS-0083-codex-cli-journal"
depends: [ISS-0076]
created: 2026-06-13
updated: 2026-06-13
schema_version: 2
---

# ISS-0083 — Codex CLI: write the Lytos session journal

## Context

Producer side of [[ISS-0076]] /
[ADR-0003](../../adr/ADR-0003-ai-wrapper-journal-contract.md) for the Codex CLI.
Emit journal lines to `.lytos/.runtime/session.jsonl` so `lyt absorb` can fill
the schema v2 audit fields.

## Proposed solution

- Investigate the Codex CLI's hook / wrapper surface. As of ADR-0003 it may
  lack rich hooks — the first step is a feasibility check.
- If hooks exist: append ADR-0003 journal lines (model, session, tokens, cost,
  active issue) and call `lyt absorb --apply` on session end.
- If not: document a thin wrapper script around the Codex CLI invocation that
  writes the journal, as an interim producer.

## Definition of done

- [ ] Feasibility of Codex CLI instrumentation documented.
- [ ] Journal lines emitted (via hook or wrapper script), valid per ADR-0003.
- [ ] `lyt absorb --apply` produces correct frontmatter end-to-end.

## Notes

- **Feasibility gate first.** Per ADR-0003 risk note, Codex CLI may not expose
  hooks today. Confirm before promising delivery; the deliverable may be a
  documented wrapper rather than a native hook.
