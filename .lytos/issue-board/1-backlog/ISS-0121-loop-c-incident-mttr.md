---
id: ISS-0121
title: "Loop-C — prod incident → issue ingestion + MTTR field"
type: feat
priority: P2-normal
effort: L
complexity: heavy
domain: [cli, app, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0114]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0121 — Close the cycle: spec → deploy → incident → spec

## Context

The factual hole both panels confirmed: there is no state after `5-done`, the prod→issue feedback
loop sits in the icebox (ISS-0078), and there is no MTTR. The AI-native answer is not to retype
the code by hand "to understand it" — it is to apply to the incident the same mechanisms that
hold the upstream together (ADR-0008 §3).

## The gesture

A **loop-C**, symmetric to loop-B but inbound: a production signal (alert/SLO/structured error)
is triaged by an agent into a **candidate issue** — blast radius → `risk`, a cause hypothesis
linked to the offending commit via `Refs`, a fix DoD with ≥1 machine-verifiable item. The human
keeps the upstream gate (accepting it into the sprint). Plus an **aggregated MTTR field**
(`incident_detected → fix_merged → deployed`), tracked per sprint like cost.

## Definition of done

- [ ] Triage of a prod signal into a candidate issue (risk, Refs, DoD) — *verify: auto*
- [ ] Upstream human gate preserved (no auto-acceptance) — *verify: auto*
- [ ] Timestamped MTTR field + sprint aggregation — *verify: auto*
- [ ] Tests for triage and MTTR aggregation — *verify: auto*
- [ ] L4 runbook (operating loop-C) replayed in CI — *verify: doc L4*
- [ ] Does the triage produce genuinely actionable issues — *verify: human*

## Notes

- Ref: ADR-0008 §3; lifts ISS-0078 out of the icebox. On the surface side, overlaps the App (direction 2).
- Enables the MTTR A/B falsifiability condition (human author vs context-loaded agent).
