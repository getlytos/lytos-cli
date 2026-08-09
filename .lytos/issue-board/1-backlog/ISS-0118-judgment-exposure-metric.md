---
id: ISS-0118
title: "Métrique d'exposition au jugement — la dette de compétence au bilan"
type: feat
priority: P1-high
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
# ISS-0118 — Provisionner la dette, pas la découvrir à la faillite

## Contexte

Le seul grief que ni l'attaque ni la défense n'ont dissous : la compétence est traitée
comme une entrée constante, jamais comme une variable que le système érode. Lytos audit
tout sauf la trajectoire de compétence de l'équipe (ADR-0008 §2). C'est la 5ᵉ question de
gouvernance manquante : *quelle compétence l'équipe accumule-t-elle encore ?*

## Le geste

Une métrique d'exposition au jugement par personne, dérivée du substrat schema v2 : diffs
revus-puis-corrigés, parks résolus à la main, taux d'accord avec le reviewer adverse, part
de code écrite à la main. Agrégée dans le rapport de sprint (ISS-0105). **Alerte** si elle
tombe pour toute l'équipe pendant que la vélocité monte — le sceptique qui gagne, vu venir.

## Definition of done

- [ ] Métrique par personne calculée depuis les champs schema v2 — *verify: auto*
- [ ] Agrégée + tendance dans le rapport de sprint — *verify: auto*
- [ ] Alerte sur chute team-wide — *verify: auto*
- [ ] Tests d'agrégation et de seuil d'alerte — *verify: auto*
- [ ] Les proxys choisis reflètent-ils vraiment le jugement — *verify: human*

## Notes

- Réf : ADR-0008 §2. Indicateur avancé des conditions de falsifiabilité (cohorte à 3 ans).
