---
id: ISS-0076
title: "AI wrapper integration — write ai_implementer / tokens / cost (phase 4 of schema v2)"
type: feat
priority: P2-normal
effort: M
complexity: standard
domain: [integration, audit, ai]
skill: ""
skills_aux: []
status: 4-review
branch: "claude/lytos-board-status-7xjjmq"
depends: [ISS-0074]
created: 2026-05-25
updated: 2026-06-13
started_at: 2026-06-13
review_at: 2026-06-13
schema_version: 2
---

# ISS-0076 — AI wrapper integration (phase 4 of schema v2)

## Context

Phase 3 of [`ISS-0074`](../5-done/ISS-0074-frontmatter-schema-v2.md) shipped the lifecycle / verdict write paths owned by `lyt start` / `lyt review` / `lyt close`. But the most distinctive v2 fields per [`ADR-0001`](../../adr/ADR-0001-frontmatter-schema-v2.md) — `ai_implementer.model`, `ai_implementer.session`, `ai_implementer.prompt_ref`, `ai_reviewer.*`, `tokens_in/out`, `cost_usd`, `skills_used` — can only be filled by the AI wrapper that drives the session. The CLI doesn't know what model is talking to it.

Without this, schema v2 has a hole in the exact spot Lytos claims to differentiate itself from vibecoding: "which AI produced this code, at what cost, on what prompts".

## Proposed solution

Two layers:

1. **Contract** — document a stable file/hook contract that any AI wrapper (Claude Code, Cursor, Codex CLI, Goose, …) can write to. Likely a small append-only journal at `.lytos/.runtime/session.jsonl` that the wrapper writes per-turn, plus a single command `lyt absorb` (or similar) that aggregates the journal into the issue frontmatter at end-of-session. Decoupled writes keep the wrapper integration thin.

2. **Per-target implementation issues** — split into one issue per integration target. Each owns: detecting that the project is Lytos-managed, identifying the active issue (from branch name or 3-in-progress/), writing the journal lines, calling `lyt absorb` on session close.

This issue is the **meta-spec**. Implementation issues are created as sub-tickets once the contract is agreed.

## Definition of done

- [x] ADR written: "AI wrapper journal contract for schema v2 audit fields" (location, format, ownership). **Numbered ADR-0003** — ADR-0002 was already taken by "BOARD.md is a derived artifact" (created in ISS-0079 this session).
- [x] Reference implementation: `lyt absorb` reads `.lytos/.runtime/session.jsonl` for the active issue and merges its content into the issue frontmatter (`ai_implementer`, `ai_reviewer`, `tokens_in/out`, `cost_usd`, `skills_used`). Idempotent (SET semantics).
- [x] One follow-up issue created per integration target: Claude Code ([[ISS-0081]]), Cursor ([[ISS-0082]]), Codex CLI ([[ISS-0083]]). Each independent, gated on the target's hook feasibility.
- [x] `session-start.md` documents the journal contract (both `method/skills/` and local `.lytos/skills/`, kept in sync).
- [x] Tests: `lyt absorb` unit-tested against synthetic journal lines (no real AI wrapper) — `tests/lib/absorb.test.ts` + `tests/commands/absorb.test.ts`.

## Checklist

### Spec
- [x] Draft ADR-0003 (journal location, line schema, accumulation rules).
- [x] Decide: does the wrapper write `ai_reviewer` too? **Yes** — via `role: "reviewer"` journal lines, absorbed into `ai_reviewer`. `lyt review` keeps owning the *human* reviewer handle + verdict; the journal owns the *AI* reviewer's model/session/cost. Orthogonal, documented in ADR-0003 §3.
- [x] Document the rules for resolving "active issue" (explicit arg → `ISS-####` in branch name → exactly one issue in `3-in-progress/` → else error). ADR-0003 §2.

### Reference implementation
- [x] `src/lib/absorb.ts` — read journal, aggregate, return Frontmatter delta (pure).
- [x] `src/commands/absorb.ts` — wire CLI surface, handle idempotency, `--dry-run` (default), `--apply`, `--json`.
- [x] Tests: `tests/lib/absorb.test.ts` + `tests/commands/absorb.test.ts`.

### Per-target issues
- [x] Draft [[ISS-0081]] — Claude Code hook for Lytos session journal.
- [x] Draft [[ISS-0082]] — Cursor plugin: write Lytos session journal.
- [x] Draft [[ISS-0083]] — Codex CLI: write Lytos session journal.

## Relevant files

- `.lytos/adr/ADR-0003-ai-wrapper-journal-contract.md` (created)
- `src/lib/absorb.ts` (new) + `src/commands/absorb.ts` (new)
- `tests/lib/absorb.test.ts` + `tests/commands/absorb.test.ts` (new)
- `method/skills/session-start.md` + `.lytos/skills/session-start.md` (extended)
- `.gitignore` + `method/.gitignore` (ignore `.runtime/`)

## Notes

- **Split-out from ISS-0074 phase 4.** ISS-0074 is closed once phases 1-3 are merged; phase 4 (this) and phase 5 ([[ISS-0077]]) ship independently.
- **Hors scope** : reading the journal at session start (the producer-side instrumentation). That's the per-target issues' job.
- **Risk** : the per-target work depends on each AI wrapper's hook API. Some (Claude Code) have rich hooks; others (Codex CLI today) may not. Per-target issues must check feasibility before promising delivery.
- **Design decisions made (for review):**
  - **SET, not ADD.** `lyt absorb` writes the aggregate of the whole journal, overwriting journal-derived fields → idempotent. Cumulative growth comes from the append-only journal, not from re-adding to frontmatter.
  - **Dry-run by default** (consistent with `lyt migrate-frontmatter`); `--apply` to write. Avoids surprise writes to the audit trail.
  - **Graceful degradation** is non-negotiable: malformed journal lines are skipped + counted, missing counters stay absent (never zero-filled). A buggy wrapper can never make `lyt absorb` fail or fabricate data.
  - **Not dogfooded with real data.** I did *not* run `lyt absorb --apply` against ISS-0076 itself — writing fake token/cost numbers would pollute the very audit trail this feature protects. Verification is via unit tests with synthetic journals, per the DoD.
- **Cross-repo** : not blocking lytos-app. The App reads frontmatter as a passive consumer.
