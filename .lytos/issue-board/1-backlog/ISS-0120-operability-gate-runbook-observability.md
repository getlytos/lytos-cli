---
id: ISS-0120
title: "Operability gate — executable L4 runbook + observability (risk: high)"
type: feat
priority: P1-high
effort: M
complexity: standard
domain: [cli, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0114]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0120 — Debuggable by someone who did not write it

## Context

Both panels agree: the Lytos cycle stops at `deploy`, the L4 runbook is "optional" (ADR-0007 §2),
and there is no notion of operability at all. Governing the entrance is not the same as being
able to operate the exit. And a runbook in prose is worth nothing (the ADR-0005 principle) — it
has to be made executable (ADR-0008 §3).

## The gesture

Add to the risk matrix (ISS-0114): **doc L4 (runbook) mandatory on `risk: high`**, with the
runbook carrying commands the quality kit **replays in CI** (`gate: runbook-smoke`) — a runbook
that fails its own smoke test fails the gate. Plus a `verify: observability` item (structured
"fail with context" error + correlatable log) required on `risk: high`.

## Definition of done

- [ ] A "doc L4 runbook" row added to the matrix for `risk: high` — *verify: auto*
- [ ] `gate: runbook-smoke` replays the runbook's commands in CI — *verify: auto*
- [ ] `verify: observability` mode recognised and required on `risk: high` — *verify: auto*
- [ ] Tests: a runbook that passes/fails its smoke; observability present/absent — *verify: auto*
- [ ] This issue's own L4 runbook, replayed in CI — *verify: doc L4*

## Notes

- Ref: ADR-0008 §3. Extends the matrix (ISS-0114). Operability is tested, not documented.
