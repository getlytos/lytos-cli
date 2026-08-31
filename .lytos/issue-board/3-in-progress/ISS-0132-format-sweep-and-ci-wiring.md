---
id: ISS-0132
title: "Format sweep + wire the two unwired gates into CI — after PR #29 lands"
type: chore
priority: P2-normal
effort: S
complexity: standard
domain: [cli, ci]
skill: 
skills_aux: []
status: 3-in-progress
branch: chore/ISS-0132-format-sweep-and-ci-wiring
depends: [ISS-0107]
created: 2026-08-12
updated: 2026-08-31
schema_version: 2
risk: low
assignee: fredericgalline
started_at: 2026-08-31
---
# ISS-0132 — A gate that is permanently red trains the team to ignore red

## Context

ISS-0107 fixed the `format` gate's binding: it pointed at `npm run format -- --check` while the
script hardcodes `prettier --write`, so running the gate as prescribed **rewrote 51 files instead
of checking them**. It now points at a real `format:check` — and correctly **exits 1**. `src/` has
never been prettier-formatted, because the check had never once run.

The gate now tells the truth. Nobody has decided what to do about the truth.

Two related facts from the same pass:

- **Neither new gate runs in CI.** `.github/workflows/ci.yml` runs `lint`, `typecheck`, `build`
  and `test` — not `format:check`, and not the `secrets:scan` added by ISS-0107. Fixing the
  formatting without wiring the check puts the repo back in this state within months.
- **Timing is the whole decision.** A whole-codebase reformat rewrites the whitespace of every
  line. There are **2 open PRs**, one of which — #29, "Sprint loop-B" — is **72 files, +4661/−29,
  touching 21 files in `src/`**. Sweeping before it lands forces that PR through a wall of
  pure-whitespace conflicts: hours of rebase risk for zero value. Five smaller unmerged `fix/`
  branches will rebase without pain.

## Ready

- **Scope** — run the formatting sweep as one isolated commit, wire `format:check` and
  `secrets:scan` into CI, and neutralise the `git blame` damage.
- **Constraints** — **after PR #29 has landed**, never before. The sweep commit must contain
  *only* formatting: no logic change may ride along, so the diff stays reviewable by inspection
  (`npm test` green before and after, same test count).
- **Out of scope** — changing the Prettier configuration itself (line width, quotes). Formatting
  `tests/` — the glob is `src/**/*.ts` and widening it is a separate call. Any refactor found
  while reading the reformatted files: open an issue, do not fold it in.
- `risk: low` — no behaviour change; failure mode is merge friction, which is what the timing
  constraint exists to avoid.

## The constraint was satisfied a different way — 2026-08-31

**The timing constraint above rested on a premise that stopped being true.** It says *"after PR
#29 has landed, never before"*, because #29 is 72 files with 21 in `src/`, and sweeping first
would force it through a wall of pure-whitespace conflicts.

#29 has **not** landed. It did not have to: its head `349cd9e` is an **ancestor of the branch
carrying this sweep**. The loop-B work was continued in place — `claude/…wtkc94` →
`chore/ISS-0126-…` → `fix/ISS-0133-…` → this branch — so there is no second tree to conflict
with. Landing this branch lands #29's content.

The rest of the exposure, measured rather than assumed: **PR #28 touches 0 files in `src/`, PR #30
touches 2.** The fiche predicted "five smaller unmerged `fix/` branches will rebase without pain";
the reality is milder still.

So the first DoD item is restated to the condition the constraint actually protects — *the sweep
branch contains #29* — rather than its proxy. Ticking "PR #29 has landed" would have been false.

**What forced the question.** Three fiches were returned NO_GO in a row — ISS-0133 twice, ISS-0136
once — with no defect found in any of them, on this gate alone. `format` sits at
`low,medium,high`, so it blocks *every* issue at *every* risk tier: the board was fully
deadlocked. This fiche's own closing line — *"whichever branch is taken, it must be taken"* — came
due.

The tiering stays `low,medium,high`. Once the sweep lands and CI checks it, `format:check` costs a
second and cannot silently rot again; it was the absent sweep that hurt, not the tier.

## The gesture

1. Wait for **PR #29** to land. — *superseded above: the sweep branch contains it.*
2. `npm run format` as **one commit that does nothing else**.
3. Add its SHA to a `.git-blame-ignore-revs` file — GitHub honours it automatically, and locally
   `git blame --ignore-revs-file` does. Without it, the sweep poisons the blame of the whole
   codebase.
4. Add `format:check` and `secrets:scan` as CI steps.

## The alternative, which is legitimate

`format` is **not** part of the ADR-0007 baseline floor (`tests-unit`, `typecheck`, `lint`,
`secrets-scan`, `build-reproducible`, `doc-L0`). It is an addition this project made *above* the
floor, so this project may equally remove it.

If Prettier is not something we actually care to enforce here, the honest move is to **delete the
row from `.lytos/quality/kit.md`** — not to keep a gate that is red forever. A permanently red
gate is worse than no gate: it teaches everyone that red is survivable, which is the one lesson a
quality kit must never teach.

Whichever branch is taken, it must be taken. This issue is closed by a decision, not by drift.

## Definition of done

- [x] The sweep branch contains PR #29's head — the constraint's purpose, stated checkably — verify: auto
- [x] `npm run format:check` exits 0 — verify: auto
- [x] The sweep is a single commit containing only formatting changes; test count unchanged before and after — verify: auto
- [x] `.git-blame-ignore-revs` exists and names the sweep commit — verify: auto
- [x] `ci.yml` runs `format:check` and `secrets:scan` — verify: auto
- [ ] Or, if the alternative is chosen: the `format` row is removed from the kit and the reason recorded here *(not applicable — the sweep was chosen, so `format` stays in the kit at `low,medium,high`)* — verify: auto
- [ ] The other unmerged `fix/` branches rebase cleanly, or the conflicts are resolved — verify: human

## Notes

- Field origin: surfaced 2026-08-12 while running the ISS-0107 gates as prescribed — the "check"
  rewrote 51 files. See ISS-0107's response to audit for the full account.
- The deeper defect behind it is recorded in **ISS-0129**: nothing validates that a kit `tool`
  string is a *verifier*. `npm run format -- --check` was a non-empty string, so ISS-0107's
  empty-tool check would never have caught it.
- If #29 drags, do not let this sit. The alternative above is the fallback, and it is not a
  failure — it is proportionality applied to a gate the project added to itself.

## Delivered — 2026-08-31

Three commits, deliberately separate so the sweep stays reviewable by inspection:

1. `3b7c6f9` — the premise change above, `.lytos/` only.
2. `51b27ef` — `npm run format`, **51 files, all inside `src/`, nothing else in the commit**.
3. this one — `.git-blame-ignore-revs` and the CI wiring.

**Evidence the sweep changed no behaviour:** 356 tests passing before and 356 after, same count,
plus typecheck, lint and build green on both sides. `npm run format:check` exits 0.

`git diff -w` is *not* empty on the sweep, and that is expected rather than alarming: Prettier
reflows lines, and `-w` collapses whitespace *within* a line, not a line that was split or joined.
The test count is the check this fiche asked for, and it is the one that means something.

**The blame file is verified, not just written.** `git blame --ignore-revs-file
.git-blame-ignore-revs src/lib/ready.ts` attributes line 1 to `230ad0d1`, its original author,
instead of the sweep. The file carries a note that only provably formatting-free rewrites may be
listed — a wrong entry makes blame lie in the other direction.

CI now runs `format:check` before lint and `secrets:scan` before build, with a header comment
recording why: both were gates in the kit that executed nowhere, and `format` proved what that
costs — `src/` had never been formatted at all.

### One thing found while reading, not folded in

`src/lib/merge-issue.ts` contains **literal NUL bytes** — a raw byte written into a template
literal as a section-key separator, rather than a `\0` escape. Git classifies the file as binary
and will not diff it as text, which is how it surfaced (`Bin 11423 -> 11719 bytes` in the sweep's
stat). **It predates this sweep** — the same bytes are in the committed version at lines 157, 217
and 223. Out of scope here per this fiche's own instruction to open an issue rather than fold it
in; opened as ISS-0138.
