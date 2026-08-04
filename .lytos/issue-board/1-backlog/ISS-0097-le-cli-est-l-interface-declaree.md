---
id: ISS-0097
title: "Les règles générées déclarent le CLI comme L'INTERFACE du board — pas deux commandes en passant"
type: feat
priority: P1-high
effort: S
complexity: light
domain: [method, templates, dx]
skill: ""
skills_aux: []
status: 1-backlog
branch: ""
depends: []
created: 2026-08-04
updated: 2026-08-04
schema_version: 2
---

# ISS-0097 — L'agent n'a pas vu le CLI, et ce n'est pas sa faute

## Retour terrain (immo, 03-04/08 — le constat est de Frédéric)

Un agent a passé 48 h d'usage Lytos intensif en lisant TOUTES les règles au démarrage, et a
pourtant fait chaque transition à la main (frontmatter édité, `git mv`, board régénéré) en scripts
jetables — alors que `lyt start`, `show`, `close --dry-run`, `review --export/--accept` existaient.
Cause : les règles générées ne mentionnent que `lyt board` et `lyt close`, en passant, dans une
cellule de tableau. Rien ne dit « le CLI est l'interface ; ne touche jamais un frontmatter ni un
dossier à la main ». Aggravant : `lyt` n'est pas sur le PATH (devDependency) — le premier essai a
rendu « lyt not found » et l'agent a conclu à l'absence d'outil ; les règles doivent dire `npx lyt`.

## Le geste

Dans les gabarits de règles générés par `lyt init` (et la doc de la méthode) :

- [ ] Une section dédiée « Le CLI est l'interface » : table des verbes (start, move, close, show,
      review, board, lint) avec quand les employer — via `npx lyt`, jamais `lyt` nu
- [ ] La règle en creux : « ne JAMAIS éditer un frontmatter de statut ni déplacer une fiche à la
      main ; si une transition n'a pas de verbe, le signaler au lieu de contourner »
- [ ] La skill session-start commence par `npx lyt show` (l'état réel en un appel)
- [ ] `lyt doctor` avertit quand un projet a des règles d'une génération antérieure sans la section
