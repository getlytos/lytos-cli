---
id: ISS-0131
title: "A logbook a non-developer can follow — the functional summary written before close"
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

# ISS-0131 — The reader was specified from the start and has never been served

## Context

ISS-0124's Definition of Done carries this line:

> `- [ ] Is the narrative genuinely readable by a non-technical reader — verify: human`

It is **the only unticked item on that fiche**. The requirement was written before the command
was built and the implementation never reached it — the work landed, the tests went green, and the
one criterion that says *who this is for* stayed open.

What `lyt journal` renders today is derived from each fiche's `## Context` — the problem we set
out to solve, written **before** the work. It never says what happened, how it ended, or what got
in the way. And it is written in the vocabulary of whoever was implementing.

**The reader** (stated 2026-08-12): *a service head who is not a developer and wants to understand
where the project stands*. The register is **meeting minutes**, or a working notebook: what did we
do, why, what went wrong, how was it solved, what was hard. Not a changelog, not a technical
record.

Three entries at the right register, from the week of 2026-08-12 — this is the spec:

> **ISS-0107** — On a relié chaque critère de « tâche terminée » au contrôle automatique qui le
> vérifie : plus de case cochée à la main sans preuve derrière. La revue a aussi révélé qu'une
> vérification importante manquait — celle qui empêche un mot de passe de se retrouver dans le
> code — elle a été remise en place.

> **ISS-0115** — Une tâche ne peut plus démarrer tant qu'on n'a pas écrit ce qu'elle *ne* couvre
> *pas*. Ça évite de lancer un travail mal cadré et de s'en apercevoir trop tard.

> **ISS-0124** — Le journal affichait des résumés coupés au milieu d'une phrase, donc illisibles.
> Réparé.

(Written in French here because they quote the field conversation. The rendered journal follows
the repo's language rule; see out-of-scope on ISS-0126.)

**One tension, resolved.** The ask contains two readers: a personal notebook (allusive — you are
writing to yourself) and a report for someone who was not there (explicit). The external reader
wins, because it is the stricter constraint: if the service head understands, so will the person
who was there. The reverse does not hold.

## Ready

- **Scope** — one functional summary per issue, drafted by the AI after the review verdict and
  validated by the human at close; `lyt journal` renders it, with the fields that let a reader
  situate an entry: clickable issue id, date, sprint, who did the work.
- **Constraints** — **no vocabulary that is not visible from outside the product.** The human gate
  must not get heavier (ISS-0127): the AI drafts, the human validates — reading, not writing.
  Backward compatible: an issue with no summary falls back to today's derived Context, so the 23
  already-closed fiches keep rendering. Length is proportional to the change — a small fix earns a
  line, a change people will feel earns a short paragraph. Never a fixed sentence count.
- **Out of scope** — the language of historic entries (untranslated tail of **ISS-0126**; a
  content decision, not a code path). Backfilling summaries onto closed fiches — the fallback
  covers them. Serving as a retrieval index for agents: **explicit non-goal**, see the notes.
- `risk: medium` — a write path on `close`, a convention every project inherits, and it touches
  the command the human signs off with.

## The gesture

**1. Drafted after the verdict, before close.** Not at the `4-review` handoff: at that point the
review has not happened, and half the story — what the audit found, what was hard — does not exist
yet. The sources are the fiche's Context (already functional: it states the problem in usage
terms), the audit block, and the response to it.

**2. The register, enforced by naming the reader in the drafting instruction.** The agent is told
who it is writing for, and that difficulties belong in the text: *"this took two attempts because
the first approach broke X"* is exactly the kind of line a service head wants and a changelog never
carries.

What the entry answers, in order: **what did we do**, **why**, and where it applies — **what went
wrong and how it was solved**, **what was difficult**.

What it must not contain: file names, function names, regexes, command flags, test counts, the
`GO`/`NO_GO` vocabulary. If a sentence cannot be understood without knowing the codebase, it
belongs in the fiche.

**The one trap specific to this repo:** Lytos is a tool whose *function* is quality machinery, so
"a quality check was not actually checking anything" is a **functional** fact here, where it would
be plumbing anywhere else. The line is not "no technical content" — it is **"nothing that is not
visible from outside the product"**.

**3. The fields that situate an entry.** Clickable issue id, the **date of the entry itself** (today
the date only exists as the `## YYYY-MM` section heading — nine issues in a month are
indistinguishable), the sprint, and the `assignee`. That last one is not decoration: the board runs
11 issues done by `Claude` against 4 by a human, and for this reader "who did this" is real
information about how the project is being built.

**4. The verdict column goes.** `_(go)_` / `_(—)_` means nothing to this reader, and most fiches
carry `—` anyway. It is replaced by a plain sentence when the review found something worth
reporting — *"the review caught three problems before it shipped, they were fixed"* — and by
nothing when it did not. An ISS-0124 DoD item is attached to that column; update it in step.

**5. Durable sprint records, then the sprint stamp.** Sprint files become records
(`.lytos/sprints/<n>.md`) instead of one overwritten `sprint.md`, `close` stamps `sprint:`, and the
journal titles its sections with the sprint objective, falling back to `YYYY-MM`. **Separable** —
if steps 1–4 grow, split this out rather than let the issue sprawl.

## Definition of done

- [ ] A functional summary is drafted after the review verdict and presented at `lyt close` for validation — verify: auto
- [ ] Its location (body section vs frontmatter field) is decided and documented in the template and the rules — verify: auto
- [ ] `lyt journal` renders the summary when present and falls back to the derived Context when absent — verify: auto
- [ ] Each entry shows its own date, a clickable issue id, the sprint when known, and the assignee — verify: auto
- [ ] The verdict column is replaced, and ISS-0124's DoD item updated to match — verify: auto
- [ ] An issue closed without a summary still renders, and `lyt lint` flags the absence — verify: auto
- [ ] Sprint records are durable, `close` stamps `sprint:`, sections carry the sprint objective — verify: auto
- [ ] The 23 pre-existing closed fiches render unchanged — verify: auto
- [ ] Tests: summary present / absent, sprint stamped / unstamped, an issue closed before this change — verify: auto
- [ ] Summary length varies with the change — a trivial fix and a change people will feel do not produce the same size — verify: human
- [ ] `lyt close` is not measurably heavier for the human — verify: human
- [ ] **Give the rendered journal to someone who does not code and ask them what the project has been doing.** If they cannot answer, the item fails — this is ISS-0124's open criterion, and it is the one that decides the issue — verify: human

## Notes

- Field origin: Frédéric, 2026-08-12, across the design conversation. His words for the target:
  *"le chef de service qui n'est pas un développeur et qui veut comprendre l'avancement du projet
  doit comprendre"*, and for the register: *"comme un compte rendu de réunion... un petit carnet
  pour noter ses pensées"*.
- **The human validation is load-bearing, not ceremonial.** An agent that has just spent two hours
  inside the code drifts back to jargon by default — everything it has just read is technical.
  Nothing in a schema prevents that. The person reading at `close` *is* the check, which is why
  step 1 puts the draft in front of them rather than writing it silently.
- **Boundary with the ADRs.** The ADR holds the decision and its reasoning; the journal says what
  happened, when, and points at the ADR. The journal never re-explains a decision — otherwise two
  accounts of the same choice drift apart within a year.
- **Boundary with ISS-0117 (explain-back).** Different reader, different purpose: ISS-0117 has the
  accountable human reconstruct the invariant and failure mode at the gate, on `risk: high`, to
  prove they still hold the system. This summary proves nothing and addresses someone who was not
  there. On a `risk: high` issue both are written on the same fiche minutes apart — settle which
  feeds which, rather than discovering the duplication mid-implementation.
- **Options examined and rejected** (recorded so they are not re-proposed — the ISS-0123 reflex):
  *composing the summary from the issue's commits* (`Refs: ISS-XXXX` makes the join reliable, 183
  of the last 200 commits carry it) — rejected because a commit message addresses someone about to
  read a diff, and using it as the source drags back exactly the register we are removing;
  *two exits per entry, fiche + commits* — rejected, routing a non-technical reader to a diff is
  meaningless; *designing the journal as a retrieval index for agents* — rejected as a design
  driver, because an agent searching for "where did we touch the frontmatter parser" wants the
  technical noun this journal will not contain. The index role is served by the link: the journal
  points, the fiche holds the detail.
