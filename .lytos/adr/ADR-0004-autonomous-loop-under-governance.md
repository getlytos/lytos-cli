# ADR-0004 — Autonomous loop (loop-B) under Lytos governance

Date: 2026-08-09

Status: Proposed

---

## Context

A recurring request for AI coding tools is the **autonomous loop**: an agent that
pulls the next task, works it, and moves to the next — without a human turn between
each step — until the backlog is empty or a budget is spent. This is the "loop-B"
pattern (as opposed to loop-A, a scheduled/cron cadence over maintenance rituals,
which is low-risk and adopted separately).

Loop-B collides head-on with Lytos's constitution. The `lytos-app` manifest states
the project **is not** "un moteur autonome de génération sans supervision", that
"On préfère la gouvernance humaine plutôt que l'autonomie IA", and — as the
fundamental rule — "L'IA ne décide jamais seule. Elle propose. Les humains
gouvernent." A naive `while (true) { claude -p }` loop violates all three.

Yet Lytos is, paradoxically, the framework *best* positioned to run loop-B safely,
because it already supplies everything a loop needs to be trustworthy: a bounded
backlog, a per-issue Definition of Done (the contract), cross-model audit
(`lyt review`), a durable audit journal (schema v2, ADR-0001), and deterministic
state transitions via CLI verbs. **The loop is the engine; Lytos is the rail.**

This ADR records the governance contract that makes loop-B compatible with
"l'IA ne décide jamais seule". It does not implement the loop. The CLI provides
*primitives*; the AI wrapper / the App orchestrates (the CLI never calls an AI —
see the manifest constraint "Not an AI tool").

The reconciliation rests on one observation: **the manifest forbids the AI
*deciding*, not the AI *executing inside a box bounded by two human gates*.** The
human governs upstream (what enters the sprint) and downstream (review / close).
The loop is autonomous only in cruise, between those two gates.

---

## Decision

### 1. The sprint is the loop perimeter

The loop may only act on issues the human has committed to the current sprint. The
sprint is the human's upstream governance gate — the "flight plan". Sprint membership
alone is not enough: an issue is **loop-eligible** iff

- its `status` allows work, **and**
- all `depends` (and child issues) are satisfied, **and**
- its Definition of Done carries **at least one machine-verifiable item**
  (see §4). An issue whose DoD is entirely human-verifiable is *not* loop work — the
  loop must refuse it and leave it for a human.

### 2. Two real gates — the loop never self-closes

The loop runs exactly one transition cycle: `3-in-progress → 4-review`. The
promotion to `5-done` (`lyt close`) stays a human (or CI) act. This is the load-
bearing invariant: **the loop never closes its own work.** The day it does, Lytos
becomes vibecoding with extra steps.

### 3. Park-on-ambiguity — the loop parks, it never guesses

Lytos's rule "Don't interpret silently — ask if ambiguous" cannot mean "ask" inside
an autonomous loop (there is no human turn). It is inverted into an obligation to
**halt, not guess**: on any ambiguity the agent is *forbidden to resolve it* and must
**park** the issue with a machine-set reason drawn from a fixed taxonomy
(`ambiguous-spec`, `missing-dependency`, `gate-failed`, `budget-exhausted`,
`human-judgment-required`, `external-blocker`). Parking is a first-class exit, not a
failure. The reason taxonomy also yields upstream metrics (e.g. "40% of parks =
ambiguous-spec" → issues are under-specified before the loop, not by it).

### 4. DoD items declare their verification mode

Each Definition-of-Done item declares **who or what verifies it**. There are three
modes, and the choice between them is not a matter of taste:

| Mode | Verified by | Routed to |
|------|-------------|-----------|
| `verify: auto` | A command that exits non-zero — test, typecheck, lint, build, E2E, or a plain assertion over a file | the **gates** |
| `verify: reviewer` | The adversarial reviewer model (§5), against a rubric written in the quality kit (ADR-0005) | the **reviewer's verdict** |
| `verify: human` | A person, because nothing else can | the **review checklist** (§6) |

**The rule that decides the mode — an item is `human` only when it is genuinely
unverifiable by an agent or by an E2E run.** Taste, product intent, "would a
newcomer understand this", "is this default sane for real projects" qualify. "The
file contains X", "the command is documented", "the section exists" never do: those
are assertions, and an assertion nobody wrote is not a human judgment — it is a
queue.

An unmarked item defaults to `auto` and is flagged as unqualified: the default must
be the mode that blocks, never the mode that waits on a person.

A gate can say NO mechanically, independent of the model's confidence. A self-ticked
checkbox is worth zero in a loop, which is why an auditing model may tick an `auto`
item, may rule on a `reviewer` item, and may **never** tick a `human` one — nor
return NO_GO merely because a `human` box is empty (§5, `GO_PENDING_HUMAN`).

Human items are themselves risk-tiered (ADR-0007): blocking on `medium`/`high`,
advisory on `low`. Rigor follows blast radius on the human side of the gate exactly
as it does on the machine side — a `human` item on a typo is not a reason to stop
the line.

"No hallucination" and "no interpretation" are **not** achievable by instruction —
only by this net: gates that block, park-on-ambiguity, and adversarial cross-model
review.

#### Field revision — 2026-08-10

This section originally defined **two** modes, `auto | human`, with everything
non-mechanical falling to `human`. Sprints #04–#06 built the loop and its gate on
that definition, and then we ran the gate for real on this repo. It did not scale.

At the review gate the board held **81 `auto` items against 34 `human`** — close to
a third of the whole Definition-of-Done surface waiting on one person. Classifying
those 34 against the criterion above was the finding: about ten were genuinely
human, six were rulings a model could make against a rubric, and **seventeen were
assertions — most of them a `grep`**. "The template documents the convention." "The
principle is stated in the manifest." On the same day, ISS-0113 shipped a test that
fails when a CLI verb has no `--help` example, while the identical shape — "the
README documents `lyt journal`" — was filed as human judgment.

Two causes, both structural rather than careless:

1. **The taxonomy had two values where the domain has three.** ADR-0005's quality
   kit already separated `gate` / `reviewer` / `human`; the DoD marker had nowhere
   to put "a model can rule on this", so it fell to `human` by default. The same
   design error appeared independently on audit verdicts, where a missing third
   verdict made every issue carrying a `human` item unpassable.
2. **ADR-0007 claimed to route human judgment by risk, and nothing did.** The human
   checklist was assembled with no risk filter at all; the matrix applied to
   machine gates only. Proportionality was enforced for machines and unenforced for
   humans.

Writing the seventeen assertions as tests dropped the review column's human queue
from twelve items to six, without the `reviewer` mode being implemented yet — the
measured half of the estimate above.

The two-value version is recorded here rather than quietly dropped: it is the reason the third
mode exists, and without it someone re-proposes `auto | human` in six months on the
grounds that it is simpler. It is simpler. It also puts a person in the loop for
every string comparison in the repo.

*Implementation: ISS-0127. This ADR was `Proposed` throughout, never accepted, so
§4 is revised in place rather than superseded — the revision is the proposal
surviving contact with its own dogfooding, which is what `Proposed` is for.*

### 5. Adversarial cross-model review

The reviewer model must differ from the implementer model (different provider
preferred — Lytos is multi-provider by design, ADR-0011 of `lytos-app`). The
reviewer's job is adversarial: *try to make the DoD fail*, not to bless it. This is
the honest substitute for the human on the inner loop; the human gate at `close`
remains.

### 6. The review checklist is a first-class object

> A review without a checklist is vibecoding at the gate.

If the human approves without knowing what to verify, they rubber-stamp — they do not
govern. Because the App is multi-project, "what to verify" cannot be remembered; it
must be **generated and persisted in-repo**, versioned, travelling with the issue.

The checklist has two sources, one output:
- per-issue `verify: human` DoD items (issue-specific), and
- **structural checks** derived from the issue's type/domain, pulled from a shared,
  versioned library (UI → visual check; auth/data → security check; user-facing copy →
  tone check). These are *not* invented by the loop — an agent that hallucinated will
  not flag its own hallucination.

Three guard-rails, because a checklist creates a new failure mode (the human stops at
it): (a) it is a floor, not a ceiling — an explicit "free-look / not covered here"
slot remains; (b) doubt goes first — parks and reviewer objections sit *above* the
green; (c) an empty or trivial checklist is a signal of an under-specified issue, not
a green light.

Human sign-off is **recorded**: ticking a checklist item captures who verified what,
when. The audit trail then answers not only "which AI produced this code" (schema v2)
but "which human validated it, against which checklist" — a governance metric no
competing tool can produce.

### 7. The review packet and the sprint report

The **review packet** is the autopilot→pilot interface, generated per issue at
`4-review`: the diff, the gate evidence (§4), the parks (§3), the human checklist
(§6), the adversarial reviewer verdict (§5), and the schema-v2 audit line. The
**sprint report** is the aggregate of packets (done / parked, budget burn, coverage) —
it rolls up, it does not replace, the per-issue gate.

### 8. Budget ceiling

The loop stops at a cost / issue-count threshold, read from the schema-v2 cost fields.
The CLI exposes this as a non-interactive guard (`lyt budget`), consumable by the
wrapper/CI; it does not drive agents itself.

---

## Invariants (the hard lines)

1. The loop **never self-closes** — `5-done` is a human/CI act.
2. Ambiguity **parks**, it never resolves by guessing.
3. No issue **without a machine-verifiable DoD item** enters the loop.
4. Every `verify: human` item ends in a **recorded human sign-off** before `close`.
5. Implementer model ≠ reviewer model.

Breaking any one of these turns loop-B back into unsupervised generation, which the
manifest forbids.

---

## Consequences

**CLI primitives to build** (issues in `lytos-cli`): `lyt next` (eligibility
selector), `parked` status + `lyt park` + reason taxonomy, DoD `verify: auto|human`
convention + counting, `lyt budget` guard, review-packet generation (`lyt report`),
structural-checks library + checklist generation + sign-off record, sprint report.

**Schema impact**: additive only (consistent with ADR-0001). The DoD verification
mode lives in the issue body convention; park reason and sign-off records extend the
frontmatter as optional fields owned by tooling.

**Propagation**: this is a *method* decision. Once accepted, it must land in
`lytos-method` (LYTOS.md / pillars / rules) — tracked as its own issue, mirroring the
ISS-0067 / ISS-0092 propagation pattern.

**App (later, direction 2)**: the cockpit — live loop view, parked-issues queue,
budget burn, the diff to approve at `close`. Reuses the icebox items ISS-0071
(structured sprint retrospective) and ISS-0080 (per-sprint AI cost dashboard), which
now gain a reason to exist: they are the human gate's instrument.

**Risks accepted**: report-induced rubber-stamping (mitigated by §6: doubt-first
layout); checklist-as-ceiling (mitigated by the free-look slot); internet
verification for "latest versions / no deprecated API" widens the prompt-injection
surface and must be scoped when introduced.

---

## Non-goals

- The CLI does **not** run the loop (it never calls an AI). Orchestration is the
  wrapper's / the App's job.
- This ADR does not cover loop-A (scheduled maintenance cadence), adopted separately.
- No change to the offline-first, additive-schema, human-governed principles — this
  ADR *applies* them to the autonomous case, it does not relax them.
