---
id: ISS-0098
title: "EPIC — Boucle autonome (loop-B) sous gouvernance Lytos"
type: feat
priority: P1-high
effort: XL
complexity: heavy
domain: [cli, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0099, ISS-0100, ISS-0101, ISS-0102, ISS-0103, ISS-0104, ISS-0105, ISS-0106]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0098 — EPIC : boucle autonome sous gouvernance

## Contexte

Le loop-B (un agent qui enchaîne les issues du sprint jusqu'à la review, sans tour
humain) entre en collision frontale avec la règle du manifest « L'IA ne décide jamais
seule ». Il est pourtant réconciliable : le loop est le moteur, Lytos est le rail. Le
contrat de gouvernance est fixé dans **ADR-0004**. Cette épic regroupe les briques CLI
qui l'implémentent. Le CLI ne fait *pas* tourner le loop (il n'appelle aucune IA) — il
fournit les primitives que le wrapper / l'App orchestrent.

## Le geste

Livrer les primitives d'ADR-0004 et garantir ses 5 invariants : le loop ne se ferme
jamais lui-même, l'ambiguïté gare au lieu de deviner, aucune issue sans DoD
machine-vérifiable n'entre dans le loop, chaque item `verify: human` finit en sign-off
tracé, implémenteur ≠ relecteur.

## Definition of done

- [ ] ADR-0004 accepté (`Status: Accepted`) après relecture humaine — *verify: human*
- [ ] Les 8 issues enfants sont livrées et fermées — *verify: auto*
- [ ] Un run de démonstration bout-en-bout (sélection → work → park OU review packet)
      documenté sur une issue réelle — *verify: human*

## Notes

- ADR : `.lytos/adr/ADR-0004-autonomous-loop-under-governance.md`
- Enfants : ISS-0099 (`lyt next`), ISS-0100 (park), ISS-0101 (DoD verify mode),
  ISS-0102 (`lyt budget`), ISS-0103 (review packet), ISS-0104 (checklist + sign-off),
  ISS-0105 (rapport de sprint), ISS-0106 (propagation method).
- App (direction 2, plus tard) : cockpit de supervision, réutilise ISS-0071 / ISS-0080.
