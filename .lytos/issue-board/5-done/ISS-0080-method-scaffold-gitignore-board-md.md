---
id: ISS-0080
title: Include BOARD.md in the default .gitignore of the lyt init scaffold
type: refactor
priority: P2-normal
effort: XS
complexity: light
domain: [scaffold, method, board]
skill: 
skills_aux: []
status: 5-done
review: go
review_go_at: 2026-06-14
reviewer: "human:fredericgalline"
branch: claude/lytos-board-status-7xjjmq
depends: [ISS-0079]
created: 2026-05-25
updated: 2026-06-14
started_at: 2026-06-13
review_at: 2026-06-13
schema_version: 2
completed_at: 2026-06-14
---
# ISS-0080 — The `lyt init` scaffold gitignores BOARD.md

## Context

[`ISS-0079`](ISS-0079-gitignore-board-md.md) applies the [ADR-0010](https://github.com/getlytos/lytos-app/blob/main/.lytos/adr/ADR-0010-board-md-derived-artifact.md) decision to the lytos-cli repository itself. This issue propagates the decision to the **distributed scaffold**: the `method/` directory that `lyt init` copies from.

Today every new project created through `lyt init` gets `BOARD.md` tracked by default — and will therefore relive the same conflict pattern on its first multi-change PR. It would be a shame for a durable decision recorded in an ADR not to be baked into the default.

## Proposed solution

Two changes in `method/`:

1. If the scaffold ships a default `.gitignore` → add the `.lytos/issue-board/BOARD.md` entry. If it ships none → create one with that entry plus the usual suspects (`node_modules/`, `dist/`, `.DS_Store`, …, according to what typical target projects would want).
2. Include the `.lytos/issue-board/README.md` (the same one lytos-app provides) that orients a GitHub visitor.

Test: `lyt init` in an empty folder → check that BOARD.md is gitignored from the start.

## Definition of done

- [x] `method/.gitignore` updated with `issue-board/BOARD.md` (the path relative to `.lytos/`, where this gitignore lands once scaffolded — not `.lytos/issue-board/BOARD.md`).
- [x] `method/issue-board/README.md` added (generic version) plus a `REMOTE_FILES` entry in `src/lib/scaffold.ts` so that `lyt init` copies it.
- [x] `init.test.ts` checks that `lyt init` produces a `.lytos/.gitignore` containing `issue-board/BOARD.md`, and a README that is present and orienting.
- [x] Empirical test: covered by the above — the generated `.gitignore` carries the entry, so a repository created through `lyt init` does not track BOARD.md from the start.

## Relevant files

- `method/.gitignore` (created or modified)
- `method/.lytos/issue-board/README.md` (new)
- `tests/commands/init.test.ts` (extended)
- `src/lib/scaffold.ts` (if the scaffold's file list is coded explicitly rather than copied with `cp -r`)

## Notes

- Depends sur [`ISS-0079`](ISS-0079-gitignore-board-md.md) — l'ordre logique : on fixe d'abord lytos-cli, puis on garantit que les nouveaux repos héritent du fix.
- **Cross-repo follow-up séparé** : si le repo `lytos-method` (github.com/getlytos/lytos-method) contient une documentation utilisateur de la convention BOARD.md, elle aussi mérite une note. Issue à ouvrir directement sur ce repo, hors scope ici (pas d'accès local lors de la rédaction de ce draft).
