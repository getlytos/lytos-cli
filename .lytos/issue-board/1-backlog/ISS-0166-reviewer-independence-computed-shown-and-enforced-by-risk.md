---
id: ISS-0166
title: "Reviewer independence: computed, shown in the packet and enforced by risk"
type: feat
priority: P1-high
effort: L
complexity: heavy
skill: ""
skills_aux: []
status: 1-backlog
branch: "feat/ISS-0166-reviewer-independence"
depends: []
related: [ISS-0162]
created: 2026-11-20
schema_version: 2
risk: high
---
# ISS-0166 — Reviewer independence: computed, shown in the packet and enforced by risk

## Context

ADR-0010. The schema records `ai_implementer` and `ai_reviewer` but nothing measures the independence of a review, so nothing can require more of it where the stakes are higher.

## Proposed solution

Compute the level (different provider, same provider and stronger model, same model fresh session) from the two fields; show it in `lyt report`; read a per-risk minimum from `.lytos/config.yml`; at high risk a level-3 review cannot yield `review: go` alone (the card waits for the owner's countersignature with "weak independence" recorded).

| Option for "stronger" | Build cost | Maintenance | Robustness |
|---|---|---|---|
| A. An ordered model ranking in the configuration, with a small shipped default | low | low | explicit; an unknown model is never "stronger" |
| B. Hard-code known model names | low | high: stale within weeks | wrong silently |
| C. Drop "stronger", compare "different model" only | lowest | lowest | loses the single-provider fallback |

Decision: **A**.

## Ready

- **Scope** — the computation, the packet line, the minimum by risk, the high-risk rule, the config keys.
- **Out of scope** — choosing a reviewer automatically, judging a model's quality.
- **Solution** — a configurable ranking; unknown means not stronger.
- `risk: high`.

## Definition of done

- [ ] Each of the three levels is computed correctly from the two fields, including an unknown model — verify: auto
- [ ] `lyt report` shows the level and the minimum for the card's risk — verify: auto
- [ ] At high risk, a level-3 review cannot produce `review: go` alone, and the countersignature is recorded with who and when — verify: auto
- [ ] Negative cases exist for every rule (missing fields, an empty ranking, a risk with no minimum configured) — verify: auto
- [ ] The rule reads as written in ADR-0010 and cannot be bypassed by editing a field — verify: reviewer:security-review
