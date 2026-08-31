---
id: ISS-0125
title: "Elearning mode — interactive companionship (icebox)"
type: feat
priority: P3-low
effort: L
complexity: heavy
domain: [app, method]
skill: ""
skills_aux: []
status: 0-icebox
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0124]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0125 — The tutor that stands on the logbook (frozen for now)

## Context

An exploratory idea, **kept in the icebox**. The logbook (ISS-0124) is the passive *manual*;
elearning would be the active *tutor* laid on top of it. At the end of a sprint (or on demand),
the AI offers a debrief: what was done and how, and the human questions it to understand the
technique. This is the "competence" face of ADR-0008 in *active* form.

## Leads (not settled)

- **Developer level asked at `lyt init`** (`dev_level: junior|intermediate|senior`) → modulates
  how precise the questions are; could also modulate the logbook's verbosity (ISS-0124).
- **Socratic > passive**: the AI *also questions* before explaining (active recall), and proposes
  the curriculum (surfacing the non-obvious points the human would not know to ask about).
- **The session produces something durable**: its transcript feeds the narrative logbook (no waste).
- **A soft signal** towards the judgment-exposure metric (ISS-0118) — never a grade.
- Cadence: an end-of-sprint ritual (overlaps the retro, ISS-0071) plus always available on demand.

## Guard-rail not to forget when unfreezing

**Tutor ≠ implementer** (different model/provider) and **anchored in the tests and the actual
behaviour**, not in self-narration: otherwise the AI transmits a *false* mental model with
confidence. Elearning *transmits* understanding; it does not *guarantee* correctness — that
remains the gates' job.

## Leaving the icebox

To be unfrozen post-MVP, once the logbook (ISS-0124) has shipped and the human capability
contract (ADR-0008) has stabilised. Depends on ISS-0124 (the reading surface).
