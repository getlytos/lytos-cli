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
status: 5-done
branch: claude/claude-loops-lytos-wtkc94
depends: []
created: 2026-08-09
updated: 2026-08-10
schema_version: 2
assignee: Claude
started_at: 2026-08-09
completed_at: 2026-08-10
commits: [349cd9e, 881e87a, d5cf5cb, afae795, ed37ccf, 80d658a, ce6f91d, 230ad0d, 8e0e745, c23fcf6, 76035ed, c34c9cb, a39e1e9, 8665d38, 71e4bfa, 873931c, 31a9a8c, bb502e8, 09f2c4d, 15ba056, 5d3d472, 08d295d, 7aaa7c5, 96fad9d, 24230a0, a8483f3, 7c16fd8, 3c16cd8, a6fac6a, 71ded27, 8b89911, cb17e83, 0933900, c7e454b, f492a0e, 2be7413, f4a5405, d0f5e77, 6a3e84e, 0c86b6c, bce1a82, 35c0d61, 638fc40, a70f8cf, 07e23ed, fa18610, ab68138, 23d0673, 4318a7f, 5740116]
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

## Audit — 2026-08-10

**Verdict:** GO

### Checks
- [x] Tests pass (313)
- [x] Issue checklist complete
- [x] Rules respected
- [x] Documentation aligned

### Notes
The budget calculation rounds monetary totals, distinguishes an unset ceiling from a breach, reports machine-readable results, and exercises boundary cases.
