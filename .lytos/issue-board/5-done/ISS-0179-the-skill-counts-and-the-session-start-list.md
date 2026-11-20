---
id: ISS-0179
title: The skill counts in the init briefing and the session-start list are stale, and a test now derives them
type: docs
priority: P2-normal
effort: XS
complexity: light
skill: ""
skills_aux: []
status: 5-done
branch: docs/ISS-0179-skill-counts-and-session-start
depends: []
related: [ISS-0168]
created: 2026-11-20
schema_version: 2
risk: low
updated: 2026-11-20
completed_at: 2026-11-20
commits: [c02a545, 073a849, 323050d, 5ff5be1, ab448e7, e27e974, f3cae8f, 4629f73, 1c6e272, 889b647, 0aaa03d, ba6e11a, 27d1fd2, b5e8493, 3fd4185, a54e2a5, 957f8b6]
---
# ISS-0179 — The skill counts in the init briefing and the session-start list are stale, and a test now derives them

## Context

Two inconsistencies, flagged by the release check of 1.7.0. `lyt init` prints ".lytos/skills/ <- 9 operational procedures" (and its French twin), but a project now holds ten skill files: `session-start.md` and nine task skills, since `reference-loop` shipped (ISS-0168). And the "Task skills" paragraph of `skills/session-start.md` still lists eight task skills and leaves out `reference-loop`.

## Proposed solution

Correct both texts, mirror the `.lytos/` copy of session-start, and add a test that derives the count and the list from the skill files under `method/skills/`. Solution study: one line. This is the simplest option that is robust: the numbers stay hand-written text, and a test, not memory, notices the next skill that ships without them.

## Ready

- **Scope** — the two numbers in `src/commands/init.ts`, the list in `method/skills/session-start.md` and its `.lytos/` copy, and one test file.
- **Out of scope** — computing the number at run time, the README (ISS-0170 owns it), any other stale text.
- **Solution** — fix the texts and derive them by test.
- `risk: low`.

## Definition of done

- [x] The `lyt init` briefing says 10 in English and in French, and a test derives the number from the skill files `init` writes — verify: auto
- [x] `skills/session-start.md` lists every shipped task skill, `reference-loop` included, a test derives the list from `method/skills/`, and the `.lytos/` copy is identical — verify: auto
- [x] The test fails on a stale count or a missing skill name (negative cases) — verify: auto

## Evidence

The test was red on the unchanged texts (3 failures: the list, and the count in English and in French) and is green with the fix.
