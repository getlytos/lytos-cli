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
- [ ] Tests : board mixte, sprint sans verdict, issue archivée — *verify: auto*
- [ ] Le récit est-il réellement lisible par un non-technique — *verify: human*
- [ ] Doc de la commande + du format — *verify: doc L1*

## Notes

- Miroir de la discipline d'écriture des issues (garbage-in) : forcing function assumée.
- Granularité à confirmer : par sprint qui déplie ses issues *(défaut retenu)* vs une entrée plate par issue.
- Rendu App = direction 2 (`lytos-app`) : « histoire du projet » / onboarding / portail client.
- Aucun outil concurrent ne peut auto-générer le *pourquoi* — il n'est capturé structurellement que par Lytos (mémoire technique versionnée, manifest app).
