---
id: ISS-0115
title: Definition of Ready — le gate d'entrée, jumeau de la DoD
type: feat
priority: P1-high
effort: M
complexity: standard
domain: [cli, method]
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
# ISS-0115 — Attraper l'ambiguïté avant de dépenser des tokens

## Contexte

Le park-on-ambiguity (ADR-0004 §3) est **réactif** : on s'arrête *après* avoir heurté
l'ambiguïté. Un gate de « prêt » déplace ça à gauche : une issue sous-spécifiée n'entre
pas dans le loop (ADR-0007 §3). C'est ce qui transforme « 40 % des parks = ambiguous-spec »
en prévention.

## Le geste

Une issue est **ready** si : scope clair, contraintes énoncées, **hors-scope explicite**,
DoD testable (ADR-0004 §4), `risk` renseigné. Section `## Ready` normée dans le template.
`lyt next` **refuse** une issue non-ready (nouvelle raison d'inéligibilité `not-ready`) ;
`lyt lint` la signale. Complète la loop-éligibilité existante (DoD machine-vérifiable).

## Definition of done

- [ ] Critères de Ready définis + section `## Ready` au template (projet + method/) — *verify: doc L1*
- [x] `lyt next` : une issue non-ready n'est pas éligible (raison `not-ready`) — *verify: auto*
- [x] `lyt lint` signale les issues du sprint non-ready — *verify: auto*
- [x] Tests : ready complet / champ manquant / hors-scope absent — *verify: auto*
- [ ] Les critères sont-ils suffisants sans être bureaucratiques — *verify: human*

## Notes

- Jumeau amont de la DoD. Étend `lyt next` (ISS-0099). Réf : ADR-0007 §3.
