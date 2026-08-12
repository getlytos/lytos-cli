---
id: ISS-0131
title: "The journal should read what was done, not why we started — a closing summary + durable sprint records"
type: feat
priority: P2-normal
effort: M
complexity: standard
domain: [cli, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: "feat/ISS-0131-closing-summary-and-durable-sprints"
depends: [ISS-0124]
created: 2026-08-12
updated: 2026-08-12
schema_version: 2
risk: medium
---

# ISS-0131 — A logbook derived from the problem statement is not a changelog

## Context — the mismatch, found by naming the reader

`lyt journal` (ISS-0124) derives each entry's one-line "why" from the fiche's `## Context`
section. That was the right instinct — a derived view cannot rot (ADR-0002 precedent) — but it
reads the wrong text.

**`## Context` is written before the work.** It states the problem we set out to solve. The reader
this view exists for — stated 2026-08-12: *a lead dev joining the project, reading the progression
top-down, clicking through to a fiche when they want the detail* — is asking the opposite
question: **what was actually done, and how did it end?** Nothing in the fiche answers that in one
sentence. The outcome is spread across the response-to-audit sections, the DoD ticks and the
verdict field.

The gap is structural, not cosmetic: no amount of fixing the derivation makes a problem statement
into an outcome.

Two smaller facts from the same investigation:

- **`review: go|no-go` is rendered as the entry's outcome**, and most closed fiches carry `—`
  (no verdict at all). For an onboarding reader, `_(—)_` is noise and `_(no-go)_` on a finished
  issue is actively misleading.
- **Sprint sections cannot be built today.** `.lytos/sprint.md` holds the current sprint only,
  no fiche carries a `sprint` field, and the file is overwritten each sprint — so nothing links
  an issue to a sprint, and sprints #01–#05 exist nowhere as data. ISS-0124 withdrew the promise
  rather than fake it; restoring it belongs here.

## Ready

- **Scope** — write durable narrative metadata at the close boundary, and have `lyt journal`
  prefer it: a one-to-three-sentence **closing summary** per issue, and a **sprint stamp** backed
  by durable sprint records so the journal can title a section with the sprint objective.
- **Constraints** — **the human gate must not get heavier.** ISS-0127 established that the human
  gate is the bottleneck; a `close` that asks the human to *write* prose makes it worse. The agent
  drafts at handoff, the human validates at close. Backward compatible: an issue with no summary
  falls back to today's derived Context, so the 23 already-closed fiches keep rendering and
  nothing regresses. The summary is content, so it must be machine-checkable for *presence*, never
  for quality.
- **Out of scope** — the language of historic entries (the untranslated tail of **ISS-0126**: the
  journal renders French titles because the fiches are French; that is a content decision, not a
  code path). Rewriting the App's rendering of the journal. Backfilling summaries onto the 23
  closed fiches — the fallback covers them; a backfill is a separate call.
- `risk: medium` — it adds a write path on `close`, a frontmatter/section convention every project
  inherits, and it touches the command the human uses to sign off.

## The gesture

**1. A closing summary, drafted at handoff and validated at close.** The agent writes it when it
moves the issue to `4-review` — the work is fresh, and it is the only moment where "what changed
versus what we planned" is cheap to state. `lyt close` surfaces it for the human to accept or
edit. One to three sentences, past tense, outcome-first.

Where it lives is part of the decision: a `## Summary` section reads better and has room for a
sentence about a deviation; a frontmatter field is easier to validate and to feed `--json`. The
fiche body is the likelier answer given the frontmatter is already crowded — settle it in the
issue, do not leave it implicit.

**2. `lyt journal` prefers the summary, falls back to the derived Context.** One line of
precedence, and the whole history keeps working.

**3. Reconsider the verdict column.** `review: go|no-go` is an *audit* outcome and reads as noise
in a changelog. Either drop it from the rendered entry, or replace it with something an outside
reader can use. This is a rendering decision with an ISS-0124 DoD item attached to it — decide it
explicitly rather than inherit it.

**4. Durable sprint records, then the sprint stamp.** Sprint files become records
(`.lytos/sprints/<n>.md`) instead of one overwritten `sprint.md`; `lyt close` stamps `sprint:` on
the issue; `lyt journal` titles the section with that sprint's objective, falling back to
`YYYY-MM` for anything unstamped. Lever 4 is separable — if levers 1–3 grow, split it out rather
than let this issue sprawl.

## Definition of done

- [ ] A closing summary is drafted when an issue moves to `4-review`, and `lyt close` presents it for validation — verify: auto
- [ ] Its location (body section vs frontmatter field) is decided and documented in the template and the rules — verify: auto
- [ ] `lyt journal` renders the summary when present and falls back to the derived Context when absent — verify: auto
- [ ] An issue closed without a summary still renders, and `lyt lint` flags the absence — verify: auto
- [ ] The verdict column decision is implemented and the ISS-0124 DoD item updated to match — verify: auto
- [ ] Sprint records are durable, `close` stamps `sprint:`, and the journal titles sections with the sprint objective — verify: auto
- [ ] Unstamped issues still group by `YYYY-MM`; the 23 pre-existing closed fiches render unchanged — verify: auto
- [ ] Tests: summary present / absent, sprint stamped / unstamped, an issue closed before this change — verify: auto
- [ ] `lyt close` is not measurably heavier for the human — verify: human
- [ ] Read the rendered journal as a lead dev joining the project: does it answer "what has been done" — verify: human

## Notes

- Field origin: Frédéric, 2026-08-12 — *"un résumé de ce qui est fait, le plus récent en haut, qui
  renvoie sur les issues; si quelqu'un intègre le projet et veut savoir ce qui a été fait, il lit
  la progression et clique pour aller voir l'issue"*. The `lyt close` timing is his; the shift of
  the drafting to the `4-review` handoff is the one amendment, and its reason is ISS-0127.
- The plumbing exists: `lyt close` already writes `completed_at` to the frontmatter, so this adds a
  field to an existing write path rather than a new mechanism.
- **The trade-off to hold in view:** ISS-0124's premise is that a derived view *cannot rot*. A
  written summary can be skipped or written lazily — that is a real regression in kind, accepted
  deliberately because no derivation can produce an outcome from a problem statement. The fallback
  is what keeps it honest: the view degrades to today's behaviour instead of breaking.
- Watch the failure mode this creates: a summary drafted by the agent and rubber-stamped by a tired
  human is worse than no summary, because it *looks* like a record. If the human validation turns
  out to be a formality in practice, the honest move is to label the entry as agent-written in the
  rendered output rather than pretend it was reviewed.
