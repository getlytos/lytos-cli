---
id: ISS-0130
title: "Positioning — the governed loop: \"your loop is green, that is not the same as done\""
type: docs
priority: P3-low
effort: M
complexity: standard
domain: [docs, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: "docs/ISS-0130-positioning-the-governed-loop"
depends: []
created: 2026-08-12
updated: 2026-08-12
schema_version: 2
risk: low
---

# ISS-0130 — Stop explaining the method; name a pain the audience already had

## Context — why this angle, and why not the other one

The trigger was **Ponytail** (github.com/dietrichgebert/ponytail, MIT), which got picked up widely
on a single headline number: −54 % lines of code. Its mechanics are worth understanding before
deciding not to copy them. That number works because of its *shape*, not its size: a single scalar
with a minus sign, reproducible in one session, measuring the tool's output rather than a change
in the user's behaviour — and, decisively, **confirming a belief the audience already holds**
("less code is better"). It does not persuade; it hands ammunition to an existing opinion.

**Copying that move is asymmetrically dangerous for us.** Ponytail promises "write less"; Lytos
promises "do not ship an unverified claim". A soft benchmark from a project whose product *is*
rigor is a credibility bomb — the day someone fails to reproduce it, the thesis falls, not the
number. Ponytail already retracted an earlier −80/94 % claim as an unfair baseline and survived,
because its stakes are low. Ours are not. Publishing an unbacked figure while **ISS-0128** removes
exactly those from our own rules would be indefensible.

Second reason, purely strategic: **that audience is not our buyer.** Ponytail speaks to the
developer generating code. Lytos speaks to whoever has already been burned by agent output at
scale. Chasing the first audience with the same format buys installs from people who never open
`BOARD.md`, then churn, then "Lytos is bureaucratic" as the narrative.

The angle that does fit is the one already built: **the autonomous loop under governance**
(ADR-0004). People are already running loops; the demand exists and needs no manufacturing. The
only thing to do is name a pain they have already felt.

## Ready

- **Scope** — fix the public positioning: the angle, the register, the receipts we are allowed to
  cite, and the one mechanism worth demonstrating. Output is a written positioning note in this
  repo that downstream artifacts (site copy, posts, README opening) are derived from.
- **Constraints** — every claim cites a dated, in-repo artifact. No figure that is not measured on
  a real repo; no figure at all until it is instrumented (**ISS-0091**, **ISS-0118**). The register
  is *permission*, not fear (see below). The trend phrase may be the door, never the title.
- **Out of scope** — the marketing site copy itself: `lytos-website` ships French content by design
  and closes its own issues; this produces the source note, and a cross-referenced issue is opened
  there when the copy is written. Pricing, launch plan, channel strategy. Instrumenting the cost
  and judgment-exposure metrics (ISS-0091 / ISS-0118 own those).
- `risk: low` — a document. Reversible, no code path, no user-facing behaviour.

## The gesture

**1. Invert the register — permission, not fear.** "Run a loop without governance and you get an
expensive surprise" is FUD: it ages badly, and it casts us as the person shutting down the party
for an audience that is currently enjoying itself. Same product, opposite valence:

> **Govern your loop and you can let it run longer.**

Governance as a permit, not a brake. It lets them do *more* of what they already want to do, which
is also what makes the message worth relaying.

**2. Lead with the receipt, not the threat.** Dated, dogfooded, on the repo of the tool itself —
the loop delivered sprints #04–#06, **313 tests green**, DoD ticked, issues moved to `4-review`,
and the cross-model audit still returned **NO_GO** with three critical findings (a documented
syntax the parser could not read, a baseline gate missing from the kit, a gate binding that
verified nothing). Condensed:

> **Your loop is green. That is not the same as done.**

Stronger than any warning, because it is not a threat but a **dated counterexample** — and every
person running a loop makes exactly that green = done equivalence. We are not accusing them; we
are showing ourselves getting caught, and the mechanism that caught it.

The companion anecdote, same session (2026-08-12): the `format` gate **could not fail** —
`kit.md` bound it to `npm run format -- --check` while the script hardcodes `prettier --write`, so
running the gate rewrote 51 files instead of checking them, and `src/` had never actually been
clean because the check had never run. Every developer has shipped a check that checked nothing.
It is relatable, it has a punchline, and it proves the thesis by showing the method catching its
own author. **Influencers do not reproduce benchmarks — they reproduce punchlines.**

**3. Demonstrate one mechanism: the park.** A loop that hits an ambiguous spec and *stops and says
so* (`lyt park --reason ambiguous-spec`, ADR-0004 §3) instead of guessing. An agent that **refuses**
work is worth more than one that finishes it — nobody says this, and it is one screenshot. It is
also the precise remedy to the failure people actually fear: the result that does not match what
they had in mind is an agent that silently filled a specification gap.

**4. Prefer a reproducible command to a benchmark table.** `lyt doctor` pointed at the viewer's own
repo, returning a list of things wrong on *their* board in 30 seconds. One command, one screenshot,
no methodology to trust. That is the real asymmetry against a page of rules.

## Definition of done

- [ ] A positioning note in the repo: angle, register, the three receipts, the mechanism to demo, and the claims we may not make — verify: auto
- [ ] Every figure cited resolves to a dated in-repo artifact (issue, audit block, or ADR) — verify: auto
- [ ] No unmeasured performance claim appears anywhere in the note — verify: auto
- [ ] The durable noun ("governed autonomous loop") is the title; any trend phrase is confined to the hook — verify: auto
- [ ] A cross-referenced issue is opened in `lytos-website` for the French site copy — verify: auto
- [ ] Does the register read as permission rather than fear, to someone who currently enjoys running loops — verify: human
- [ ] Is the NO_GO story honest about what it proves, or does it overclaim — verify: human

## Notes

- Field origin: Frédéric, 2026-08-12, after the Ponytail comparison. The "expensive surprise"
  framing is his first formulation; the inversion to permission is the one change proposed against
  it, and the reasoning is above so the decision can be re-litigated on its merits.
- Ordering note: the receipts in gesture 2 are only usable once the corresponding fixes land and
  the fiches are closed. Publishing "the audit caught it" while the finding is still open reads as
  an open bug, not as a proof. This issue therefore follows **ISS-0107**, **ISS-0114**,
  **ISS-0115**, **ISS-0124**, and is deliberately `P3-low` until then.
- The self-critical figure from **ISS-0127** (a third of the DoD surface waiting on a human, half
  of it assertions nobody had written) is a second usable receipt. Numbers that accuse you travel
  better than numbers that flatter you — nobody invents a statistic that makes them look bad.
- Do **not** cite the "40 % of parks = ambiguous-spec" figure from ADR-0007 §3: it is illustrative
  in the ADR, not measured. It becomes citable when ISS-0118 instruments it, and not before. This
  note exists because it is exactly the kind of number that leaks into copy by accident.
