---
id: ISS-0169
title: "Design exchange entries and the derived index"
type: feat
priority: P2-normal
effort: M
complexity: standard
skill: ""
skills_aux: []
status: 1-backlog
branch: "feat/ISS-0169-design-exchange-entries"
depends: []
related: [ISS-0162]
created: 2026-11-20
schema_version: 2
risk: low
---
# ISS-0169 — Design exchange entries and the derived index

## Context

ADR-0009 §4. The exchange between design and code lives in the repository, in small files an agent can read selectively, never in one growing log.

## Proposed solution

The entry format under `.lytos/design/exchanges/<epic>/NNN-<slug>.md` and a read-only command that derives an index of the open entries, only for projects whose `config.yml` says `design: claude-design`.

| Option | Build cost | Maintenance | Robustness |
|---|---|---|---|
| A. Small files plus a derived index | low | low | append-only, merge-friendly, cheap to read |
| B. One global log | lowest | high: grows without bound | every reader pays the whole cost |

Decision: **A**.

## Ready

- **Scope** — the format, the index command, the doc.
- **Out of scope** — talking to a design tool; any network access.
- **Solution** — small files and a derived index.
- `risk: low`.

## Definition of done

- [ ] The index lists open entries only, one line each, and is derived, never hand-written — verify: auto
- [ ] A project with `design: none` sees nothing new and nothing breaks — verify: auto
- [ ] A resolved entry drops out of the index — verify: auto
