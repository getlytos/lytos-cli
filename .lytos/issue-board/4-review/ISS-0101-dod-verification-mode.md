---
id: ISS-0101
title: "DoD à mode de vérification — `verify: auto | human` par item"
type: feat
priority: P1-high
effort: M
complexity: standard
domain: [cli, method]
skill: 
skills_aux: []
status: 4-review
branch: claude/claude-loops-lytos-wtkc94
depends: []
created: 2026-08-09
updated: 2026-08-10
schema_version: 2
assignee: Claude
started_at: 2026-08-09
---
# ISS-0101 — Chaque item de DoD déclare comment on le vérifie

## Contexte

En boucle autonome, une case de DoD cochée par l'agent lui-même vaut zéro : « la
confiance de l'implémenteur remplace l'état réel » (session-start). Il faut savoir, par
item, s'il est vérifiable par une machine (gate) ou seulement par un humain (checklist).
C'est la source unique qui découpe le review packet (ADR-0004 §4).

## Le geste

Convention dans le corps d'issue : un item de DoD peut porter un suffixe `— verify: auto`
ou `— verify: human`. Le CLM de comptage (cf ISS-0069) reconnaît le marqueur et classe
chaque item en `auto-✓ / auto-✗ / human-only`. Un item sans marqueur = `auto` par défaut
mais **signalé** par `lyt lint`/`doctor` (« item non qualifié »). Une issue dont *tous*
les items sont `verify: human` est marquée **non éligible au loop**.

## Definition of done

- [x] Parsing du marqueur `verify:` sur les items de DoD, tolérant à la casse/espaces — *verify: auto*
- [x] `lyt show ISS-X` affiche le décompte auto/human et le flag « loop-inéligible » — *verify: auto*
- [x] `lyt lint` avertit sur tout item de DoD non qualifié — *verify: auto*
- [ ] Doc de la convention dans le template d'issue + rules — *verify: human*

## Notes

- Fondation de l'épic — `lyt next` (ISS-0099) et le review packet (ISS-0103) en dépendent.
- Réutilise le comptage de checklist existant ; attention aux blocs de code (cf ISS-0069).
- Réf : ADR-0004 §4.

## Audit — 2026-08-10

**Verdict:** NO_GO

### Checks
- [x] Tests pass (313)
- [ ] Issue checklist complete
- [x] Rules respected
- [ ] Documentation aligned

### Notes
The parser and its tests cover the advertised `auto|human` syntax, but the documentation DoD item remains unchecked. Under the review contract, unchecked criteria are the source of truth and cannot be approved implicitly.

### To fix before next review
- [x] Validate the template and rules documentation against the intended user workflow, then tick the documentation criterion through the normal task process.

## Response to audit — 2026-08-10

**Accepted in substance: the documentation was genuinely incomplete, not merely unticked.**

State before: the convention was explained in `issue-feature.md` and in this repo's
`rules/cli-rules.md`, but `issue-task.md` carried neither the marker nor any mention of it, and
`method/rules/default-rules.md` — the rules every generated project receives — never mentioned
`verify:` at all. A convention absent from the generated rules does not exist for users.

Delivered:

- `method/issue-board/templates/issue-task.md` — DoD items now ship with `— verify: auto`, and the
  section explains the auto/human split and its loop consequence. A `## Ready` section was added
  at the same time (ISS-0115), deliberately lighter than the feature template's: two lines, not a
  form, because ceremony on an XS task is the bureaucracy ADR-0007 argues against.
- `method/rules/default-rules.md` — new section "An Issue Has Two Gates: Ready and Done", with the
  marker table (who may tick what), the three practical consequences, and the rule that an AI
  auditor may never return NO_GO on an empty `verify: human` box. Includes the anti-loophole
  clause: a promised deliverable that does not exist is a real defect whatever its marker.
- Propagated to `.lytos/` via `lyt upgrade --force` — dogfood and method are back in sync.

The DoD item stays unticked: it is `verify: human`, and the work being delivered is not the same
thing as you having judged it adequate. That is exactly the `GO_PENDING_HUMAN` shape.
