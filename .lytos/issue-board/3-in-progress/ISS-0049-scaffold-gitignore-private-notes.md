---
id: ISS-0049
title: "lyt init: ship a .lytos/.gitignore that protects 6-private-notes/ automatically"
type: feature
priority: P2-normal
effort: XS
complexity: light
skill: code-structure
skills_aux: [testing, documentation]
scope: lytos-cli
status: 3-in-progress
branch: "feat/ISS-0049-scaffold-gitignore"
depends: []
created: 2026-04-20
updated: 2026-04-21
---

# ISS-0049 — `lyt init`: scaffold a `.lytos/.gitignore` protecting `6-private-notes/`

## Context

The lytos-cli repo has a `.lytos/.gitignore` that correctly ignores everything in `6-private-notes/` except `.gitkeep`, so launch drafts, internal roadmap, and other not-for-public notes stay local. Fresh projects scaffolded by `lyt init` **don't** get this protection: there's no `.lytos/.gitignore` in the bundle, and the scaffolder never emits one.

The hazard: a user adopts Lytos, starts using `6-private-notes/` for their own drafts, runs `git add -A` at some point, and pushes private content to a public repo. We already know it would have happened to us if we hadn't caught it.

This issue closes that gap by making the protection automatic for every new Lytos project.

## Proposed solution

Two tiny changes:

1. **Ship the gitignore in the bundle**
   - Add `method/.gitignore` with:
     ```
     issue-board/6-private-notes/*
     !issue-board/6-private-notes/.gitkeep
     ```
   - Same content as the existing `.lytos/.gitignore` in this repo — parity guaranteed.

2. **Copy it during scaffold**
   - Add `{ remote: ".gitignore", local: ".gitignore" }` to `REMOTE_FILES` in `src/lib/scaffold.ts`.
   - This writes `.lytos/.gitignore` inside the user's project so protection is on from day one.

3. **Create the folder + `.gitkeep`**
   - Add `"issue-board/6-private-notes"` to the `dirs` array in `scaffold.ts`.
   - Add `6-private-notes` to the `kanbanDirs` array that generates `.gitkeep` files.
   - This way the folder exists from the start, the gitignore rule targets a real path, and the user can drop private notes in without any setup.

## Definition of done

- [x] `method/.gitignore` exists with the two-line rule
- [x] `lyt init` writes `.lytos/.gitignore` in the target project with the same content
- [x] `lyt init` creates `.lytos/issue-board/6-private-notes/.gitkeep`
- [x] Test: after `lyt init`, `.lytos/.gitignore` exists and contains `6-private-notes/*`
- [x] Test: `.gitkeep` sibling is created (the negation rule's target)
- [x] `lyt upgrade` pulls the latest version of this `.gitignore` along with other method files (added to `UPGRADEABLE_FILES` in `src/commands/upgrade.ts`)
- [ ] Doc: one-line note on the website `/method/issue-board` page — deferred, can be added on the next doc pass (not a blocker for the core protection)

## Relevant files

- `method/.gitignore` — new
- `src/lib/scaffold.ts` — add to `dirs`, `kanbanDirs`, `REMOTE_FILES`
- `src/commands/upgrade.ts` — add to `UPGRADEABLE_FILES`
- `tests/commands/init.test.ts` — add a gitignore-presence check
- Website `/method/issue-board` (EN + FR) — one-line mention

## Notes

- This protection is the kind of thing we should have shipped with the very first `lyt init`. The bug is that nothing leaked yet — not that nothing could have.
- No migration needed for users who already ran `lyt init` before this fix lands: `lyt upgrade` will pull the new `.gitignore` (and create the folder if missing).

## Review verdict — 2026-04-21

**NO_GO**

Pourquoi :

- Le scaffold initial est correct, mais `lyt upgrade` ne recrée pas `issue-board/6-private-notes/.gitkeep` pour les installs existantes.
- L'affirmation "and create the folder if missing" n'est donc pas vraie dans l'état actuel.

À reprendre :

- Étendre `lyt upgrade` pour recréer `issue-board/6-private-notes/` et son `.gitkeep` quand ils sont absents.
- Ajouter un test de régression dans `tests/commands/upgrade.test.ts` qui couvre un ancien projet sans `.lytos/.gitignore` ni `issue-board/6-private-notes/.gitkeep`.
- Revalider le scénario de migration, pas seulement le scaffold initial.

Décision :

- La carte repart en `in-progress`.
