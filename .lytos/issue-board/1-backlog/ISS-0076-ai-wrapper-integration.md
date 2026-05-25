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
status: 1-backlog
branch: "feat/ISS-0076-ai-wrapper-integration"
depends: [ISS-0074]
created: 2026-05-25
updated: 2026-05-25
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

- [ ] ADR-0002 written: "AI wrapper journal contract for schema v2 audit fields" (location, format, ownership).
- [ ] Reference implementation: `lyt absorb` reads `.lytos/.runtime/session.jsonl` for the active issue and merges its content into the issue frontmatter (`ai_implementer`, `tokens_in/out`, `cost_usd`, `skills_used`). Idempotent.
- [ ] One follow-up issue created per integration target: Claude Code, Cursor, Codex CLI (initial set). Each is independent and can ship at its own pace.
- [ ] `method/skills/session-start.md` documents the journal contract so any agent can implement the producer side.
- [ ] Tests: `lyt absorb` is unit-tested against synthetic journal lines (no real AI wrapper needed).

## Checklist

### Spec
- [ ] Draft ADR-0002 (journal location, line schema, accumulation rules).
- [ ] Decide: does the wrapper write `ai_reviewer` too, or does `lyt review --accept` capture that from the audit block?
- [ ] Document the rules for resolving "active issue" (branch name → frontmatter ID, fallback to 3-in-progress/ if exactly one).

### Reference implementation
- [ ] `src/lib/absorb.ts` — read journal, aggregate, return Frontmatter delta.
- [ ] `src/commands/absorb.ts` — wire CLI surface, handle idempotency, --dry-run.
- [ ] Tests: `tests/lib/absorb.test.ts` + `tests/commands/absorb.test.ts`.

### Per-target issues
- [ ] Draft `ISS-XXXX — Claude Code hook for Lytos session journal`.
- [ ] Draft `ISS-XXXX — Cursor plugin: write Lytos session journal`.
- [ ] Draft `ISS-XXXX — Codex CLI: write Lytos session journal`.

## Relevant files

- `.lytos/adr/ADR-0002-…` (to be created)
- `src/lib/absorb.ts` (new)
- `src/commands/absorb.ts` (new)
- `method/skills/session-start.md` (extended)

## Notes

- **Split-out from ISS-0074 phase 4.** ISS-0074 is closed once phases 1-3 are merged; phase 4 (this) and phase 5 ([[ISS-0077]]) ship independently.
- **Hors scope** : reading the journal at session start (the producer-side instrumentation). That's the per-target issues' job.
- **Risk** : the per-target work depends on each AI wrapper's hook API. Some (Claude Code) have rich hooks; others (Codex CLI today) may not. Per-target issues must check feasibility before promising delivery.
- **Cross-repo** : not blocking lytos-app. The App reads frontmatter as a passive consumer.
