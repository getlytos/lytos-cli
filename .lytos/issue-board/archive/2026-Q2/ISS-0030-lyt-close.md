---
id: ISS-0030
title: Implement lyt close — automate the mandatory close phase
type: feat
priority: P1-high
effort: M
complexity: standard
skill: code-structure
skills_aux: [testing]
status: 5-done
branch: feat/ISS-0030-lyt-close
depends: [ISS-0029]
created: 2026-04-16
updated: 2026-04-16
---
# ISS-0030 — Implement `lyt close` — automate the mandatory close phase

## Context

The mandatory close phase requires moving the issue file, updating frontmatter, and regenerating the board. Like the start phase, manual steps create friction and risk of incomplete closure.

## What to do

`lyt close ISS-XXXX` performs the full close phase:

1. Find the issue file (should be in `3-in-progress/` or `4-review/`)
2. Move it to `5-done/`
3. Update frontmatter: `status: 5-done`, `updated: today`
4. Regenerate BOARD.md
5. Display confirmation with final issue summary

## Edge cases

- Issue not in-progress or review → error: "can only close issues that are in-progress or in review"
- Issue already done → warn and do nothing
- Issue in backlog/sprint → error: "cannot close an issue that hasn't been started"
- Unchecked checklist items → warn: "N items unchecked — close anyway? (use --force to skip)"

## Definition of done

- [ ] `lyt close ISS-XXXX` moves issue, updates frontmatter, regenerates board
- [ ] Warns about unchecked checklist items (with --force to override)
- [ ] Displays confirmation with final summary
- [ ] Handles edge cases: already done, not started, unchecked items
- [ ] `--json` flag for machine-readable output
- [ ] Integration tests covering: normal close, already done, not started, unchecked items with --force
