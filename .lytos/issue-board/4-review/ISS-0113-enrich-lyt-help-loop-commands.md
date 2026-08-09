---
id: ISS-0113
title: Enrichir `lyt help` avec les primitives du loop
type: chore
priority: P2-normal
effort: XS
complexity: light
domain: [cli, docs]
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
# ISS-0113 — Le help doit refléter les commandes livrées

## Contexte

Le sprint #04 a livré `lyt next`, `lyt park`/`unpark`, `lyt budget` — mais le bloc
d'exemples de `lyt --help` ne les mentionnait pas. Un help incomplet, c'est une commande
invisible.

## Le geste

Ajouter un groupe « Loop primitives (ADR-0004) » aux exemples de `lyt --help`, en
rappelant que le CLI expose les primitives et que le wrapper/App orchestrent.

## Definition of done

- [x] Les 4 commandes du sprint #04 figurent dans `lyt --help` — *verify: auto*
- [ ] Relecture : le groupement et le wording sont clairs — *verify: human*

## Notes

- Réf : ADR-0004. Suivi terrain : penser à re-synchroniser le help à chaque commande.
