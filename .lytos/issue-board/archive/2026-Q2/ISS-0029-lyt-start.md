---
id: ISS-0029
title: Implement lyt start — automate the mandatory start phase
type: feat
priority: P1-high
effort: M
complexity: standard
skill: code-structure
skills_aux: [testing]
status: 5-done
branch: feat/ISS-0029-lyt-start
depends: []
created: 2026-04-16
updated: 2026-04-16
---
# ISS-0029 — Implement `lyt start` — automate the mandatory start phase

## Context

The mandatory start phase requires 5 manual steps before coding: move issue file, update frontmatter, regenerate board, create git branch, verify status. This friction increases the risk of skipping steps (as happened on ISS-0009). One command should do it all.

## What to do

`lyt start ISS-XXXX` performs the full start phase:

1. Find the issue file on the board (any status except 5-done)
2. Move it to `3-in-progress/`
3. Update frontmatter: `status: 3-in-progress`
4. Regenerate BOARD.md
5. Create git branch `type/ISS-XXXX-slug` from current branch
6. Display the issue summary (`lyt show` style)

## Edge cases

- Issue already in-progress → warn and do nothing
- Issue in 5-done → error: "cannot start a done issue"
- Branch already exists → switch to it instead of creating
- Dirty working tree → warn but proceed (don't block)

## Definition of done

- [ ] `lyt start ISS-XXXX` moves issue, updates frontmatter, regenerates board, creates branch
- [ ] Displays issue summary after start (reuses show logic)
- [ ] Handles edge cases: already in-progress, done, existing branch
- [ ] `--json` flag for machine-readable output
- [ ] Integration tests covering: normal start, already in-progress, done issue, existing branch
