---
id: ISS-0079
title: Gitignore BOARD.md on lytos-cli (mirrors lytos-app ADR-0010)
type: refactor
priority: P2-normal
effort: XS
complexity: light
domain: [board, workflow]
skill: 
skills_aux: []
status: 5-done
review: go
review_go_at: 2026-06-14
reviewer: "human:fredericgalline"
branch: claude/lytos-board-status-7xjjmq
depends: []
created: 2026-05-25
updated: 2026-06-14
started_at: 2026-06-13
review_at: 2026-06-13
schema_version: 2
completed_at: 2026-06-14
---
# ISS-0079 — Gitignore BOARD.md on lytos-cli

## Context

Lytos-app documented and shipped [ADR-0010 — BOARD.md is a derived artifact](https://github.com/getlytos/lytos-app/blob/main/.lytos/adr/ADR-0010-board-md-derived-artifact.md) in response to the conflict pattern observed three times during the 2026-05-25 session (once on **this repository** — PR #22, schema v2).

The same fix belongs here. `lyt board` keeps writing BOARD.md locally (terminal-friendly); it simply stops committing it.

## Proposed solution

An exact tracing of lytos-app's ADR-0010:

1. Add `.lytos/issue-board/BOARD.md` to `.gitignore`.
2. `git rm --cached .lytos/issue-board/BOARD.md` (stop tracking, the file stays on disk).
3. Add a `.lytos/issue-board/README.md` pointing a GitHub visitor to `lyt board` or the App.
4. Optional: an ADR-0002 on lytos-cli mirroring ADR-0010 (cross-repo ADRs stay local but referenced).

`lyt board` needs no code change — its output simply stops being staged.

## Definition of done

- [x] `.gitignore` updated with the entry plus a comment pointing at the ADR.
- [x] `git rm --cached` run, BOARD.md no longer in the index.
- [x] A README in `.lytos/issue-board/` that orients the reader.
- [x] ADR-0002 on lytos-cli — **decided**: a full local ADR created (mirroring ADR-0010), referenced from the manifest's ADR table. Consistent with the principle "durable auditability over short-term ergonomics".
- [x] Existing tests pass (28 `init` tests green, the whole suite green except one unrelated `review.test.ts` failure — the environment's commit signature).
- [x] Empirical check: structurally guaranteed — BOARD.md is no longer tracked, so it produces no diff and can no longer generate a merge conflict.

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
