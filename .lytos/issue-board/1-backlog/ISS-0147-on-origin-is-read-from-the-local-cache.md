---
id: ISS-0147
title: "`onOrigin` is read from the local cache, not from origin — and it drifts both ways"
type: fix
priority: P1-high
effort: S
complexity: standard
domain: [cli, git]
skill: 
skills_aux: []
status: 1-backlog
branch: 
depends: []
created: 2026-09-05
schema_version: 2
risk: medium
---

# ISS-0147 — Ask origin, don't ask the cache

## Context — measured, and expensive

On `ubeez-ai-contract`, ISS-0007 was refused **three times in a row** on delivery
traceability while its code was green throughout — 413 tests, 1 238 assertions,
Playground benches passing on WordPress 7.0.4 and 7.1 at every round.

| round | refused because | what it actually was |
|---|---|---|
| 1 | declared branch absent from `origin` | true, and fixed by pushing |
| 2 | a review commit is not an ancestor of the delivery branch | the PR was **squash-merged**: a squash rewrites SHAs, so the original commit is an ancestor of nothing, by construction |
| 3 | the duplicate branch "still exists on `origin`" | it did not — `git ls-remote --heads origin <branch>` returned **zero lines**. The SHA survived only as `refs/pull/96/head` |

Round 3's own audit text cites the command that disproves it. The verdict was
later corrected to GO, unchanged code.

## The defect

`checkDeclaredBranch()` resolves `onOrigin` from a **local cache**:

```ts
// src/lib/review.ts:145-152
execFileSync("git", ["rev-parse", "--verify", `refs/remotes/origin/${branch}`], …)
```

`refs/remotes/origin/*` is a snapshot of the last fetch, not the remote. It drifts
**both ways**, and each direction produces a different wrong verdict:

- **Stale after a remote delete.** The branch is gone from `origin`; the tracking
  ref survives until someone runs `git fetch --prune`. `onOrigin` reads `true`,
  and the audit reports a delivery that a fresh clone cannot reach. This is what
  produced round 3.
- **Missing before a fetch.** A branch pushed from another machine, another
  session, or a cloud run is absent from this clone's cache. `onOrigin` reads
  `false`, and the doc comment's verdict — *"a lying fiche"* — is pronounced on a
  fiche telling the truth.

`refsContainingAll()` (`src/lib/review.ts:305-320`) has the same root: `git branch
-a --contains` reads that same cache to decide which refs an auditor can fetch.

## `refs/pull/*` — the second half

`git branch -a` does not list `refs/pull/*`, so the tool itself is not misled by
them. The **auditor** is: told to establish whether a branch is on `origin`, a
reviewer who runs `git ls-remote origin` without `--heads` gets every pull ref
back. GitHub creates one per pull request and keeps it **forever** — open, closed
or merged. Deleting the branch does not remove it; the repository owner cannot
remove it at all, since GitHub offers no way to delete a pull request.

So any issue that has ever had a closed PR carries a permanently discoverable
second SHA. If the check counts those, it refuses that issue for the life of the
repository, and no action on the repository can satisfy it.

## Proposed solution

Ask the remote, and ask it for heads only:

```
git ls-remote --heads origin <branch>
```

Zero lines means absent; one line means present, with the sha. `--heads` also
answers the second half for free: it never returns `refs/pull/*`, `refs/tags/*`,
or a project's own backup namespace.

Two consequences to weigh rather than assume:

- **It is a network call.** `checkDeclaredBranch()` runs on export, where a hang
  is worse than a wrong answer. It needs a timeout and a third state — the
  `"unknown"` the type already carries — rather than a failure that reads as
  "absent". Offline must not become "the fiche is lying".
- **The audit prompt should say it too.** The reviewer is a fresh session that
  runs its own commands; if the prompt asks it to verify delivery refs, it should
  name `--heads` and say that `refs/pull/*` is not a branch. Round 3 shows the
  reviewer reaching a confident wrong conclusion with the right command one flag
  away.

## Definition of done

- [ ] `onOrigin` is established from `git ls-remote --heads origin <branch>`, not from `refs/remotes/*` — verify: auto
- [ ] A branch deleted on `origin` but still in the local cache reads **absent** — seen red without the fix — verify: auto
- [ ] A branch present on `origin` but never fetched locally reads **present** — seen red without the fix — verify: auto
- [ ] `refs/pull/*`, tags, and non-`heads` namespaces are never counted as a delivery ref — verify: auto
- [ ] No network, a timeout, or no `origin` yields `"unknown"` and emits no warning — never "absent" — verify: auto
- [ ] The export path stays bounded: the added call cannot hang `lyt review` — verify: auto
- [ ] The audit prompt tells the reviewer which refs count, and that a pull ref is not a branch — verify: human

## Notes

The `refs/remotes/*` reading is not careless — it is fast, offline, and right most
of the time. What makes it costly is **where** it is used: a verdict handed to a
human or a model that will not question it. A check that is usually right and
occasionally confidently wrong burns more time than one that admits it does not
know.

Three review cycles were spent on this one. The code under review never changed.
