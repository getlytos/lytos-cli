# Memory — Recurring Problems & Solutions

*Problems that come up often and how to solve them. Load this file before debugging or exploring a
path — the problem may already have been solved, twice.*

---

## The one that keeps coming back: a checker reads prose as data

**Three times in two days, in three different checkers, each written by someone who knew about the
previous one.** A fiche is prose *containing* code — it quotes syntax, shows bad paths, explains
what a marker looks like. Any checker scanning the raw text treats those examples as data, and
**writing about a thing creates it**.

| Checker | The false positive | Fix |
|---|---|---|
| `ready.ts` | a stray "out of scope" in a Note made an issue look ready | scope to the `## Ready` section |
| `pinnedGateRefs()` | quoting `verify: reviewer:x` in an audit response counted as pinning it | scope to `## Definition of done`, via `dodSection()` |
| `checkBrokenLinks()` | a link quoted as an example was checked as a link | strip fences and code spans, via `withoutCode()` |

**Takeaway before writing a new checker over fiche text**: scope to the section that *binds*, and
skip what is quoted. Both helpers already exist — reuse them rather than scanning `content`.

## `verify:` and `branch:` — the two frontmatter fields that rot

### A marker must be terminal

`- [x] … — verify: auto *(annotated)*` is **not** a marked item: the parser needs `verify: <mode>`
to end the line. An annotation goes *before* the marker. `lyt lint` catches it; it cost ISS-0141 a
full audit round.

### `branch:` is stale the moment a second branch exists

An issue's work legitimately spans branches — delivery, then audit response, then the fix to the
metadata itself, each on its own branch because the git-workflow rule asks for it. Five fiches
were returned in one audit round for this. `lyt review` scopes the *diff* by `Refs: ISS-XXXX`
across all refs, so the packet is right whatever the fiche says; what the field decides is where
the auditor is *sent*. Once everything is merged, `branch: main` is the honest value and the only
one that cannot rot again.

## npm answers 404 where you expect 401

`npm publish` to an existing package with a dead credential returns
`404 Not Found - PUT …`, not `401`. Seven consecutive release runs were misread as "package
missing" while the real cause was a token that had expired six days after being created. **Read a
publish 404 as an authentication failure first.**

Related, and just as silent: `actions/setup-node` writes
`//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}` into `.npmrc` whenever `registry-url` is
set. With trusted publishing and no token, that expands to an empty value, npm concludes auth is
configured and never performs the OIDC exchange. `release.yml` strips the line **and asserts its
absence** — the assertion fired on its very first run.

## The test suite is flaky under parallel load

Several suites drive real `git` in temporary directories. Three consecutive full runs on `main`
gave 1, 3 and 2 failures out of 393, in `pull-notes.test.ts`; in isolation, 8/8 green; CI green on
Node 20 and 22. **A local failure in a git-driving suite is not evidence of a regression — re-run
it in isolation before believing it.** Tracked as ISS-0086.

## `lyt doctor`'s stale-memory check is mtime-based

`git clone` resets mtime, so the warning is visible only to whoever holds an old working copy and
never fires on CI. The signal is real but local-only; do not read its absence as freshness.

## BOARD.md and JOURNAL.md are derived and per-branch

Both are gitignored and regenerated (`lyt board`, `lyt journal --write`) — ADR-0002. Two
consequences that look like bugs and are not:

- After switching branches or merging, a stale `BOARD.md` produces **broken-link errors** in
  `lyt doctor`. Regenerate before believing them.
- The board is a **per-branch state**: each PR carries its own fiche move, so an issue sits in
  `3-in-progress` on `main` and in `4-review` on its branch until the merge.
