---
id: ISS-0122
title: "Measured decorrelation + non-LLM judges + behavioural safety nets"
type: feat
priority: P1-high
effort: L
complexity: heavy
domain: [cli, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0107]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0122 — Make decorrelation an instrument, not an axiom

## Context

The "gates" sceptic's fairest hit: cross-model decorrelation (ADR-0004 §5) is **postulated, not
measured** — Claude and GPT share corpora and priors, and the hard bug is the one they miss
*together*. And parking only catches *admitted* doubt, never *unaware* doubt. The defence
accepted it: we have to measure, and add structurally decorrelated judges.

## The gesture

Three pieces in the quality kit (ISS-0107): (1) **measured kill-rate** — seed hard bugs (mutation
testing + semantic injections) into green modules and measure the jury's capture rate; §5 becomes
a number. (2) **Non-LLM judges** on the jury (fuzz, property, mutation) — a fuzzer shares no
prior with the model, so it cannot miss the bug *alongside* it. (3) **Downstream behavioural nets**
(property/fuzz/canary/observability) required by the risk matrix to catch unaware doubt — not by
the agent's goodwill.

## Definition of done

- [ ] Measured kill-rate (mutation/injections) exposed by `lyt` — *verify: auto*
- [ ] Non-LLM judges wired into the jury (fuzz/property/mutation) — *verify: auto*
- [ ] Downstream nets required by the risk matrix according to `risk` — *verify: auto*
- [ ] Tests: a bug the LLMs miss together is caught by a non-LLM judge — *verify: auto*
- [ ] Adversarial reviewer: require a **falsifying** output (a counter-example), not a grade — *verify: human*

## Notes

- Refines ADR-0004 §5 / ADR-0005 / ADR-0007. Ref: ADR-0008 (Consequences).
