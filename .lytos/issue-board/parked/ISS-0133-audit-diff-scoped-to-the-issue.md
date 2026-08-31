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
status: parked
branch: fix/ISS-0133-audit-diff-scoped-to-the-issue
depends: []
created: 2026-08-12
updated: 2026-08-31
schema_version: 2
risk: medium
assignee: fredericgalline
started_at: 2026-08-12
review: no-go
review_at: 2026-08-31
reviewer: fredericgalline
ai_reviewer:
  model: gpt-5
  session: codex-api
  prompt_ref: skills/code-review/SKILL.md
park_reason: external-blocker
parked_at: 2026-08-31
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

## Audit — 2026-08-31

**Verdict:** NO_GO

### Checks
- [x] Tests pass (350)
- [ ] Machine-verifiable DoD items (`verify: auto`) complete
- [ ] Rules respected
- [x] Documentation aligned

### Notes
[CRITICAL] `src/lib/review.ts:168-203` collects matching commits from every ref, but
`src/lib/review.ts:205-217` still commands the auditor to run all checks on the declared branch.
Those can be different trees. The four packets this issue was created to repair demonstrate it:
their correction commits (`4dba6cc`, `5ae3e05`, `c60e9d1`) appear in the exported diffs but are
not reachable from `claude/claude-loops-lytos-wtkc94`; running the gates there reproduces the old
defects. An auditor can therefore read fixed patches and test stale code, making the packet
internally contradictory.

[CRITICAL] `src/lib/review.ts:208-214` interpolates the unvalidated `branch:` value into shell
commands that the prompt explicitly tells an auditor to execute. Git accepts branch names with a
semicolon, and `issue-ops.ts` already provides `isValidBranchName()` for the prior command-
injection fix, but review does not use it. A crafted fiche can inject a second shell command into
the generated audit instructions.

The mandatory medium-risk gates are red: `npm run format:check` fails on 51 source files and
`npm audit --audit-level=high` reports five high-severity vulnerabilities. The remaining
`verify: human` read-through is not the reason for this verdict.

### To fix before next review
- [x] Make the diff source and the tree used for checks identical, or state and verify an explicit integration ref that contains every selected commit.
- [x] Validate or safely shell-quote the declared branch before embedding it in executable prompt instructions; add a malicious-branch regression.
- [ ] Make the mandatory format and dependency-audit gates green. — *not mine to make green; ISS-0132 owns it and is blocked on PR #29, argued below*

## Response to audit — 2026-08-31

**Both [CRITICAL] findings accepted and fixed.** They were one defect wearing two faces: the
export answers *"which commits belong to this issue"* by searching every ref, and answers *"where
do I run the tests"* by reading `branch:` — two questions, two sources, never reconciled.

### The diff and the tree are now cross-checked

`auditTarget()` (`src/lib/review.ts`) resolves the SHAs of the commits the diff will carry and
tests each one against the declared branch with `git merge-base --is-ancestor`. Three outcomes,
and the prompt renders a different `**Where to audit:**` paragraph for each:

- **contained** — unchanged behaviour, the plain checkout instruction ISS-0095 introduced.
- **diverged** — the prompt says the declared branch does not contain the exported commits, names
  the missing ones, states plainly that auditing there would make the packet contradict itself,
  and offers the ref that *does* contain them all (intersection of `git branch -a --contains`).
  When no ref contains them, it says so and tells the auditor to run the checks nowhere.
- **unsafe** — below.

Verified against the case that produced the finding. The four loop-B fiches now resolve to
`diverged`, missing exactly `4dba6cc` / `5ae3e05` / `c60e9d1` — the three correction commits the
auditor found in the patches but not in the tree — and the tool proposes
`chore/ISS-0126-translate-live-fiches-to-english` on its own. It reproduces the audit's reasoning
from the data, which is the strongest evidence I can offer that the check is the right one.

### The branch name no longer reaches a shell fence

`isValidBranchName()` was already in `issue-ops.ts`, added for the prior injection fix; review
simply never called it. It does now, and the failure mode is *withholding*, not escaping: an
invalid `branch:` is dropped from every command in the prompt, the audit falls back to the current
tree, and the auditor is told to report the malformed field. `safeBranch` also replaces
`declaredBranch` in the section 7 fallback, the other place the raw value was interpolated.

**The regression is narrower than "the string must not appear", and deliberately so.** The value
*does* still appear — section 6 quotes the fiche verbatim, and it must: the auditor cannot report a
malformed field they cannot see. What must never happen is the prompt turning that data into an
instruction. The test extracts every ```bash fence from the generated prompt and asserts none
carries the payload. Writing the naive assertion first is what surfaced the distinction.

Three cases added to `tests/commands/review.test.ts` (diverged, contained, unsafe): **353 tests**,
up from 350. Typecheck and ESLint clean.

### The third item is not this issue's to close

The audit is right that `format:check` (51 files) and `npm audit` (5 high) are red, and right that
they are mandatory at `risk: medium`. But **ISS-0132 already owns both**, and it carries a hard
self-imposed constraint: *"after PR #29 has landed, never before"*. PR #29 is still open — 72
files, 21 of them in `src/`. Sweeping now would force that PR through a wall of pure-whitespace
conflicts, and it would bury this issue's own two-file diff under 51 reformatted files: the exact
misattribution ISS-0133 exists to prevent, committed by the fix for it.

So the item stays unticked here, on purpose, and its truth is recorded rather than traded away.
`npm audit fix` is not blocked by #29 and goes to ISS-0132 alongside the sweep.

## Audit — 2026-08-31 (re-review)

**Verdict:** NO_GO

### Checks
- [x] Tests pass (353)
- [ ] Machine-verifiable DoD items (`verify: auto`) complete
- [ ] Rules respected
- [x] Documentation aligned

### Notes
[CRITICAL] `src/lib/review.ts:209-219` prefers the local branch over its remote-tracking ref,
while the generated instructions tell a fresh auditor to run `git fetch origin` and audit that
branch. In the current repository the local `fix/ISS-0133-audit-diff-scoped-to-the-issue` is at
`1f80ea7`, but `origin/fix/ISS-0133-audit-diff-scoped-to-the-issue` is still at `d718db9` and does
not contain correction commit `658ab48`. `auditTarget()` nevertheless returns `contained`, so the
exported packet again tells a fresh auditor to retrieve and test a tree that lacks the fixes they
are reading. The cross-check must use the ref an auditor can actually retrieve, or explicitly
declare a local-only audit target.

[WARNING] `src/lib/review.ts:223-242` may return a remote-tracking candidate such as
`origin/feature/x`, but `renderWhereToAudit()` renders it as `git fetch origin origin/feature/x`.
That asks the remote for a branch literally named `origin/feature/x` and fails. Normalize remote
candidates for the fetch command, while retaining the remote-tracking ref for checkout.

The mandatory medium-risk gates remain red: `npm run format:check` fails on 51 source files and
`npm audit --audit-level=high` still reports five high-severity vulnerabilities. Tracking them in
ISS-0132 explains the sequencing but does not make the mandatory gates pass or waive them for this
issue.

### To fix before next review
- [x] Cross-check against the remote-retrievable audit ref (and add a stale-local / fresh-origin plus fresh-local / stale-origin regression).
- [x] Render remote-tracking candidates with a valid fetch/checkout sequence.
- [ ] Make the mandatory format and dependency-audit gates green, or add and apply an explicit, auditable waiver mechanism. — *`deps-audit` is green: **ISS-0136** rebound it to what the package ships. `format` stays red behind ISS-0132, itself blocked on PR #29; the waiver mechanism is **ISS-0137**. This fiche is parked `external-blocker` rather than spending a fourth audit round on a known answer.*

## Response to re-review — 2026-08-31

**The [CRITICAL] is the sharpest possible instance of this issue's own thesis, and I committed
it.** ISS-0133 exists because the export answered *"which commits"* and *"which tree"* from two
sources that had silently diverged. I wrote `auditTarget()` to reconcile them — and pointed it at
the **local** ref while the prompt it feeds tells the auditor to `git fetch origin`. Same defect,
one level up, inside the fix for it.

The concrete proof is this repository: local `fix/ISS-0133-…` was at `1f80ea7`, origin at
`d718db9`, and `auditTarget()` returned `contained`. It waved through a packet that sent a fresh
clone to a tree without `658ab48`.

`origin/<branch>` is now the audit ref whenever origin has it; the local branch is no longer
evidence of anything. Three outcomes where there were two:

- **contained** — the retrievable ref carries every exported commit. The checkout block now targets
  `origin/<branch>`, the thing just fetched, so a stale local copy cannot be audited by accident.
- **unpushed** — local has them, origin does not. Deliberately its own state and not `diverged`:
  the fiche is not lying about where the work lives, the work simply never left the machine. The
  remedy is one command by the implementer, so the prompt says *do not run the checks* and names
  it, rather than sending the auditor hunting for a better branch.
- **diverged** — unchanged.

Verified on this repo: `auditTarget()` now returns `unpushed` for ISS-0133 itself, naming
`658ab48`. The check catches its own author.

**The [WARNING] was a plain rendering bug.** `git branch -a` lists `chore/x` and `origin/chore/x`
as two entries for one branch; I passed the second to `git fetch origin` and produced
`git fetch origin origin/chore/x`, a request for a branch of that literal name. Candidates are now
deduplicated to short names carrying an `onOrigin` flag, and `checkoutBlock()` puts the prefix
where it belongs — `git fetch origin <name>` then `git worktree add … origin/<name>`. A local-only
candidate gets no fetch line at all and an explicit warning that a fresh clone cannot reach it.

Three regressions, both directions of the skew: local-ahead/origin-behind must refuse the audit,
origin-ahead/local-behind must accept it (proving origin is read, not local), and a remote-only
candidate must render a fetchable name. **356 tests**, up from 353.

### The third item is escalated, not deferred

The auditor is right that pointing at ISS-0132 "explains the sequencing but does not make the
mandatory gates pass or waive them", and right to ask for a waiver mechanism rather than a
promise. I am not inventing one inside this issue — a waiver format is a change to the quality kit
contract, which is ISS-0107's and ISS-0114's territory, and inventing it here would be the
over-engineering the matrix exists to prevent.

One fact that should inform whoever decides. `npm audit --audit-level=high` reports 5 high, and
**all five are dev-only transitives**: eslint→js-yaml, tsup→postcss→nanoid, vitest→vite/esbuild.
The package publishes `files: ["dist"]` — a bundle whose only runtime dependency is `commander`.
`npm audit --omit=dev --audit-level=high` returns **0 vulnerabilities**. The gate as written is red
on code that cannot reach a user of `lytos-cli`, and `npm audit fix` would pull vite 7 (rolldown,
lightningcss) to fix an exposure that does not exist.

That is the same shape as ISS-0132's argument about `format`, applied to a second gate: a gate
that is permanently red teaches that red is survivable. Two honest exits — correct the tool binding
to `--omit=dev`, or accept the toolchain bump — and both are the human's call, which is why this
item is escalated rather than ticked.
