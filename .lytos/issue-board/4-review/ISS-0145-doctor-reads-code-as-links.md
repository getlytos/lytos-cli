---
id: ISS-0145
title: A link inside a code span is not a link — `lyt doctor` reads prose as data
type: fix
priority: P2-normal
effort: XS
complexity: light
domain: [cli]
skill: 
skills_aux: []
status: 4-review
branch: fix/ISS-0145-doctor-reads-code-as-links
depends: []
created: 2026-09-02
schema_version: 2
risk: low
updated: 2026-09-02
---
# ISS-0145 — Writing *about* a broken link creates one

## Context — the third instance of one shape, in two days

`checkBrokenLinks()` scans a fiche's raw text for `[label](path)`. It does not skip fenced blocks,
and it does not skip inline code spans. So documenting a link — quoting one as an example, showing
what a bad path looks like, explaining a syntax — reports a broken link that does not exist.

Found on ISS-0124's own fiche. Its delivery note explains the defect it had just fixed:

> `` `[ISS-0079](ISS-0079-gitignore-board-md.md)` is a valid sibling link from `5-done/` and a dead
> one from `.lytos/`. ``

The example is inside a code span, and `lyt doctor` reported it as an error — dropping the health
score from 65% to 55% for a sentence that is correct.

**This is the same shape three times in two days, in three different checkers:**

| Checker | The bug | Fixed in |
|---|---|---|
| `ready.ts` | a stray "out of scope" in a note made an issue look ready | ISS-0115 (earlier: its own audit) |
| `pinnedGateRefs()` | quoting `verify: reviewer:x` in an audit response counted as pinning it | ISS-0114 |
| `checkBrokenLinks()` | a link quoted as an example is checked as a link | this issue |

Each was written by someone who knew about the previous one. The lesson is not "be careful": it is
that **a fiche is prose containing code, and any checker reading it as data needs the same
narrowing** — scope to the section that binds, and skip what is quoted.

## Ready

- **Scope** — strip fenced code blocks and inline code spans before scanning for links in
  `checkBrokenLinks()`.
- **Constraints** — a real link outside code must still be checked; the http/mailto skip and the
  file-relative/repo-relative fallback are untouched. No change to what counts as a valid target.
- **Out of scope** — the other checkers (already fixed), and factoring the three into one shared
  "prose reader" helper: worth doing once there is a fourth, not before.
- `risk: low` — a diagnostic reads less, never more; the failure mode is a missed broken link in
  code, which is not a link.

## Definition of done

- [x] A link inside a fenced block is not reported — verify: auto
- [x] A link inside an inline code span is not reported — verify: auto
- [x] A real broken link in prose is still reported, in the same file — verify: auto
- [x] `lyt doctor` on this repository returns to 0 errors — verify: auto

## Notes

- The three instances are worth citing together in whatever ISS-0128 (rules that do not run)
  eventually says about detective versus preventive checks.

## Delivered — 2026-09-02

`withoutCode()` strips fenced blocks (both fence styles) and inline code spans before the link
scan. Everything else is untouched: the http/mailto skip, the file-relative then repo-relative
fallback, what counts as a valid target.

One regression covers all three cases in a single fixture — an inline-quoted link, a fenced one,
and a real broken one in prose — because the value is the *discrimination*, and a test that only
proved the quoted ones are skipped would pass just as well if the checker stopped checking
anything.

`lyt doctor` on this repository: back to **0 errors**, 65%.
