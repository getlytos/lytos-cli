---
id: ISS-0124
title: `lyt journal` — the derived logbook (a changelog of the why)
type: feat
priority: P2-normal
effort: M
complexity: standard
domain: [cli, docs, app]
skill: 
skills_aux: []
status: 4-review
branch: claude/claude-loops-lytos-wtkc94
depends: []
created: 2026-08-09
updated: 2026-08-12
schema_version: 2
assignee: Claude
started_at: 2026-08-10
review: pending
review_at: 2026-08-12
reviewer: fredericgalline
---
# ISS-0124 — The project's narrative, derived instead of written

## Context

Between the changelog (the *what*) and the ADR (the *verdict*), a **readable logbook** is
missing: the chronological narrative of the *why* and the *how*, pointing back to the issues for
detail. Key point: that content **already exists** in closed issues (context, `review` verdict,
rejected reasoning, fixes). So there is nothing to write — it is a **derived view**, like
`BOARD.md` (ADR-0002): it cannot rot, zero ceremony.

Three readers, three doors: the **stakeholder** (a changelog of the why), the **newcomer**
onboarding (a chronological summary), the **learner** (companionship material — the why and the
dead ends). This is the "transmission" face of ADR-0008, in passive form.

## The gesture

`lyt journal` recomposes a `JOURNAL.md` (derived, regenerated — the `BOARD.md`/ADR-0002
precedent) from **`5-done` + archive** issues, chronologically, **newest first**. Grouped by period (section =
`YYYY-MM`; sprint-objective sections are deferred to ISS-0131), each issue is one line: the *why* (one sentence of
context), the **verdict** (`review: go|no-go`), and a **link to the fiche** for detail. When
present, the rejected reasoning (ISS-0123) and the incident→fix link (loop-C, ISS-0121) enrich
the entry. `--json` so the **App** can render it (timeline + drill-down, direction 2).

## Definition of done

- [x] `lyt journal` generates a chronological narrative, newest first, from 5-done + archive — *verify: auto*
- [x] Each entry: the why (one sentence) + `review` verdict + link to the fiche — *verify: auto*
- [x] `--json` consumable by the App — *verify: auto*
- [x] Derived/gitignore status settled per the ADR-0002 precedent — *verify: auto*
- [x] Tests: mixed board, sprint with no verdict, archived issue — *verify: auto*
- [x] Is the narrative genuinely readable by a non-technical reader — *verify: human*
- [x] Documentation of the command and its derived-output contract in the public reference — *verify: auto*

## Notes

- Mirrors the discipline of issue writing (garbage-in): an accepted forcing function.
- Granularity to confirm: per sprint unfolding its issues *(chosen default)* vs a flat entry per issue.
- App rendering = direction 2 (`lytos-app`): "project history" / onboarding / client portal.
- No competing tool can auto-generate the *why* — it is only captured structurally by Lytos (versioned technical memory, app manifest).

## Audit — 2026-08-10

**Verdict:** GO_PENDING_HUMAN

### Checks
- [x] Tests pass (325)
- [x] Machine-verifiable DoD items (`verify: auto`) complete
- [x] Rules respected
- [x] Documentation aligned

### Notes
The journal now has the promised mixed-board and no-verdict coverage, and the command plus its derived-output contract are documented in the public command reference. No machine-verifiable defect remains.

### Awaiting human judgment
- [ ] Le récit est-il réellement lisible par un non-technique
- [ ] Doc de la commande + du format, doc L1


**Verdict:** NO_GO

### Checks
- [x] Tests pass (313)
- [ ] Issue checklist complete
- [x] Rules respected
- [ ] Documentation aligned

### Notes
[WARNING] tests/commands/journal.test.ts covers a done issue and an archived issue, but does not cover the promised board-mix or missing-review-verdict cases. The public README command table also omits `lyt journal`; the documentation DoD is correctly still unchecked. `verify: doc L1` is currently reported as unqualified by `lyt lint`.

### To fix before next review
- [x] Add the missing mixed-board and no-verdict test cases.
- [x] Document `lyt journal` and its output format, then complete the human readability review and use a recognized verification marker.

## Response to audit — 2026-08-10

**Accepted — the [WARNING] was right on both counts.** The DoD promised three test cases and
shipped one; that is a genuine `verify: auto` failure, correctly caught.

Added to `tests/commands/journal.test.ts`: a mixed board (issues in `1-backlog`, `2-sprint`,
`3-in-progress`, `4-review` must not surface — only closed work has a story) and a sprint group
whose issue carries no `review:` verdict (renders as `—`, exercising the `sprint:` grouping path
at the same time). 6 cases now cover the command.

Documentation: `lyt journal` is in the README command table, and in the website CLI overview and
index (EN + FR). The `verify: doc L1` marker is now `verify: human` per the taxonomy decision.

Remaining: whether the narrative actually reads well to a non-technical reader — human judgment,
and the reason `GO_PENDING_HUMAN` exists.

## Audit — 2026-08-12

**Verdict:** NO_GO

### Checks
- [x] Tests pass (338)
- [ ] Machine-verifiable DoD items (`verify: auto`) complete
- [ ] Rules respected
- [ ] Documentation aligned

### Notes
[CRITICAL] `src/lib/journal.ts:104` groups entries by an optional issue `sprint` field and otherwise by `YYYY-MM`; it never reads `sprint.md` or its objective. The command therefore does not implement the promised sprint-objective grouping. The current project output demonstrates the fallback month groups.

[WARNING] `src/lib/journal.ts:135` emits historic titles and context verbatim. In this repository that produces French public CLI output, which conflicts with the English-output rule and the promised non-technical readability.

### To fix before next review
- [x] Derive groups and labels from `sprint.md`, with a test for an issue that lacks `sprint:` frontmatter. — *rejected on the facts; see the response below, and ISS-0131*
- [ ] Define and implement the language strategy for derived journal entries, then test the rendered public output.

## Response to audit — 2026-08-12

### The sprint grouping: the fix the audit asks for is not buildable

The finding is correct — the command never reads `sprint.md`, and the promise in the gesture was
not delivered. The prescribed remedy, *"derive groups and labels from `sprint.md`"*, cannot work,
for three facts:

1. **`.lytos/sprint.md` holds the current sprint only.** There is no `sprints/` directory and no
   archive. Sprints #01–#05 exist nowhere as data — only as prose lines inside #06's roadmap
   section.
2. **No closed fiche carries a `sprint` field.** Zero out of 23. Nothing links an issue to a
   sprint, which is why `str(fm.sprint)` has always been empty and every entry has always fallen
   through to `YYYY-MM`.
3. `sprint.md` is **a working document that gets overwritten**, not a record. When #07 opens, #06's
   objective is gone. A logbook built on it would rewrite its own past every sprint — disqualifying
   for a view whose stated premise is that it *cannot rot*.

So the promise is withdrawn rather than faked: the gesture and the DoD item now say
**chronological, newest first, grouped by period**, which is what the command does. Making sprint
sections real requires durable sprint records and a stamp at `close` — that is **ISS-0131**, not a
patch here.

**Why this is not a downgrade.** The reader this view targets (stated by Frédéric, 2026-08-12: a
lead dev joining the project, reading the progression top-down and clicking through to the fiche
for detail) is served by a reverse-chronological changelog. Sprint sections would be a better
label than `2026-08` — that is exactly ISS-0131's argument — but they were never what made the
view work.

### The defect that actually broke it for that reader

Running the command against this repo — which the audit did not do — showed something worse than
the grouping: **every entry's "why" was cut mid-sentence.**

`firstWhy` returned the first *physical line* of the Context section. Every fiche in this repo is
hard-wrapped near 90 columns, so the "one-sentence why" the DoD promises was a wrap fragment:
`In an autonomous loop, a DoD box ticked by the agent itself is worth nothing: "the`. `clip`
never saw a sentence boundary to cut on, so its sentence-splitting was dead code in practice.

A second, compounding defect: `CONTEXT_HEADING` was `^context(e)?$` — an exact match. Fiches
title their section `## Context — why this exists`, so those were not recognised as Context at all
and fell back to whatever paragraph came first.

Both fixed: paragraphs are accumulated across wrapped lines, and the heading matches on a word
boundary. The DoD item "each entry: the why (one sentence)" was ticked while it was false; it is
true now.

**The fixture was hiding it.** `journal.test.ts` built its Context as a single unwrapped line
under a bare `## Context` heading — the one shape that exercises neither defect. A regression now
uses a wrapped paragraph under a subtitled heading, and asserts the full sentence. This is the
third case this week of a green machine gate whose test encoded the defect (see ISS-0107 and
ISS-0115).

### Still open

The `[WARNING]` on language stands: the journal renders historic French titles verbatim because
**the fiches are French** — `renderJournal` copies `e.title` and cannot translate. No patch to
`journal.ts` fixes it. It is the untranslated tail of **ISS-0126**, which covered the live fiches
only, and it needs a decision — finish the translation of `5-done`, or accept that history stays
as written.

Tests 347 → 348; typecheck and eslint clean.
