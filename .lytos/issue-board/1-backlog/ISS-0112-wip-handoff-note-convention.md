---
id: ISS-0112
title: "Convention de note de handoff WIP — matérialiser « où j'en suis » dans l'issue"
type: feat
priority: P1-high
effort: S
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
# ISS-0112 — Le contexte portable est l'issue, pas le chat

## Contexte

Le chat de l'agent ne traverse pas les surfaces (Claude Code web → VSCode → App = runtimes
différents). Ce qui reprend demain, c'est **le repo** : status, DoD cochée, branche… et il
manque « où j'en étais / prochaine étape » (ADR-0006 §2). Il faut le matérialiser dans
l'issue avant de terminer, sinon il est perdu — c'est la posture anti-vibecoding.

## Le geste

Une section normée `## WIP handoff` dans le corps d'issue (dernier état, prochaine étape,
pièges connus), que l'agent **écrit avant de terminer une session** et que le suivant lit
en premier. Le CLI la reconnaît : `lyt show ISS-X` l'affiche en tête si présente ; à jour
via une date. Intégré au skill `session-start` (geste de fin de tâche : note WIP +
checkpoint).

## Definition of done

- [ ] Convention `## WIP handoff` documentée (template d'issue + rules) — *verify: human*
- [ ] `lyt show ISS-X` remonte la note en tête si présente — *verify: auto*
- [ ] `session-start` : « écrire la note WIP » ajouté au geste de fin de tâche — *verify: human*
- [ ] La note est-elle réellement suffisante pour reprendre à froid — *verify: human*

## Notes

- Lue par `lyt resume` (ISS-0111). Réf : ADR-0006 §2. Le repo est la mémoire, le chat est jetable.
