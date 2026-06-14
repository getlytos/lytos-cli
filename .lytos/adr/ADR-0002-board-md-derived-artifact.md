# ADR-0002 — BOARD.md is a derived artifact, not tracked in git

Date: 2026-06-13

Status: Accepted

> Mirrors [`lytos-app` ADR-0010](https://github.com/getlytos/lytos-app/blob/main/.lytos/adr/ADR-0010-board-md-derived-artifact.md).
> Cross-repo ADRs stay local to each repo but reference each other so the
> decision is auditable from either side.

---

## Context

The issue YAML frontmatter is the **source of truth** for board state. `lyt board`
reads every issue and regenerates `.lytos/issue-board/BOARD.md` as a flat,
terminal-friendly index.

Because `BOARD.md` was tracked in git, *every* change that touches an issue
(create, move, close) also rewrote `BOARD.md`. Two branches that each moved a
different issue produced **conflicting edits on the same generated file** — a
merge conflict that carries no real information, since the file can be
regenerated from the frontmatter at any time.

This conflict pattern was observed three times during the 2026-05-25 session,
including once on **this repo** (PR #22, frontmatter schema v2).

A generated file that conflicts is friction with zero payoff: the conflict is
never about the board itself, only about which regeneration won.

---

## Decision

`BOARD.md` is treated as a **derived artifact** and is no longer tracked in git.

- `.lytos/issue-board/BOARD.md` is added to `.gitignore`.
- The file is removed from the index with `git rm --cached` (it stays on disk).
- `lyt board` is unchanged: it still writes `BOARD.md` locally so the terminal
  view works offline and immediately.
- A `.lytos/issue-board/README.md` orients GitHub visitors who no longer see a
  pre-rendered board on the repo page.

The frontmatter remains the single source of truth. The board is a *view* of it,
reconstructed on demand — never a thing to merge.

---

## Consequences

- **No more BOARD.md merge conflicts.** Multi-change PRs touch only the
  frontmatter and folders that actually changed.
- **A direct GitHub visit no longer shows a rendered board.** The new
  `issue-board/README.md` compensates by explaining how to view it (`lyt board`
  or the Lytos App).
- **`lyt board --check` still works** against the local file — useful in CI or a
  pre-commit hook to detect drift, even though the file is untracked.
- **The default scaffold inherits this decision.** `lyt init` ships the same
  gitignore entry and README so new repos never re-live the conflict pattern
  (see ISS-0080).

---

## Non-goals

- Not removing `lyt board` or changing its output format — only its tracking.
- Not gitignoring any other `.lytos/` file. The frontmatter, manifest, memory,
  rules, and skills remain tracked: they are sources, not derivations.
