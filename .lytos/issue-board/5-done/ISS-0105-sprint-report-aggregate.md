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
status: 5-done
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0103]
created: 2026-08-09
updated: 2026-08-10
schema_version: 2
assignee: Claude
started_at: 2026-08-10
completed_at: 2026-08-10
commits: [349cd9e, 881e87a, d5cf5cb, afae795, ed37ccf, 80d658a, ce6f91d, 230ad0d, 8e0e745, c23fcf6, 76035ed, c34c9cb, a39e1e9, 8665d38, 71e4bfa, 873931c, 31a9a8c, bb502e8, 09f2c4d, 15ba056, 5d3d472, 08d295d, 7aaa7c5, 96fad9d, 24230a0, a8483f3, 7c16fd8, 3c16cd8, a6fac6a, 71ded27, 8b89911, cb17e83, 0933900, c7e454b, f492a0e, 2be7413, f4a5405, d0f5e77, 6a3e84e, 0c86b6c, bce1a82, 35c0d61, 638fc40, a70f8cf, 07e23ed, fa18610, ab68138, 23d0673, 4318a7f, 5740116]
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

- [x] Agrégat done/parked (+ raisons), budget, couverture, checklists en attente — *verify: auto*
- [x] `--json` + markdown — *verify: auto*
- [x] Tests d'agrégation (sprint mixte done/parked/over-budget) — *verify: auto*

## Notes

- Recoupe l'icebox App ISS-0071 (rétro structurée) et ISS-0080 (dashboard coûts) : le
  loop leur donne une raison d'exister. Réf : ADR-0004 §7. Dépend de ISS-0103.

## Audit — 2026-08-10

**Verdict:** GO

### Checks
- [x] Tests pass (313)
- [x] Issue checklist complete
- [x] Rules respected
- [x] Documentation aligned

### Notes
The sprint aggregate reuses the budget and DoD analyzers, keeps the decision signals ahead of totals, and covers mixed flow, parked reasons, coverage, and an over-budget report.
