---
id: ISS-0119
title: "Mode learning — inverser le routage + rotation + diffs-pièges relecteur"
type: feat
priority: P2-normal
effort: M
complexity: standard
domain: [cli, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: []
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0119 — Former le jugement, pas seulement le router

## Contexte

La défense a concédé le vrai risque : router systématiquement l'écriture vers la machine
prive juniors *et* seniors de la pratique qui forme et entretient le jugement. La compétence
terminale (évaluer une sortie faillible) est enseignable — encore faut-il l'organiser
(ADR-0008 §2).

## Le geste

Un axe `learning: on` (par personne/issue) qui **inverse le routage** : l'humain écrit,
l'IA passe en reviewer adverse de l'humain — le même appareil (gates, checklist,
cross-review) sert la formation. Plus : **rotation obligatoire** des relecteurs sur
`risk: high`, et **diffs-pièges calibrés** (défaut connu) injectés dans le flux de revue —
un eval pour le relecteur humain, pas seulement pour le modèle : on mesure si le nez tient.

## Definition of done

- [ ] `learning: on` inverse implémenteur/reviewer pour l'issue — *verify: auto*
- [ ] Rotation des relecteurs appliquée/vérifiée sur `risk: high` — *verify: auto*
- [ ] Injection d'un diff-piège + score de détection du relecteur — *verify: auto*
- [ ] Tests des trois mécanismes — *verify: auto*
- [ ] Le dispositif forme-t-il réellement (pilote humain) — *verify: human*

## Notes

- Réf : ADR-0008 §2. Réutilise les rôles implémenteur/reviewer existants (ADR-0004 §5).
