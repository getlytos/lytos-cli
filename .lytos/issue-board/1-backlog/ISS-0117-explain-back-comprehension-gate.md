---
id: ISS-0117
title: "Explain-back — proof of transfer before close (verify: human-comprehension)"
type: feat
priority: P1-high
effort: M
complexity: heavy
domain: [cli, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0101]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0117 — A rubber stamp proves a click; an explain-back proves a mental model

## Context

The sharpest criticism from both panels: review "at the gate" degrades into rubber-stamping, and
nothing guarantees a human still *holds* the system. The counter validated by attack AND defence:
on `risk: high` or core changes, the human reconstructs **from memory, without the diff**, the
central invariant and the main failure mode (ADR-0008 §1).

## The gesture

A new `verify: human-comprehension` mode (extends ISS-0101). On `risk: high`, `lyt close`
requires an explain-back recorded in the sign-off (invariant + failure mode, derived from the
artifacts). A falsifiable recoverability bar: a **fresh, zero-context** agent, with only the
in-repo artifacts, can make a correct behavioural change with green gates, without reading the
original session.

## Definition of done

- [ ] `verify: human-comprehension` mode parsed and classified (ISS-0101) — *verify: auto*
- [ ] `lyt close` requires the explain-back on `risk: high`, refuses otherwise — *verify: auto*
- [ ] Sign-off records invariant + failure mode + author + date — *verify: auto*
- [ ] Tests: present/absent on high vs low — *verify: auto*
- [ ] Is the explain-back asked for genuinely proof of comprehension — *verify: human-comprehension*
- [ ] Convention documented — *verify: doc L1*

## Notes

- Ref: ADR-0008 §1. This is not manual authorship (both panels rejected that).
