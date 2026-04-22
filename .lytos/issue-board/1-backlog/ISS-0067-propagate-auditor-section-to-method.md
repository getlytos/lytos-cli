---
id: ISS-0067
title: "Propagate implementer/auditor section to lytos-method"
type: chore
priority: P2-normal
effort: XS
complexity: light
domain: [docs, method]
skill: documentation
skills_aux: []
status: 1-backlog
branch: "chore/ISS-0067-propagate-auditor-section"
depends: []
created: 2026-04-22
updated: 2026-04-22
---

# ISS-0067 — Propagate implementer/auditor section to `lytos-method`

## Context

ISS-0059 (`lyt review`) introduced a first-class Lytos pattern: the AI session that implements an issue must not audit it. The bundled `.lytos/LYTOS.md:105` carries a section "Implementer and auditor are two different roles" that documents this principle.

The cli-rules `Continuous improvement — propagation rule` requires any rule/skill/template improvement made locally to land in `lytos-method` so future `lyt init` runs and method readers get the same guidance:

> When a rule, skill, or template is improved locally (in this project's `.lytos/`), the improvement must be propagated to: lytos-method repo

The propagation was not done in ISS-0059 — surfaced during the GO audit on 2026-04-22.

## Proposed solution

Copy (and lightly adapt for the method-level audience) the section from `lytos-cli/.lytos/LYTOS.md:105-115` into the three method LYTOS files:

- `lytos-method/LYTOS.md` — the public-facing method document
- `lytos-method/.lytos/LYTOS.md` — the method's own bundled briefing
- `lytos-method/starter/.lytos/LYTOS.md` — what every new project gets via `lyt init`

The section explains:

1. The principle: implementer ≠ auditor.
2. The mechanism: `lyt review ISS-XXXX` produces a self-contained prompt for a fresh AI session.
3. Three reasons (cognitive bias independence, code-review parity, model-independence proof).
4. The pairing rule: never the same session that wrote the code.

Each landing should preserve the section's level (`##`) and place it logically — typically right after the kanban-flow description and before the "Expected behavior" / agent rules.

## Definition of done

- [ ] `lytos-method/LYTOS.md` contains the implementer/auditor section
- [ ] `lytos-method/.lytos/LYTOS.md` contains the same section (adapted if the surrounding tone differs)
- [ ] `lytos-method/starter/.lytos/LYTOS.md` contains the same section so `lyt init` ships it
- [ ] Wording stays consistent across all four landings (3 method + 1 cli bundled) — no drift
- [ ] Cross-link or mention `lyt review` so readers know the operational tool that backs the principle
- [ ] Commit on `lytos-method` references `Refs: ISS-0067`

## Relevant files

- `lytos-method/LYTOS.md`
- `lytos-method/.lytos/LYTOS.md`
- `lytos-method/starter/.lytos/LYTOS.md`
- `lytos-cli/.lytos/LYTOS.md` (source — line 105, "Implementer and auditor are two different roles")

## Notes

- Pure documentation copy. No code, no tests.
- The same propagation rule applies retroactively to anything else that was improved in `lytos-cli/.lytos/` since the last sync — worth a quick diff between the two repos as part of this issue or as a precursor.
- Out of scope: any *new* method-level section. This is propagation only.
