---
id: ISS-0105
title: Rapport de sprint — agrégat des review packets
type: feat
priority: P2-normal
effort: M
complexity: standard
domain: [cli, dx]
skill: 
skills_aux: []
status: 2-sprint
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0103]
created: 2026-08-09
updated: 2026-08-10
schema_version: 2
---
# ISS-0105 — La vue d'ensemble du run de loop

## Contexte

L'humain peut relire au fil de l'eau (par issue) ou en batch en fin de sprint. Il lui
faut alors un agrégat : ce qui est fait, ce qui a été **garé et pourquoi**, la
combustion budget, la couverture (ADR-0004 §7). Ce rapport ne remplace pas le gate par
issue — il le roule up.

## Le geste

`lyt report --sprint` agrège les packets du sprint : issues en `4-review` vs `parked`
(avec raisons), coût cumulé vs plafond (via ISS-0102), couverture agrégée, et la liste
des checklists humaines encore à trancher. Markdown + `--json`.

## Definition of done

- [ ] Agrégat done/parked (+ raisons), budget, couverture, checklists en attente — *verify: auto*
- [ ] `--json` + markdown — *verify: auto*
- [ ] Tests d'agrégation (sprint mixte done/parked/over-budget) — *verify: auto*

## Notes

- Recoupe l'icebox App ISS-0071 (rétro structurée) et ISS-0080 (dashboard coûts) : le
  loop leur donne une raison d'exister. Réf : ADR-0004 §7. Dépend de ISS-0103.
