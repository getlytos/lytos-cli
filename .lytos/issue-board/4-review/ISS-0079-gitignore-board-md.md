---
id: ISS-0079
title: "Gitignore BOARD.md sur lytos-cli (mirror lytos-app ADR-0010)"
type: refactor
priority: P2-normal
effort: XS
complexity: light
domain: [board, workflow]
skill: ""
skills_aux: []
status: 4-review
review: go
review_go_at: 2026-06-14
reviewer: human:fredericgalline
branch: "claude/lytos-board-status-7xjjmq"
depends: []
created: 2026-05-25
updated: 2026-06-14
started_at: 2026-06-13
review_at: 2026-06-13
schema_version: 2
---

# ISS-0079 — Gitignore BOARD.md sur lytos-cli

## Context

Lytos-app a documenté + livré [ADR-0010 — BOARD.md is a derived artifact](https://github.com/getlytos/lytos-app/blob/main/.lytos/adr/ADR-0010-board-md-derived-artifact.md) en réponse au pattern de conflit observé 3 fois pendant la session 2026-05-25 (dont une fois sur **ce repo** — PR #22 schema v2).

Le même fix doit s'appliquer ici. `lyt board` continue d'écrire BOARD.md localement (terminal-friendly), il arrête juste de le commiter.

## Proposed solution

Calque exact de lytos-app ADR-0010 :

1. Ajouter `.lytos/issue-board/BOARD.md` à `.gitignore`.
2. `git rm --cached .lytos/issue-board/BOARD.md` (stop tracking, file stays on disk).
3. Ajouter un `.lytos/issue-board/README.md` qui oriente le visiteur GitHub vers `lyt board` ou l'App.
4. Optionnel : ADR-0002 sur lytos-cli qui mirror ADR-0010 (les ADR cross-repo restent locaux mais référencés).

`lyt board` n'a aucune raison de changer côté code — c'est juste que sa sortie n'est plus stagée.

## Definition of done

- [x] `.gitignore` mis à jour avec entry + commentaire pointant l'ADR.
- [x] `git rm --cached` exécuté, BOARD.md plus dans l'index.
- [x] README à `.lytos/issue-board/` avec orientation.
- [x] ADR-0002 sur lytos-cli — **tranché** : ADR local complet créé (mirror d'ADR-0010), référencé dans le tableau ADR du manifest. Choix cohérent avec le principe « Durable auditability over short-term ergonomics ».
- [x] Tests existants passent (28 tests `init` verts, suite globale verte hormis 1 échec `review.test.ts` non lié — signature de commit de l'environnement).
- [x] Vérification empirique : structurellement garanti — BOARD.md n'étant plus tracké, il ne produit plus de diff et ne peut plus générer de conflit de merge.

## Relevant files

- `.gitignore`
- `.lytos/issue-board/BOARD.md` (à délister)
- `.lytos/issue-board/README.md` (nouveau)
- `.lytos/adr/ADR-0002-…` (potentiellement nouveau)
- `tests/commands/board.test.ts` (review pour s'assurer qu'aucun test ne dépend de BOARD.md trackée)

## Notes

- **Coordination** : à livrer en synergie avec [`ISS-0080`](ISS-0080-method-scaffold-gitignore-board-md.md) qui met à jour `method/` pour que les nouveaux repos initiés via `lyt init` héritent du fix.
- **Coût** : visite GitHub directe sur le repo lytos-cli ne montre plus de board pré-rendu. Le README compense.
- **Effort XS** : changement mécanique, < 30 minutes.
