---
id: ISS-0163
title: The parent, milestone and phase fields, the epic type and their lint rules
type: feat
priority: P1-high
effort: M
complexity: standard
skill: ""
skills_aux: []
status: 5-done
branch: feat/ISS-0163-parent-milestone-phase-fields
depends: []
related: [ISS-0162]
created: 2026-11-20
schema_version: 2
risk: medium
assignee: fredericgalline
updated: 2026-11-20
started_at: 2026-11-20
completed_at: 2026-11-20
commits: [041f98a, 4629f73, 1c6e272, 889b647, 0aaa03d, ba6e11a, 27d1fd2, b5e8493, 3fd4185, a54e2a5, 957f8b6]
---
# ISS-0163 — The parent, milestone and phase fields, the epic type and their lint rules

## Context

ADR-0009. Cards today have no notion of an epic, a parent or a milestone; the parent/child relation is implied by `depends`.

## Proposed solution

Add the optional fields `parent`, `milestone` and `phase` and the card type `epic` to the frontmatter reader and to `lyt lint`. Schema v2 is unchanged: a card with none of them stays valid.

| Option | Build cost | Maintenance | Robustness |
|---|---|---|---|
| A. Validate in `lint` only | low | low | a surface that ignores the fields keeps working |
| B. Also reject them in the frontmatter reader | medium | medium | breaks older surfaces |

Decision: **A**.

## Ready

- **Scope** — the fields, and four lint rules: `parent` points at an existing epic; depth at most two (an epic has no `parent`); `phase` only on an epic and only `discovery` or `frozen`; `milestone` names an existing file under `.lytos/milestones/`.
- **Out of scope** — the derived views (ISS-0164), the sprint gate (ISS-0165).
- **Solution** — optional fields, lint-only validation.
- `risk: medium`.

## Definition of done

- [x] A card with none of the new fields lints exactly as before — verify: auto
- [x] Each of the four rules reports a warning with its remedy, and never changes the exit code — verify: auto
- [x] A negative case exists for each rule (a missing parent, a depth of three, `phase` on a leaf, an unknown milestone) — verify: auto
- [x] The change stays proportionate to a field-and-lint change — verify: reviewer:over-engineering

## Evidence (review)

Covered by the two independent reviews of 1.7 (a stronger model of the same provider, read-only, level 2, 2026-11-20), both GO with reserves: No finding against the field-and-lint change; the only over-engineering finding of the review (F12) concerns config readers and the independence modules, tracked as ISS-0189.
