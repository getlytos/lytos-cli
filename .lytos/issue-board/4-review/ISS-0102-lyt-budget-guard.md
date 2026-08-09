---
id: ISS-0102
title: `lyt budget` — garde-fou budget non-interactif
type: feat
priority: P2-normal
effort: S
complexity: standard
domain: [cli, dx]
skill: 
skills_aux: []
status: 4-review
branch: claude/claude-loops-lytos-wtkc94
depends: []
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
assignee: Claude
started_at: 2026-08-09
---
# ISS-0102 — Un plafond que le loop peut lire

## Contexte

Un loop autonome doit avoir une condition d'arrêt chiffrée. Les champs coût du schema v2
(`cost_usd`, `tokens_*`) existent déjà (ADR-0001) — il manque juste un garde-fou lisible
par un `while`/CI (ADR-0004 §8). Le CLI ne pilote pas le loop, il expose la mesure.

## Le geste

`lyt budget` agrège le coût du sprint (somme des `cost_usd` des issues) et le compare à
un plafond (`--max-usd`, `--max-issues`, ou un champ `budget:` de `sprint.md`). Sort
**non-zéro** quand le plafond est atteint, avec un résumé `--json`. Aucun effet de bord.

## Definition of done

- [x] Agrégation coût/nombre d'issues sur le sprint courant — *verify: auto*
- [x] Exit code non-zéro au dépassement ; `--json` — *verify: auto*
- [x] Plafond depuis flag ou `sprint.md` ; message clair si non défini — *verify: auto*
- [x] Tests : sous/au/au-dessus du plafond, plafond absent — *verify: auto*

## Notes

- Consommé par le wrapper/CI, pas par le CLI lui-même. Réf : ADR-0004 §8.
