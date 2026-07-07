---
id: ISS-0091
title: Cost feedback loop — validate the manifest model table with session-journal data
type: feature
priority: P2-normal
effort: M
complexity: standard
domain: [cli, journal]
skill: code-structure
status: 1-backlog
depends: [ISS-0076]
created: 2026-07-07
updated: 2026-07-07
schema_version: 2
---
# ISS-0091 — Cost feedback loop for the model table

## Context

Since schema v2 (ADR-0001), issues carry `ai_implementer` / `ai_reviewer` / `tokens_in` / `tokens_out` / `cost_usd`, aggregated by `lyt absorb` from the session journal. Meanwhile the manifest's "AI models by complexity" table — which now drives **automatic subagent model selection** ([[ISS-0090]]) — is filled by intuition at project setup and never confronted with reality.

The data to close the loop already exists in the frontmatter of done issues.

## Proposed solution

A reporting command (e.g. `lyt report --models`, exact name TBD) that:

- aggregates `tokens_*` / `cost_usd` per `complexity` class across `5-done/` issues (and archive)
- shows cost distribution per class and per model actually used
- flags mismatches against the manifest table, e.g. "your `light` issues were implemented on the standard model — estimated overspend X" or "3 `heavy` issues ran on the light model — quality risk"
- suggests table adjustments the human can accept or ignore (the human decides, as always)

The method self-calibrates: the table stops being a guess and becomes a measured policy.

## Definition of done

- [ ] Command aggregates per-complexity cost/tokens from issue frontmatter
- [ ] Comparison against the manifest table with actionable output
- [ ] Works on repos with partial data (fields are optional — degrade gracefully)
- [ ] Tests
- [ ] Documented in `docs/` and `method/LYTOS.md` if user-facing
