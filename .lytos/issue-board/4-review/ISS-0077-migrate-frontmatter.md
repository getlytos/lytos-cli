---
id: ISS-0077
title: "lyt migrate-frontmatter — backfill schema_version + lifecycle fields (phase 5 of schema v2)"
type: feat
priority: P3-low
effort: M
complexity: standard
domain: [migration, schema, audit]
skill: ""
skills_aux: []
status: 4-review
branch: "claude/lytos-board-status-7xjjmq"
depends: [ISS-0074]
created: 2026-05-25
updated: 2026-06-13
started_at: 2026-06-13
review_at: 2026-06-13
schema_version: 2
---

# ISS-0077 — `lyt migrate-frontmatter` (phase 5 of schema v2)

## Context

Phase 3 of [`ISS-0074`](../5-done/ISS-0074-frontmatter-schema-v2.md) auto-migrates an issue to schema v2 the first time `lyt start` / `lyt close` / `lyt review --verdict` touches it. That covers all **active** issues going forward.

But existing repos have a backlog of issues that may never see a write path: closed issues in `5-done/`, archived issues, icebox notes. They stay v1 forever, and `lyt doctor` keeps emitting info findings for each of them. A one-shot migration command closes the gap.

It also matters for **onboarding** : a team starting Lytos today scaffolds v2 templates but their existing tickets (if migrated from elsewhere) are v1. They want one command that brings the whole board to v2.

## Proposed solution

Add `lyt migrate-frontmatter` :

- **Default behavior** : dry-run. Print a diff per issue (what fields would be added) and a summary. No file is touched.
- **`--apply`** : actually write the changes.
- **Field rules** :
  - Always: add `schema_version: 2` if absent.
  - When git history is available: backfill `started_at` (first commit on the issue branch or first time the file appeared in `3-in-progress/`) and `completed_at` (mtime in `5-done/` or last commit touching the file). Best-effort, falls back to "skipped, source: unknown" when the heuristic can't decide.
  - Never overwrite an existing value.
- **Idempotent** : re-running on an already-migrated repo is a no-op.

## Definition of done

- [x] `lyt migrate-frontmatter` exists with `--apply` and `--json` flags.
- [x] Dry-run is the default (no surprise file writes).
- [x] Re-running after a successful migration is a no-op (idempotent).
- [x] Backfilled dates are best-effort from `git log` ; missing data is recorded explicitly, not faked.
- [x] `lyt doctor` info count on a migrated repo drops to zero schema-v1 findings (verified on this repo: 9 → 0, score 100%).
- [x] Tests : fixture repo with mixed v1/v2 issues + a faked git history (injected `GitDateResolver` in `tests/lib/migrate.test.ts`).

## Checklist

### CLI surface
- [x] `src/commands/migrate-frontmatter.ts` registered in `src/cli.ts`.
- [x] `--apply`, `--json`, `--include-archive` flags.
- [x] Output format aligned with `lyt doctor` (info-style per issue).

### Migration logic
- [x] Scan all active status dirs (+ archive when `--include-archive`).
- [x] Per file: parse, compute delta, preserve existing values (textual insert — no reserialize, smallest possible diff).
- [x] Date heuristics:
  - [x] `started_at` : `git log --follow --diff-filter=A --format=%ad --date=short -- <file>` (oldest add). **Refinement:** only attempted for issues at/past `3-in-progress` — backfilling it for a never-started backlog/icebox issue would fake a lifecycle event that never happened.
  - [x] `completed_at` : last commit touching the file, only when status is `5-done` (or archived).
  - [x] When git fails or returns nothing → field left absent + "(skipped: no git history)" surfaced in the report.

### Tests
- [x] `tests/commands/migrate-frontmatter.test.ts` + `tests/lib/migrate.test.ts` :
  - [x] dry-run shows diff, no file changes.
  - [x] `--apply` writes the expected fields.
  - [x] already-v2 issues are untouched.
  - [x] missing git history produces a graceful skip.

## Relevant files

- `src/commands/migrate-frontmatter.ts` (new)
- `src/lib/migrate.ts` (new — pure logic, easier to test)
- `tests/commands/migrate-frontmatter.test.ts` (new)

## Notes

- **Split-out from ISS-0074 phase 5.** Independent of [[ISS-0076]] (AI wrapper integration).
- **Priority P3** : nice-to-have, not blocking. The auto-migration via `lyt start/close/review` already brings every actively-touched issue to v2. This is for the long-tail of closed/archived issues.
- **Risk** : git history can be partial (squash merges, force-pushed history). The "skipped" reporting is non-negotiable so users know which dates are real vs guessed.
- **Hors scope** : migrating fields beyond `schema_version` + lifecycle dates. `assignee` from git blame is tempting but unreliable for multi-author issues — skip.
- **Design — injectable git resolver.** All git access goes through a `GitDateResolver` interface; the command wires the real `git log` resolver, tests inject a fake one. Keeps the planning logic pure/unit-testable and avoids tests that create real commits (which also fail under this environment's commit-signing setup).
- **Applied on this repo.** Ran `lyt migrate-frontmatter --apply` to bring the long-tail of v1 issues to v2 — that's the bulk of the frontmatter diff in this PR (one `+ schema_version: 2` line each, plus `started_at`/`completed_at` on done issues). Not hand edits.
- **Collateral fix.** Moving ISS-0076/0077 into the sprint broke two relative links in ISS-0074 (`../1-backlog/...`). Converted them to `[[ISS-XXXX]]` wiki-style (already used elsewhere in the file, immune to folder moves) to keep `lyt doctor` at 100%.
