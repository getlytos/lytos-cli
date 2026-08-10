---
id: ISS-0124
title: `lyt journal` — le journal de bord dérivé (changelog du pourquoi)
type: feat
priority: P2-normal
effort: M
complexity: standard
domain: [cli, docs, app]
skill: 
skills_aux: []
status: 4-review
branch: claude/claude-loops-lytos-wtkc94
depends: []
created: 2026-08-09
updated: 2026-08-10
schema_version: 2
assignee: Claude
started_at: 2026-08-10
---
# ISS-0124 — Le récit du projet, dérivé au lieu d'écrit

## Contexte

Il manque, entre le changelog (le *quoi*) et l'ADR (le *verdict*), un **journal de bord
lisible** : le récit chronologique du *pourquoi* et du *comment*, qui renvoie aux issues
pour le détail. Point clé : ce contenu **existe déjà** dans les issues fermées (contexte,
verdict `review`, raisonnement rejeté, correctifs). Donc rien à écrire — c'est une **vue
dérivée**, comme `BOARD.md` (ADR-0002) : ça ne peut pas pourrir, zéro cérémonie.

Trois lecteurs, trois portes : le **stakeholder** (changelog du pourquoi), le **nouveau**
qui onboard (sommaire chronologique), l'**apprenant** (matière de compagnonnage — le why
et les impasses). C'est la face « transmission » d'ADR-0008, en forme passive.

## Le geste

`lyt journal` recompose un `JOURNAL.md` (dérivé, régénéré — précédent `BOARD.md`/ADR-0002)
à partir des issues **`5-done` + archive**, chronologique. Groupé **par sprint** (section =
objectif du sprint depuis `sprint.md`), chaque issue = une ligne : *pourquoi* (1 phrase de
contexte), **verdict** (`review: go|no-go`), et **lien vers la fiche** pour le détail. Si
présents : le raisonnement rejeté (ISS-0123) et le lien incident→fix (loop-C, ISS-0121)
enrichissent l'entrée. `--json` pour que l'**App** le rende (timeline + drill-down, direction 2).

## Definition of done

- [x] `lyt journal` génère un récit chronologique groupé par sprint depuis 5-done + archive — *verify: auto*
- [x] Chaque entrée : pourquoi (1 phrase) + verdict `review` + lien vers la fiche — *verify: auto*
- [x] `--json` consommable par l'App — *verify: auto*
- [x] Statut dérivé/gitignore tranché selon le précédent ADR-0002 — *verify: auto*
- [x] Tests : board mixte, sprint sans verdict, issue archivée — *verify: auto*
- [ ] Le récit est-il réellement lisible par un non-technique — *verify: human*
- [ ] Doc de la commande + du format, doc L1 — *verify: human*

## Notes

- Miroir de la discipline d'écriture des issues (garbage-in) : forcing function assumée.
- Granularité à confirmer : par sprint qui déplie ses issues *(défaut retenu)* vs une entrée plate par issue.
- Rendu App = direction 2 (`lytos-app`) : « histoire du projet » / onboarding / portail client.
- Aucun outil concurrent ne peut auto-générer le *pourquoi* — il n'est capturé structurellement que par Lytos (mémoire technique versionnée, manifest app).

## Audit — 2026-08-10

**Verdict:** GO_PENDING_HUMAN

### Checks
- [x] Tests pass (325)
- [x] Machine-verifiable DoD items (`verify: auto`) complete
- [x] Rules respected
- [x] Documentation aligned

### Notes
The journal now has the promised mixed-board and no-verdict coverage, and the command plus its derived-output contract are documented in the public command reference. No machine-verifiable defect remains.

### Awaiting human judgment
- [ ] Le récit est-il réellement lisible par un non-technique
- [ ] Doc de la commande + du format, doc L1


**Verdict:** NO_GO

### Checks
- [x] Tests pass (313)
- [ ] Issue checklist complete
- [x] Rules respected
- [ ] Documentation aligned

### Notes
[WARNING] tests/commands/journal.test.ts covers a done issue and an archived issue, but does not cover the promised board-mix or missing-review-verdict cases. The public README command table also omits `lyt journal`; the documentation DoD is correctly still unchecked. `verify: doc L1` is currently reported as unqualified by `lyt lint`.

### To fix before next review
- [x] Add the missing mixed-board and no-verdict test cases.
- [x] Document `lyt journal` and its output format, then complete the human readability review and use a recognized verification marker.

## Response to audit — 2026-08-10

**Accepted — the [WARNING] was right on both counts.** The DoD promised three test cases and
shipped one; that is a genuine `verify: auto` failure, correctly caught.

Added to `tests/commands/journal.test.ts`: a mixed board (issues in `1-backlog`, `2-sprint`,
`3-in-progress`, `4-review` must not surface — only closed work has a story) and a sprint group
whose issue carries no `review:` verdict (renders as `—`, exercising the `sprint:` grouping path
at the same time). 6 cases now cover the command.

Documentation: `lyt journal` is in the README command table, and in the website CLI overview and
index (EN + FR). The `verify: doc L1` marker is now `verify: human` per the taxonomy decision.

Remaining: whether the narrative actually reads well to a non-technical reader — human judgment,
and the reason `GO_PENDING_HUMAN` exists.
