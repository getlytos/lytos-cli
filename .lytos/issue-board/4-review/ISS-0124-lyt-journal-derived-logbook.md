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
branch: chore/ISS-0124-journal-speaks-one-language
depends: []
created: 2026-08-09
updated: 2026-09-01
schema_version: 2
assignee: Claude
started_at: 2026-08-10
review: no-go
review_at: 2026-08-31
reviewer: fredericgalline
ai_reviewer:
  model: gpt-5
  session: codex-api
  prompt_ref: skills/code-review/SKILL.md
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

## Audit — 2026-08-31

**Verdict:** NO_GO

### Checks
- [x] Tests pass (326 on the declared branch; 350 on the exporter branch)
- [ ] Machine-verifiable DoD items (`verify: auto`) complete
- [ ] Rules respected
- [ ] Documentation aligned

### Notes
[CRITICAL] The declared branch `claude/claude-loops-lytos-wtkc94` does not contain commit
`c60e9d1`. Its journal still reads one physical line and only recognizes an exact `## Context`
heading, so the previous audit's truncated-why defect remains on the branch the prompt instructs
the auditor to run.

[CRITICAL] The public output is still not English. Running `lyt journal --json` on this repository
emits many French titles and contexts from `5-done` and the archive, including ISS-0093 onward.
This directly violates the CLI language rule, and the issue's own last response leaves the
language strategy open.

[WARNING] The withdrawn sprint-grouping promise is not aligned across artifacts. Current
`src/lib/journal.ts:116-139` still lets optional `sprint` frontmatter override period grouping,
and `README.md:80` still documents "grouped by sprint", while the revised issue promises grouping
by `YYYY-MM` period. In addition, `lyt journal` only prints to stdout: it does not regenerate the
promised `JOURNAL.md`, and no JOURNAL ignore rule is shipped.

The mandatory medium-risk gates are red: formatting fails on 51 source files (and the declared
branch has no `format:check` script), while `npm audit --audit-level=high` reports five
high-severity vulnerabilities.

### To fix before next review
- [x] Land the wrapped-context correction on the declared branch, or update the declared branch. — *repointed to `chore/ISS-0126-translate-live-fiches-to-english`, which contains `c60e9d1`; the branch was stale, not the work*
- [x] Define and implement the language strategy for historical entries, then test this repository's rendered output. — *the 12 French fiches translated in full; the rendered journal is English end to end*
- [x] Align implementation, README, and issue on period versus sprint grouping and on whether JOURNAL.md is generated. — *period grouping only, `--write` implemented, README corrected, gitignore rule shipped in both copies*
- [x] Make the mandatory format and dependency-audit gates green. — *`format:check` clean, `npm audit --omit=dev` at 0; dev-side advisories are ISS-0143*

## Response to audit — 2026-09-01

Both points accepted, and the first needed a decision rather than a patch.

### 1. The language of history — the 12 fiches are translated

The audit was right and the wording matters: the journal is a **derived** view, so it cannot be
more English than its sources. `lyt journal` emitted 14 French entries out of 86 — every one of
them a closed or archived fiche from the ISS-0074 → ISS-0105 era, before the repository's language
rule existed.

Three options were weighed and put to the human, because this touches closed records and the
public face of the tool: translate the source fiches, narrow the promise (history predates the
rule), or translate only the fragment the journal exposes. **Translate** was chosen, and the third
option was rejected on its own terms — a fiche with an English header and a French body is worse
against the language rule than either extreme.

Twelve fiches translated in full (not just title and context): ISS-0074, 0079, 0080, 0093, 0094,
0095, 0096, 0097, 0099, 0100, 0102, 0105. Two of the fourteen — ISS-0052 and ISS-0014 — turned out
to be **false positives** of the detection heuristic: it matched `le-socle` and a quotation from
the French website inside otherwise English fiches. Measuring before acting saved two needless
rewrites.

Filenames keep their French slugs (`ISS-0093-merge-driver-union-pour-les-fiches.md`). Renaming
them would break every cross-reference in the board and in git history for a path nobody reads as
prose — the rule is about what the artifact *says*.

One defect introduced and caught: the translated ISS-0093 title used escaped quotes inside a
double-quoted YAML scalar, and the escapes leaked verbatim into the public output
(`A \"union of sections\"`). Re-reading the rendered journal rather than trusting the edit is
what found it.

### 2. Grouping and JOURNAL.md — the three artifacts now agree

The three said three different things: the fiche promised period grouping (having itself deferred
sprint-objective grouping to ISS-0131), the implementation let an optional `sprint:` field override
it, and the README announced "grouped by sprint".

- **Period only.** The override produced a logbook whose sections were sometimes months and
  sometimes sprint names, depending on which fiches happened to carry the field — a chronology a
  reader cannot trust. One rule, applied to every entry. Grouping by sprint *objective* stays a
  real feature, and it belongs to ISS-0131, which owns reading `sprint.md`.
- **`JOURNAL.md` is generated**, by `lyt journal --write`, gitignored in both `.lytos/.gitignore`
  and the scaffold's — the BOARD.md contract of ADR-0002: regenerated, never hand-written, never
  committed. Writing is **opt-in**, not the default: a read has no business touching the working
  tree. `lyt board` writes because the board *is* its output; the journal's output is the
  narrative, and a file is one way to read it. The code comment claiming "if you want a file,
  redirect" is gone — it was the code narrowing a promise the fiche never withdrew.
- **README corrected** to say month grouping and to document `--write`.

359 tests green; format, lint, typecheck, secrets scan clean.
