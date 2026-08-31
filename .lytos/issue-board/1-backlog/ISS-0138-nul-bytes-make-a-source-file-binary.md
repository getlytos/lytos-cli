---
id: ISS-0138
title: "Three raw NUL bytes make a source file undiffable"
type: fix
priority: P3-low
effort: XS
complexity: light
domain: [cli]
skill: ""
skills_aux: []
status: 1-backlog
branch: ""
depends: []
created: 2026-08-31
updated: 2026-08-31
schema_version: 2
risk: low
---

# ISS-0138 — Git calls `merge-issue.ts` binary, so nobody can review it

## What to do

`src/lib/merge-issue.ts` embeds **literal NUL bytes** in three template literals — the
duplicate-heading separator at `src/lib/merge-issue.ts:176` and two more. The byte is written
directly into the source instead of the `\0` escape that means the same thing at runtime.

Git classifies any file containing a NUL as binary. The consequences are all review consequences:

- `git diff` shows `Bin 11423 -> 11719 bytes` instead of a patch. **This file cannot be reviewed
  in a diff, on GitHub or locally.**
- `grep` suppresses matches unless you pass `-a`, so a search for a symbol in this file silently
  returns nothing — the failure mode is a false negative, which is the bad kind.
- It is the one file in `src/` for which `lyt review`'s exported packet carries no readable patch.

Replacing the raw byte with `\0` produces an **identical string at runtime** — same separator,
same behaviour — and makes the file text again.

## Relevant files

- `src/lib/merge-issue.ts` — three occurrences

## Ready

- **Out of scope** — changing the separator itself. NUL is a good choice for a delimiter that must
  never occur in markdown; this issue is about how it is *written*, not what it is. Also out of
  scope: auditing other files for the same problem beyond a one-line grep.
- `risk: low` — the compiled output is byte-identical; the DoD below is machine-verifiable.

## Definition of done

- [ ] The three literals use `\0`; `file src/lib/merge-issue.ts` no longer reports `data` — verify: auto
- [ ] `git diff` renders the file as text — verify: auto
- [ ] The merge-driver tests pass unchanged, and the section keys are byte-identical to before — verify: auto
- [ ] A grep across `src/` confirms no other source file contains a raw NUL — verify: auto

## Notes

- Field origin: 2026-08-31, surfaced by the ISS-0132 prettier sweep — it was the single file whose
  stat line read `Bin` instead of `+/-` counts. **It predates the sweep**: the same bytes sit in
  the pre-sweep commit at lines 157, 217 and 223.
- Worth noticing that it went unseen for months precisely *because* it is unreviewable: the defect
  hides itself from the tool you would use to find it.
