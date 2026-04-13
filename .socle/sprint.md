# Sprint #01 — CLI MVP

> **Objective**: Deliver `socle init` and `socle board` — the two commands needed for a first public release.
> **Start**: 2026-04-13
> **Target end**: 2026-04-27

---

## Tasks

| Issue | Title | Effort | Skill | Depends | Status |
|-------|-------|--------|-------|---------|--------|
| ISS-0001 | Setup Node.js project (TypeScript, Commander.js, tsup, Vitest) | M | code-structure | — | sprint |
| ISS-0002 | Implement `socle init` (interactive scaffold) | L | code-structure | ISS-0001 | sprint |
| ISS-0003 | Implement `socle board` (BOARD.md generator) | M | code-structure | ISS-0001 | sprint |
| ISS-0004 | Integration tests for `socle init` | M | testing | ISS-0002 | sprint |
| ISS-0005 | Integration tests for `socle board` | S | testing | ISS-0003 | sprint |
| ISS-0006 | CI pipeline (GitHub Actions: lint, test, build) | S | deployment | ISS-0004, ISS-0005 | sprint |
| ISS-0007 | npm publish setup and first release | S | deployment | ISS-0006 | sprint |

---

## Dependency graph

```
ISS-0001 (project setup)
├── ISS-0002 (socle init) ──── ISS-0004 (tests init) ───┐
│                                                         ├── ISS-0006 (CI) ── ISS-0007 (npm publish)
└── ISS-0003 (socle board) ── ISS-0005 (tests board) ───┘
```

---

## Backlog (post-Sprint #01)

| Issue | Title | Effort | Priority |
|-------|-------|--------|----------|
| ISS-0008 | Implement `socle lint` (structure validation) | M | P1-high |
| ISS-0009 | Implement `socle doctor` (full diagnostic) | M | P1-high |
| ISS-0010 | Implement `socle status` (sprint DAG in terminal) | M | P2-normal |
| ISS-0011 | Add `--json` output to all commands | S | P2-normal |
