---
id: ISS-0186
title: "The session-start stale path and the French README gaps"
type: docs
priority: P3-low
effort: S
complexity: light
skill: ""
skills_aux: []
status: 1-backlog
branch: ""
depends: []
related: [ISS-0181]
parent: ISS-0181
created: 2026-11-20
schema_version: 2
risk: low
---

# ISS-0186 — The session-start stale path and the French README gaps

## Context

`method/skills/session-start.md` ("Variant — Code review session") loads `.lytos/skills/code-review.md`, but the skill is now `code-review/SKILL.md`. The French README is also missing `lyt move`, `claim`, `journal`, `pull-notes`, `migrate-frontmatter`, `absorb` and the loop-primitives table that the English README has.

## Proposed solution

Fix the path (and add a test that every skill path named in `session-start.md` exists in the shipped skills) and bring the French README to parity with the English one. Natural French, not a literal translation. One line of study: a drift test costs little and keeps the path from going stale again.

## Ready

- **Scope** — the path, its test, the French README parity.
- **Out of scope** — new features.
- **Solution** — content plus a drift test.
- `risk: low`.

## Definition of done

- [ ] Every skill path named in `session-start.md` exists in the shipped skills (test) — verify: auto
- [ ] The French README documents every command the English one does (test) — verify: auto
- [ ] The French text reads naturally — verify: reviewer:over-engineering
