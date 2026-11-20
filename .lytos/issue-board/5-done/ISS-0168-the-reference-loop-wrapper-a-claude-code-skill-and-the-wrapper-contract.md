---
id: ISS-0168
title: "The reference loop wrapper: a Claude Code skill and the wrapper contract"
type: feat
priority: P1-high
effort: M
complexity: standard
skill: ""
skills_aux: []
status: 5-done
branch: feat/ISS-0168-the-reference-loop-wrapper
depends: []
related: [ISS-0162]
created: 2026-11-20
schema_version: 2
risk: low
assignee: fredericgalline
updated: 2026-11-20
started_at: 2026-11-20
completed_at: 2026-11-20
commits: [bbbd9a5, ba6e11a, 27d1fd2, b5e8493, 3fd4185, a54e2a5, 957f8b6]
---
# ISS-0168 — The reference loop wrapper: a Claude Code skill and the wrapper contract

## Context

ADR-0011: the loop engine stays out of the CLI core; a reference wrapper ships as method content.

## Proposed solution

A skill under `method/skills/` that chains `lyt next`, the claim and start, the brief, the gates, the review packet, parking with a reason and the five stop cases, plus the contract of what any wrapper must do and the rule that a card is never closed by the loop.

| Option | Build cost | Maintenance | Robustness |
|---|---|---|---|
| A. Content with a consistency test | low | low | the test catches drift from the CLI |
| B. Content without a test | lowest | medium | silently drifts |

Decision: **A**.

## Ready

- **Scope** — the skill, the contract, the consistency test.
- **Out of scope** — a runner, adapters for other agents.
- **Solution** — content plus a drift test.
- `risk: low`.

## Definition of done

- [x] A test proves every `lyt` command the skill cites exists in the CLI help — verify: auto
- [x] A test proves every park reason the skill names is in the taxonomy — verify: auto
- [x] The five stop cases and the never-close rule are stated — verify: auto
- [x] The skill is delivered by `init` and `upgrade` — verify: auto
