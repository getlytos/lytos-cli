---
id: ISS-0133
title: The audit prompt hands every issue the whole sprint's diff
type: fix
priority: P1-high
effort: S
complexity: standard
domain: [cli]
skill: 
skills_aux: []
status: 4-review
branch: fix/ISS-0133-audit-diff-scoped-to-the-issue
depends: []
created: 2026-08-12
updated: 2026-08-12
schema_version: 2
risk: medium
assignee: fredericgalline
started_at: 2026-08-12
---
# ISS-0133 — Four auditors read the same 68 commits and guessed which findings belonged to whom

## Context — measured, not suspected

`lyt review --all --export` was run on the four issues sitting in `4-review` on 2026-08-12. It
produced four prompt files of **~350 KB each**, against ~40 KB for the exports of April. Each
contains an `## 7 — Implementation diff` section of **7113 lines**, and all four are the same
content: the entire loop-B sprint, 68 commits.

The cause is one line — [`review.ts:141`](../../../src/lib/review.ts#L141):

```
git diff main...${diffRef}      // diffRef = the fiche's `branch:` field
```

All four fiches declare the same branch, `claude/claude-loops-lytos-wtkc94`, so all four resolve to
the identical command. ISS-0095 fixed the previous version of this bug — *audit the branch the
fiche declares, not the tree your session opened on*. The problem simply moved up a level: the
branch is no longer a proxy for the issue.

**Why it stopped being one:** cloud sessions get **one branch per session, not per issue** — the
platform enforces it, and `CLAUDE.md` documents it as an accepted exception. A dozen issues share
a branch. `branch:` still answers "where does this work live"; it no longer answers "what did this
issue change".

**This already corrupted an audit, which is the part that matters.** The 2026-08-12 round reported
the missing `secrets-scan` baseline gate as a `[CRITICAL]` on **both** ISS-0107 and ISS-0114. That
looked like an amusing coincidence when it was found. It was not: both auditors were reading the
same diff and had no way to tell which issue owned the defect. The cost is not only ~360 k tokens
for four near-identical prompts — it is that we paid for four audits and got one, blurred.

## Ready

- **Scope** — scope the exported diff to the issue rather than the branch, and stop the export
  writing tracked artefacts into the repo.
- **Constraints** — must degrade safely: an issue whose commits cannot be found still produces a
  usable prompt, with the fallback stated in the prompt so the auditor knows what it is looking at.
  Never produce a silently empty diff — an auditor handed nothing will approve nothing, or worse,
  approve everything. The prompt keeps naming the declared branch: the auditor still needs to know
  where to run the tests.
- **Out of scope** — extracting the prompt template out of `review.ts` (**ISS-0068** owns that; it
  is a file-size concern, not a scoping one). Changing what the audit *asks* for. Making `branch:`
  per-issue — that fights the platform and the exception is already documented.
- `risk: medium` — it changes what every future auditor sees. A wrong scoping that silently drops
  commits would make audits pass on unread code, which is worse than the current noise.

## The gesture

**1. Scope the diff by `Refs:`, not by branch range.** Every commit carries `Refs: ISS-XXXX` — a
project rule, and **183 of the last 200 commits** honour it. So the issue's diff is the set of
commits that reference it:

```
git log --all --no-merges --reverse --grep="Refs: <ID>" -p
```

`--reverse` so it reads chronologically, as the story of the work. Commit messages come along with
the patches, which is a gain over a squashed range: the intent is next to the change.

`--all` rather than `main..<branch>` for a reason this very board proves — the four fiches declare
the `claude/…` branch while their fixes were committed on `chore/ISS-0126-…`. A range scoped to
the declared branch would have missed every one of them.

**2. Fall back loudly.** No matching commit — an old issue predating the convention, or one of the
9 % without a trailer — falls back to today's `git diff main...<ref>`, and the prompt says so in
the diff section: *"no commit references this issue; showing the whole branch — treat the scoping
as unreliable."*

**3. Take `.lytos/review/` out of git.** The exports are derived artefacts, regenerable by one
command, and they are being committed: the two frozen April prompts (40 KB and 29 KB) are tracked
today and produce **6 of the 6 errors `lyt doctor` reports on this repo** — stale links inside
frozen snapshots that were never meant to be read as live documents. The batch export just added
1.4 MB more. Same reasoning as `BOARD.md` (ADR-0002) and the existing `.runtime/` entry: gitignore
it here and in the shipped `method/.gitignore`, drop the tracked copies, and have `lyt doctor` skip
the directory so regenerating prompts never reintroduces the noise.

## Definition of done

- [x] The exported diff contains only the commits that reference the issue — verify: auto
- [x] Diffs for two different issues on the same branch are different — the regression that would have caught this — verify: auto
- [x] An issue with no referencing commit falls back to the branch diff, and the prompt states that the scoping is unreliable — verify: auto
- [x] The prompt still names the declared branch and where to run the checks — verify: auto
- [x] `.lytos/review/` is gitignored here and in `method/.gitignore`; the tracked exports are removed — verify: auto
- [x] `lyt doctor` skips `review/` and reports no finding from it — verify: auto
- [x] Re-exported prompts are materially smaller than the 350 KB measured on 2026-08-12 — verify: auto
- [x] Tests: scoped diff, two issues on one branch, the no-commit fallback — verify: auto
- [ ] Read one re-exported prompt end to end: does an auditor now see this issue's work and nothing else — verify: human

## Notes

- Field origin: 2026-08-12, running `lyt review --all --export` on the four issues returned to
  review. The defect was invisible until the byte sizes were compared — 350 KB against 40 KB — and
  it had already produced a misattributed finding two rounds earlier.
- The `Refs:` trailer stops being a bookkeeping convention here and becomes load-bearing: it is
  what makes a per-issue diff computable at all. Worth stating in the rules, where it is currently
  justified only as traceability.
- Known noise, deliberately not filtered: a batch commit such as
  `chore(board): promote the nine audited issues to 5-done` carries a `Refs:` for each issue and
  will appear in all of their diffs. Filtering on "does this commit touch code" is possible and is
  not worth the complexity until it actually bothers an auditor.
- Do not regenerate the four prompts before this lands. Auditing on the current export reproduces
  the misattribution it caused, at full token price.

## Implementation note — 2026-08-12

**Measured before and after, on this repo's own four pending issues:**

| | before | after |
|---|---|---|
| prompt size | ~350 KB × 4 | 117 KB and 131 KB |
| diff section | 7113 lines, **identical for all four** | 1766 and 1925 lines, **different per issue** |
| `lyt doctor` errors | 6 | 0 |
| health score | 5 % | 65 % |

`tryScopedDiff` runs `git log --all --no-merges --reverse --grep="Refs: <ID>" -p`. Two choices
worth recording:

- **`--all`, not `main..<declared branch>`.** This board is the counter-example that decided it:
  the four fiches declare `claude/claude-loops-lytos-wtkc94` while their fixes were committed on
  `chore/ISS-0126-…`. A range scoped to the declared branch would have shown the auditor the
  original implementation and hidden every correction made in response to its own findings.
- **Commit messages travel with the patches.** `git log -p` is not a squashed range: the auditor
  reads the intent next to the change, in order. Checked on ISS-0115 — the export now contains
  exactly its six commits, from the original implementation through today's fix.

The predicted batch-commit noise is real and visible: `chore(board): the four audited issues are
pending re-audit` carries a `Refs:` for each of the four and appears in all of their diffs. Left
as is, per the issue's own note — filtering on "does this commit touch code" is not worth the
complexity until an auditor complains.

**The fallback is deliberately loud.** No matching commit produces a `⚠️ Scoping unreliable`
banner naming what the diff actually is. An auditor handed an unscoped diff without being told
attributes findings at random, which is the failure this issue exists to end — a silent fallback
would have reproduced it with better ergonomics.

`GENERATED_DIRS` in `doctor.ts` is one entry (`review`). It is a set rather than a string so the
next generated directory does not require touching the walk.

Tests 348 → 350; typecheck and eslint clean; `lyt doctor` reports no error on this repo for the
first time in the session.
