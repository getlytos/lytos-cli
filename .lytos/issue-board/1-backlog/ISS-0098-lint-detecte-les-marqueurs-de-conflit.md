---
id: ISS-0098
title: "`lyt lint` détecte les marqueurs de conflit committés dans les fiches"
type: fix
priority: P1-high
effort: S
complexity: light
domain: [cli, lint]
skill: ""
skills_aux: []
status: 1-backlog
branch: ""
depends: []
created: 2026-08-04
updated: 2026-08-04
schema_version: 2
---

# ISS-0098 — Le lint n'a pas vu ce que la revue humaine a vu

## Retour terrain (immo, 04/08 — le constat est de la revue de Frédéric)

Une résolution de conflit triple (fichier déplacé dans trois dossiers) a laissé des MARQUEURS DE
CONFLIT (`<<<<<<<<`, `========`, `>>>>>>>>` — huit chevrons : le style rename/rename) committés
dans le FRONTMATTER d'une fiche. La suite complète du projet passait — 450 + 268 tests — et
`lyt lint` aussi : il valide la structure du board mais ne lit pas les corps à la recherche des
stigmates de merge. C'est la revue humaine qui l'a vu.

## Le geste

- [ ] `lyt lint` (et `lyt doctor`) signalent en erreur tout `^<{7,8} |^={7,8}$|^>{7,8} ` dans une
      fiche du board — frontmatter comme corps, les huit chevrons du rename/rename compris
- [ ] Le driver `_merge-issue` (ISS-0093) refuse d'écrire un résultat qui contient déjà des
      marqueurs côté base/ours/theirs — le poison ne doit pas se propager à travers un merge propre
- [ ] Tests : marqueurs à 7 et 8 chevrons, dans le frontmatter et dans le corps, faux positifs
      exclus (un bloc de code qui CITE des chevrons dans une fiche de doc)
