---
id: ISS-0190
title: "`lyt start` builds a branch name its own commit hook refuses"
type: fix
priority: P2-normal
effort: S
complexity: standard
skill: ""
skills_aux: []
status: 1-backlog
branch: ""
depends: []
related: [ISS-0181]
parent: ISS-0181
created: 2026-11-20
schema_version: 2
risk: medium
---

# ISS-0190 — `lyt start` builds a branch name its own commit hook refuses

## Context

Found on the first real adoption of 1.7 in another project. `lyt start ISS-0557` on a card with `type: feature` created the branch `feature/ISS-0557-affichage-de-la-tva-selon-le-r-gime-de-l`, and the very next commit was refused by the hook `lyt` installs: "Branch doesn't follow Lytos naming convention", because the hook accepts only `feat|fix|refactor|chore|docs|test|style|perf`. Two causes in `buildBranchName` (`src/commands/start.ts`):

1. The branch prefix is the card's `type` as written, except for `epic` and `spike`. Any other type that the hook does not list (`feature`, `bug`, `task`, `doc`…) gives a branch the hook refuses. `lyt lint` does not check `type`, so nothing warns beforehand.
2. The slug keeps only `[a-z0-9]`, so an accented letter becomes a hyphen (`régime` gives `r-gime`) and a cut at 40 characters can leave a trailing hyphen.

The card's `branch:` field also stayed empty after the start.

## Proposed solution

Map the usual synonyms to a hook type in one table (`feature` to `feat`, `bug` and `bugfix` to `fix`, `task` to `chore`, `doc` to `docs`, `tests` to `test`), and fall back to `chore` for a type the hook does not know, never the raw value. Normalize accents before slugging (NFD, strip combining marks), cut at 40 and trim a trailing hyphen. Record the branch in the card's `branch:`.

| Option | Build cost | Maintenance | Robustness |
|---|---|---|---|
| A. Map synonyms, fall back to `chore`, normalize the slug | low | one table | the branch always passes the hook |
| B. Make the hook accept any type | lowest | none | weakens the naming rule that the hook exists for |

Decision: **A**.

## Ready

- **Scope** — `buildBranchName`, its tests, the `branch:` write.
- **Out of scope** — a lint rule on `type`, new card types.
- **Solution** — a mapping table and a slug normalizer.
- `risk: medium`.

## Definition of done

- [ ] `feature`, `bug`, `task`, `doc` and an unknown type each give a branch the hook accepts — verify: auto
- [ ] A title with accented letters gives a readable slug with no stray hyphen, cut at 40 characters — verify: auto
- [ ] After `lyt start`, the card's `branch:` holds the branch that was created — verify: auto
- [ ] A test starts a card of each of those types in a temporary repository and makes a commit that the installed hook accepts — verify: auto
