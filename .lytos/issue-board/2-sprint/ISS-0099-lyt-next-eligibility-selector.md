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
status: 2-sprint
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0101]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
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

- [ ] Sélection respecte sprint + status + deps/enfants + DoD machine-vérifiable — *verify: auto*
- [ ] Sortie `--json` et sortie humaine ; raison explicite quand vide/refusé — *verify: auto*
- [ ] Tests : cas nominal, deps non satisfaites, DoD tout-human refusée, sprint vide — *verify: auto*

## Notes

- Lecture seule — l'orchestration (appeler `lyt start` derrière) reste au wrapper/App.
- Réf : ADR-0004 §1. Dépend de ISS-0101 (mode de vérification des items de DoD).
