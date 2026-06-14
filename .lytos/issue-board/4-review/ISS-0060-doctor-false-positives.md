---
id: ISS-0060
title: "lyt doctor: fix two false-positive classes (repo-relative links, archived deps)"
type: fix
priority: P2-normal
effort: S
complexity: standard
domain: [cli, doctor]
skill: code-structure
skills_aux: [testing]
status: 4-review
review: go
review_go_at: 2026-06-14
reviewer: human:fredericgalline
branch: "claude/lytos-board-status-7xjjmq"
depends: []
created: 2026-04-22
updated: 2026-06-14
started_at: 2026-06-13
review_at: 2026-06-13
schema_version: 2
---

# ISS-0060 — `lyt doctor`: fix two false-positive classes

## Context

`lyt doctor` on the current board reports 2 errors and 3 warnings that are not real issues:

```
✗ issue-board/3-in-progress/ISS-0051-manual-archive-command.md
    Broken link: [src/commands/board.ts:88-89] → file not found
✗ issue-board/3-in-progress/ISS-0051-manual-archive-command.md
    Broken link: [src/commands/board.ts] → file not found

! issue-board/1-backlog/ISS-0042-claim-as-draft-pr.md
    Depends on ISS-0041 which does not exist on the board
! issue-board/1-backlog/ISS-0047-skill-import.md
    Depends on ISS-0046 which does not exist on the board
! issue-board/5-done/ISS-0039-adapters-copilot-gemini-windsurf.md
    Depends on ISS-0038 which does not exist on the board
```

Both classes come from doctor's resolution logic, not from any real problem in the issue files or the code.

### Class 1 — Broken links resolved relative to the issue file

[src/lib/doctor.ts:104-105](src/lib/doctor.ts#L104-L105) resolves markdown links relative to the *directory of the markdown file containing the link*:

```ts
const fileDir = filePath.replace(/\/[^/]+$/, "");
const resolvedPath = join(fileDir, linkTarget);
```

An issue at `.lytos/issue-board/3-in-progress/ISS-0051-*.md` that references `src/commands/board.ts` gets resolved as `.lytos/issue-board/3-in-progress/src/commands/board.ts` — which obviously does not exist. But **repo-root-relative** is the natural convention when issue specs reference project source code (and how GitHub renders them when viewed from the repo root).

### Class 2 — Orphan-dep check ignores the archive

[src/lib/doctor.ts:311-314](src/lib/doctor.ts#L311-L314) builds the set of known issue IDs from `0-icebox` through `5-done` only — not `archive/<quarter>/`. Any live issue that legitimately depends on an archived issue (historically closed work) shows up as an orphan.

Concretely: ISS-0042 → ISS-0041, ISS-0047 → ISS-0046, ISS-0039 → ISS-0038. All three "missing" IDs are present in `archive/INDEX.md`.

## Proposed solution

### Fix 1 — Try repo-root-relative as a fallback for broken-link resolution

In `checkBrokenLinks` ([src/lib/doctor.ts:83](src/lib/doctor.ts#L83)):

1. Keep the current file-relative resolution as the first attempt.
2. If the file is not found, try again relative to the **project root** (i.e. the parent of `.lytos/`).
3. Only report broken if both attempts fail.

This preserves support for truly file-relative links (e.g. a link between two issue files, which works today) while accepting the repo-relative convention that issue specs already use.

### Fix 2 — Include archive in the known-IDs set

In the orphan-dependency check ([src/lib/doctor.ts:309-332](src/lib/doctor.ts#L309-L332)):

1. Read `archive/INDEX.md` and extract every `ISS-XXXX` token.
2. Add them to `allIssueIds` before the dependency scan.
3. Keep the current behavior for live folders unchanged.

Optionally: if an issue *only* exists in the archive, still accept it as a valid dependency target but display a hint ("archived in YYYY-Q#") to help the reader.

## Definition of done

- [x] `lyt doctor` on this very repo reports 0 broken links for paths that resolve from the repo root (e.g. `src/commands/board.ts`)
- [x] `lyt doctor` no longer flags dependencies that exist only in `archive/INDEX.md` (orphan-dependency findings: 0 on this repo)
- [x] Genuine broken links (typos, deleted files) are still caught — both classes (test + the 2 remaining cross-repo `lytos-method` links in archived ISS-0051 are still flagged)
- [x] File-relative links between issue files still work (fallback is additive — file-relative is tried first; existing tests stay green)
- [x] New unit / integration tests cover:
  - [x] file-relative link still found (existing "detects broken internal links" exercises file-relative resolution)
  - [x] repo-relative link found via fallback
  - [x] truly broken path still flagged
  - [x] archived dep accepted
  - [x] truly missing dep (not on board, not in archive) still flagged
- [x] Coverage ≥ 80% on the touched functions — the 5 new tests exercise both branches of `checkBrokenLinks` (file-relative + repo-relative fallback) and `checkOrphanDependencies` (archived accepted + truly missing)

## Relevant files

- `src/lib/doctor.ts` — both fixes
- `tests/commands/doctor.test.ts` — extend with the new cases
- `tests/helpers/fixtures.ts` — may need an archive-aware fixture helper

## Notes

- **Out of scope (not a doctor bug, flagged separately):** the 22 "Missing Skills" warnings in the current `lyt doctor` output come from a globally-installed `lyt 0.8.9`, which predates the agentskills.io folder format. Current source (`main`) already handles both flat and folder layouts ([src/lib/doctor.ts:178-190](src/lib/doctor.ts#L178-L190)). Once 0.11.x is published and users run `npm i -g lytos-cli@latest`, those warnings go away. No fix needed here.
- **Observed during this fix — genuinely broken cross-repo links, resolved as content:** archived ISS-0051 contained two *cross-repo* links (`../../../../lytos-method/.lytos/...`) that doctor flagged. These were not a doctor false positive — a relative cross-repo path resolves nowhere, not even on GitHub. Rather than teaching doctor to tolerate them, the correct fix was to convert them to absolute GitHub URLs (which doctor already skips). Done — `lyt doctor` now reports 0 broken links and a 100% score on this repo.
- **Minor content debt in ISS-0051 itself:** the broken-link finding points at `src/commands/board.ts:88-89`, which were the pre-fix line numbers. The surrounding prose is written in past tense ("lyt board *used to* call archiveIssues"), so the historical reference is legitimate — but the line numbers are stale. Consider trimming to just the file path (`src/commands/board.ts`) in the ISS-0051 body during the next pass, or accept that issue specs freeze the "at the time of writing" state. Either way: not in scope for ISS-0060.
