---
id: ISS-0110
title: "`lyt checkpoint` — a safety net when switching surfaces"
type: feat
priority: P1-high
effort: M
complexity: standard
domain: [cli, dx]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: []
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0110 — Nothing unpushed is ever lost

## Context

A surface's container (mobile, cloud) is ephemeral: one forgotten push loses the work in progress
when you switch surfaces. Today the cloud/mobile rule asks for a manual "commit + push" — that is
discipline, not a net. Continuity *is* **the last pushed state** (ADR-0006 §1/4); it needs an
assisted gesture to be guaranteed.

## The gesture

`lyt checkpoint [-m msg]`: commit the WIP (`.lytos/` + the current branch's code) to a durable
ref and **push** with retry/backoff. Respects the git flow — never on `main`, always the working
branch. Idempotent (nothing to commit → a clean no-op). Optionally a **session-end hook**
(SessionEnd) that calls it automatically. `--json`.

## Definition of done

- [ ] WIP commit + branch push with retry, never on `main` — *verify: auto*
- [ ] Idempotent: no changes = no-op without error — *verify: auto*
- [ ] Optional session-end hook documented + example — *verify: human*
- [ ] Tests: WIP present/absent, network failure (retry), refusal when branch = main — *verify: auto*

## Notes

- A net, not magic: no live filesystem sync (ADR-0006 §1). Ref: ADR-0006 §4.
- Complements the cloud/mobile rule in CLAUDE.md (makes it assisted rather than manual).
