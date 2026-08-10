---
id: ISS-0109
title: "Conformance to the project's declared design system (DS-agnostic gate)"
type: feat
priority: P1-high
effort: L
complexity: heavy
domain: [cli, design, a11y]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0107]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0109 — Design is composed against the chosen DS, not rewritten

## Context

"Endless CSS on every addition" is not a moral failing, it is structural: with no design system,
every addition writes new ad-hoc CSS. With one, adding UI *conforms to its guidelines*. **The
method prescribes no DS** — Tailwind, Material, a custom token set (an oklch ramp, say) are
examples. The kit records the one the project has **declared**, and the gate verifies conformance
to *that* DS (ADR-0005 §4-5).

## The gesture

Three pieces in the quality kit (ISS-0107): (1) **declared DS** — the project states which one
(Tailwind / Material / custom tokens / …) and where its guidelines live; (2) a **conformance gate
parameterised by the DS** — Tailwind → tokens-only, arbitrary `[...]` values banned, a single
theme in config; Material/MUI → theme tokens + component API, no hard-coded values; custom tokens
→ `var(--token)` only; (3) a **DS-agnostic contrast gate** — the WCAG/APCA ratio computes
whatever the colour representation (oklch makes it convenient, not mandatory) and **rejects a
pair** below threshold. The DS guidelines are **injected** like API docs are for code
(ISS-0108). What remains of a11y and rendering → the human checklist (ISS-0104).

## Definition of done

- [ ] The kit declares the project's DS + its guidelines source — *verify: auto*
- [ ] Conformance gate parameterised by the declared DS (Tailwind/Material/custom) — *verify: auto*
- [ ] DS-agnostic contrast gate: a pair below threshold fails, with the ratio — *verify: auto*
- [ ] Is the actual rendering correct visually and to a screen reader — *verify: human*
- [ ] Docs: declaring a DS and wiring its conformance gate — *verify: human*

## Notes

- On `lytos-app` (Tailwind), the gate forces Tailwind to be used *as* a token system. oklch is
  only an example of a custom DS, not the rule. Ref: ADR-0005 §4-5. Depends on the kit
  (ISS-0107), feeds the checklist (ISS-0104).
