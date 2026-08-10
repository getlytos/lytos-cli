---
id: ISS-0094
title: `lyt move ISS-X <étape>` — la transition générique atomique
type: feat
priority: P1-high
effort: S
complexity: light
domain: [cli, dx]
skill: 
skills_aux: []
status: 5-done
branch: feat/1.4.0-retour-terrain
depends: []
created: 2026-08-04
updated: 2026-08-10
schema_version: 2
completed_at: 2026-08-10
---
# ISS-0094 — Un verbe pour chaque transition, pas seulement les extrémités

## Retour terrain (immo, 03-04/08)

`lyt start` et `lyt close` couvrent leurs deux extrémités — mais la PHASE DE CLÔTURE Lytos
(travail fini → `4-review`, en attendant l'audit) n'a pas de verbe. Sur deux jours d'usage
intensif par un agent, chaque passage en review a coûté trois opérations manuelles (éditer le
frontmatter, `git mv`, régénérer le board), une dizaine de fois — en scripts python jetables.

## Le geste

`lyt move ISS-0192 4-review` : met à jour `status` + `updated`, déplace le fichier, régénère le
board — atomique, comme `start` le fait déjà pour sa transition. Refuse les transitions qui ont
un verbe dédié plus riche (`3-in-progress` → « utilisez lyt start », `5-done` → « lyt close »)
pour ne pas contourner leurs garde-fous.

- [x] Transitions libres entre étapes sans verbe dédié, refus documenté sinon
- [x] `--json`, et le même contrôle d'origine que start (`--force`)
- [x] Tests par transition, y compris les refus

## Audit — 2026-08-10

**Verdict:** GO

### Checks
- [x] Tests pass (313)
- [x] Issue checklist complete
- [x] Rules respected
- [x] Documentation aligned

### Notes
`src/commands/move.ts` keeps lifecycle guardrails by rejecting the two reserved stages, preserves the origin freshness check and has focused transition/refusal coverage.
