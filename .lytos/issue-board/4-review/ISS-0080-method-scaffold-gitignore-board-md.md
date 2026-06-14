---
id: ISS-0080
title: "Inclure BOARD.md dans le .gitignore par défaut du scaffold lyt init"
type: refactor
priority: P2-normal
effort: XS
complexity: light
domain: [scaffold, method, board]
skill: ""
skills_aux: []
status: 4-review
review: go
review_go_at: 2026-06-14
reviewer: human:fredericgalline
branch: "claude/lytos-board-status-7xjjmq"
depends: [ISS-0079]
created: 2026-05-25
updated: 2026-06-14
started_at: 2026-06-13
review_at: 2026-06-13
schema_version: 2
---

# ISS-0080 — Scaffold `lyt init` inclut BOARD.md dans le gitignore

## Context

[`ISS-0079`](ISS-0079-gitignore-board-md.md) applique la décision [ADR-0010](https://github.com/getlytos/lytos-app/blob/main/.lytos/adr/ADR-0010-board-md-derived-artifact.md) au repo lytos-cli lui-même. Cette issue propage la décision au **scaffold distribué** : `method/` directory qui sert de modèle à `lyt init`.

Aujourd'hui, tout nouveau projet créé via `lyt init` se retrouve avec `BOARD.md` trackée par défaut — donc va revivre le même pattern de conflit à la première PR multi-modif. C'est dommage que la décision durable acte par ADR-0010 ne soit pas embarquée dans la valeur par défaut.

## Proposed solution

Deux modifications dans `method/` :

1. Si le scaffold inclut un `.gitignore` par défaut → ajouter l'entry `.lytos/issue-board/BOARD.md`. Si pas de `.gitignore` dans le scaffold → en créer un avec cette entry + les classiques (`node_modules/`, `dist/`, `.DS_Store`, etc. selon ce que les projets typiques cibles voudraient).
2. Inclure le `README.md` de `.lytos/issue-board/` (le même que lytos-app fournit) qui oriente le visiteur GitHub.

Test : `lyt init` dans un dossier vide → vérifier que BOARD.md est gitignoré dès le départ.

## Definition of done

- [x] `method/.gitignore` mis à jour avec `issue-board/BOARD.md` (chemin relatif à `.lytos/`, là où ce gitignore atterrit une fois scaffoldé — pas `.lytos/issue-board/BOARD.md`).
- [x] `method/issue-board/README.md` ajouté (version générique) + entrée `REMOTE_FILES` dans `src/lib/scaffold.ts` pour qu'il soit copié au `lyt init`.
- [x] Tests `init.test.ts` vérifient : `lyt init` produit un `.lytos/.gitignore` contenant `issue-board/BOARD.md` + un README présent et orienté.
- [x] Test empirique : couvert par le test ci-dessus — le `.gitignore` généré contient l'entry, donc un repo créé via `lyt init` ne tracke pas BOARD.md dès le départ.

## Relevant files

- `method/.gitignore` (créé ou modifié)
- `method/.lytos/issue-board/README.md` (nouveau)
- `tests/commands/init.test.ts` (étendu)
- `src/lib/scaffold.ts` (si la liste des fichiers du scaffold est codée explicitement plutôt que copiée via `cp -r`)

## Notes

- Depends sur [`ISS-0079`](ISS-0079-gitignore-board-md.md) — l'ordre logique : on fixe d'abord lytos-cli, puis on garantit que les nouveaux repos héritent du fix.
- **Cross-repo follow-up séparé** : si le repo `lytos-method` (github.com/getlytos/lytos-method) contient une documentation utilisateur de la convention BOARD.md, elle aussi mérite une note. Issue à ouvrir directement sur ce repo, hors scope ici (pas d'accès local lors de la rédaction de ce draft).
