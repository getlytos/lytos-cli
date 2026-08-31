---
id: ISS-0099
title: `lyt next` — sélecteur d'issue éligible au loop
type: feat
priority: P1-high
effort: M
complexity: standard
domain: [cli, dx]
skill: 
skills_aux: []
status: 5-done
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0101]
created: 2026-08-09
updated: 2026-08-10
schema_version: 2
assignee: Claude
started_at: 2026-08-09
completed_at: 2026-08-10
commits: [349cd9e, 881e87a, d5cf5cb, afae795, ed37ccf, 80d658a, ce6f91d, 230ad0d, 8e0e745, c23fcf6, 76035ed, c34c9cb, a39e1e9, 8665d38, 71e4bfa, 873931c, 31a9a8c, bb502e8, 09f2c4d, 15ba056, 5d3d472, 08d295d, 7aaa7c5, 96fad9d, 24230a0, a8483f3, 7c16fd8, 3c16cd8, a6fac6a, 71ded27, 8b89911, cb17e83, 0933900, c7e454b, f492a0e, 2be7413, f4a5405, d0f5e77, 6a3e84e, 0c86b6c, bce1a82, 35c0d61, 638fc40, a70f8cf, 07e23ed, fa18610, ab68138, 23d0673, 4318a7f, 5740116]
---
# ISS-0099 — La prochaine issue que le loop a le droit de prendre

## Contexte

Le loop-B doit choisir sa prochaine tâche de façon **décidable par machine**, dans le
seul périmètre du sprint (le gate humain amont). Sans ça, un `while` ne sait pas quoi
prendre ni quand s'arrêter (ADR-0004 §1).

## Le geste

`lyt next` renvoie la première issue **loop-éligible** du sprint : `status` travaillable
**et** `depends`/enfants satisfaits **et** DoD portant ≥ 1 item `verify: auto` (via
ISS-0101). Ordre déterministe (priorité, puis deps, puis id). Refuse et **explique** si
rien n'est éligible (ex. « ISS-X en tête mais DoD 100% human → à traiter à la main »).
`--json` pour le wrapper. Aucun effet de bord : `lyt next` lit, il ne transitionne pas.

## Definition of done

- [x] Sélection respecte sprint + status + deps/enfants + DoD machine-vérifiable — *verify: auto*
- [x] Sortie `--json` et sortie humaine ; raison explicite quand vide/refusé — *verify: auto*
- [x] Tests : cas nominal, deps non satisfaites, DoD tout-human refusée, sprint vide — *verify: auto*

## Notes

- Lecture seule — l'orchestration (appeler `lyt start` derrière) reste au wrapper/App.
- Réf : ADR-0004 §1. Dépend de ISS-0101 (mode de vérification des items de DoD).

## Audit — 2026-08-10

**Verdict:** GO

### Checks
- [x] Tests pass (313)
- [x] Issue checklist complete
- [x] Rules respected
- [x] Documentation aligned

### Notes
Eligibility is deterministic, explains each blocked state, checks dependencies in the board, and returns both JSON and human-readable output without mutating the workflow.
