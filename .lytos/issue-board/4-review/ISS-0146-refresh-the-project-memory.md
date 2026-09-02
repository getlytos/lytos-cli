---
id: ISS-0146
title: "The project memory still says "Sprint #01 in progress" — five months of learning went unrecorded"
type: chore
priority: P2-normal
effort: S
complexity: standard
domain: [method, docs]
skill: 
skills_aux: []
status: 4-review
branch: chore/ISS-0146-refresh-the-project-memory
depends: []
created: 2026-09-02
schema_version: 2
risk: low
updated: 2026-09-02
---
# ISS-0146 — The one thing capping the health score is the one meant to carry what we learned

## Context — measured

`lyt doctor` reports **7 warnings and 0 errors**, and all seven are the same: every file under
`memory/cortex/` is untouched since 2026-04-13. They are the entire gap between 65% and a clean
board.

The content is worse than the dates suggest:

| File | State |
|---|---|
| `architecture.md` | three real entries, all from the first day |
| `bugs.md`, `patterns.md`, `sprints.md` | **empty templates** — a comment block explaining the entry format, and nothing else |
| `backend.md`, `frontend.md`, `business.md` | empty templates for a shape this project does not have, and **not even indexed** in `MEMORY.md` |

`MEMORY.md`'s living summary reads *"Sprint #01 in progress — implementing `lytos init` and
`lytos board`"*. Since then: 1.5.1 published with provenance, the governed loop, the quality kit,
the risk matrix, the Definition of Ready, the derived journal, eight ADRs. An agent reading this
memory at session start is told the project is three commands old.

The point of `memory/` (LYTOS.md) is that a session opens with what was learned rather than
rediscovering it. Five months of hard-won lessons — three of them found *twice each* — live only
in closed fiches nobody loads.

## Ready

- **Scope** — delete the three unindexed templates that do not apply to a CLI; fill `bugs.md`,
  `patterns.md` and `sprints.md` with what the closed work actually established; bring
  `architecture.md` up to date; rewrite `MEMORY.md`'s index and living summary.
- **Constraints** — memory is loaded every session, so it must earn its tokens: what belongs here
  is what an agent needs *before* reading code, and what is not already recorded elsewhere. ADRs
  are pointed at, never restated. No change to any code or to the board.
- **Out of scope** — the staleness check itself (mtime-based, so a fresh clone resets it — a real
  weakness, and a separate issue), and the method's memory templates in `method/`.
- `risk: low` — documentation only; nothing ships, nothing executes.

## Definition of done

- [x] `backend.md`, `frontend.md` and `business.md` are gone, and `MEMORY.md` no longer implies they exist — verify: auto
- [x] `bugs.md`, `patterns.md` and `sprints.md` each carry real entries drawn from closed work — verify: auto
- [x] `architecture.md` covers the decisions taken since April, pointing at the ADRs rather than restating them — verify: auto
- [x] `MEMORY.md`'s living summary describes the project as it is today — verify: auto
- [x] `lyt doctor` reports 0 stale-memory warnings — verify: auto
- [ ] Is this the memory you would want an agent to open a session on — verify: human

## Notes

- The staleness signal is `mtime`, which `git clone` resets — so this warning is visible only to
  whoever holds an old working copy, and never on CI. Worth its own issue; recorded in `bugs.md`
  so it is not rediscovered.

## Delivered — 2026-09-02

`lyt doctor`: **100%, 0 errors, 0 warnings**, 405 files checked. It was 65% with seven warnings,
all of them here.

Three files deleted — `backend.md`, `frontend.md`, `business.md`. Empty templates for a shape this
project does not have, and not indexed by `MEMORY.md`, so nothing pointed at them. A CLI has no
client side and no business domain; keeping the headings would have invited someone to fill them.

Three files written from what the closed work established, rather than from what the templates
suggested:

- **`bugs.md`** — led by the one that keeps coming back: three checkers, in two days, each reading
  prose as data, each written by someone who knew about the previous one. Then the two frontmatter
  fields that rot (`verify:` markers that must be terminal, `branch:` that is stale the moment a
  second branch exists), npm's 404-where-you-expect-401, the `setup-node` `_authToken` trap, the
  suite's flakiness under parallel load, and the two derived artifacts that look like bugs when
  they are stale.
- **`patterns.md`** — the eight that actually hold here, each with where it is applied and why it
  works. "A rule with no `tool` binding is a wish." "A gate nothing executes is not a gate." The
  flagging asymmetry that keeps a signal from becoming wallpaper. Proportionality as a threshold
  rather than an adjective. Verify by parsing, not by reading.
- **`sprints.md`** — the six sprints, and what the 2026-08-31 audit round actually taught: not one
  of the four NO_GO verdicts was a classic bug. All four were promises the code displayed and did
  not keep.

`architecture.md` keeps its three original entries — they are still true, and one of them
(no YAML dependency) nearly broke under schema v2, which is worth knowing. Added: the ADR map with
what each changes about the code and its status, the three section-scoping helpers a new checker
must reuse instead of re-deriving, and how the OIDC release path works with the warning not to add
a token back.

`MEMORY.md` said *"Sprint #01 in progress — implementing `lytos init` and `lytos board`"*. It now
says what the project is.

Two judgment calls worth naming. Memory is loaded every session, so it has to earn its tokens:
ADRs are **pointed at, never restated**, and nothing here duplicates what `lyt help` or the code
already says. And the entries are written as what an agent needs *before* reading code — a
checker's author needs to know `dodSection()` exists more than they need the history of why.

The remaining item is yours: whether this is the memory you would want a session to open on.
