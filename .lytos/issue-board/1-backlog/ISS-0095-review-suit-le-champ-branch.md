---
id: ISS-0095
title: "`lyt review` audite la branche déclarée par la fiche, pas l'arbre courant"
type: feat
priority: P1-high
effort: M
complexity: standard
domain: [cli, review]
skill: ""
skills_aux: []
status: 1-backlog
branch: ""
depends: []
created: 2026-08-04
updated: 2026-08-04
schema_version: 2
---

# ISS-0095 — Le faux « aucun correctif versionné »

## Retour terrain (immo, 03/08)

Une re-review a rendu TROIS faux « aucun correctif versionné depuis le premier audit » : les
correctifs étaient poussés — sur des branches que les fiches ne désignaient pas — et l'audit
lisait l'arbre courant. Résolu sur le terrain par convention (le frontmatter `branch:` désigne où
auditer, note dans chaque fiche) ; la convention doit devenir le comportement de l'outil.

## Le geste

`lyt review ISS-X --export` : le prompt d'audit inclut la branche déclarée et instruit l'auditeur
de la vérifier là (checkout ou worktree temporaire) ; si `branch:` est vide, l'audit porte sur
l'arbre courant et LE DIT. Bonus : avertir à l'export quand la branche déclarée n'existe pas sur
origin — c'est un mensonge de fiche, détectable avant l'audit.

- [ ] Le prompt exporté porte la branche + l'instruction de s'y placer
- [ ] Avertissement si `branch:` absent ou introuvable sur origin
- [ ] Tests sur les trois cas (branche valide, vide, introuvable)
