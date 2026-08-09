# ADR-0008 — The human-capability contract (comprehension, competence, operability)

Date: 2026-08-09

Status: Proposed

---

## Context

ADR-0004→0007 govern the *AI* side of the loop (autonomy, standards, proportionality).
A structured red-team / blue-team exercise — two adversarial panels of senior architects,
one attacking Lytos from the "a developer must write and know their code" stance, one
defending the "human-as-architect, code becomes transparent" stance — surfaced a single
gap neither ADR covers: **the *human* side of "human-governed" is assumed, never
engineered.** Lytos audits which AI produced what, at what cost, validated by whom against
which checklist — but nowhere does it model where the validating human's judgment comes
from, whether it survives, or whether anyone can operate the result.

The two panels **converged independently** on the same additions: the skeptics posed them
as conditions of surrender, the defenders proposed them as solutions. When prosecution and
defense write the same order, it is a diagnosis, not an opinion.

The load-bearing insight, conceded even by the pro-AI panel: **AI generation is a
*fallible* abstraction, unlike a compiler, which is deterministic and does not lie.** You
never inspect the emitted assembly because the compiler cannot betray you; you *must* judge
an AI's output because it can. Therefore the human's terminal role is neither "coder" nor
"passive approver" but **evaluator of fallible generation** — comprehension at the
behavior/contract level, competence deliberately trained, operability engineered. Left
un-instrumented, the method burns pre-AI senior judgment as a fossil stock and discovers
the debt at bankruptcy.

This ADR makes the human capability a first-class, measured concern — a fifth governance
question beside *which model / what cost / who validated*: **what capability is the team
still accumulating.**

## Decision

Three faces of one contract. All are **risk-tiered** (ADR-0007) — mandatory on `high`/core,
absent on `low`.

### 1. Comprehension — proof of transfer, not a stamp

On `risk: high` / core modules, `lyt close` requires an **explain-back**: the human
reconstructs, *from the repo artifacts and not from the diff*, the central invariant and
the primary failure mode of the change — recorded in the sign-off (a new DoD mode,
`verify: human-comprehension`). A checklist tick proves a click; an explain-back proves a
mental model. The recoverable-comprehension bar is falsifiable: **a cold, zero-context
agent (human or AI), given only the in-repo artifacts — contract, tests-as-spec, L1/L2,
invariants — can make a correct behavioral change, all gates green, without ever reading
the author's session.** That is the real bus factor; Lytos is the only side of the debate
that makes it *measurable* rather than presumed.

### 2. Competence — put it on the balance sheet, then train it

- **Judgment-exposure metric** (the un-booked debt): per person, track blind-reviewed-then-
  corrected diffs, parks resolved by hand, agreement rate with the adversarial reviewer,
  hand-authored share. Aggregated in the sprint report; if it falls team-wide while
  velocity rises, the board must surface it — the skeptic winning in real time, seen coming.
- **Learning mode**: a `learning: on` axis that *inverts the routing* — the human writes,
  the AI becomes the adversarial reviewer of the human. The same apparatus (gates, checklist,
  cross-review) serves training instead of production. Plus **reviewer rotation** on
  high-risk and **calibrated planted-bug evals** injected into the review flow (an eval for
  the reviewer, not only for the model) — the nose for bugs is kept by smelling bugs.

### 3. Operability — govern the output, not just the input

- **Executable runbook (doc L4)** mandatory on `risk: high`: the runbook carries commands
  the quality kit replays in CI (`gate: runbook-smoke`); a runbook that fails its own smoke
  test fails the gate. Plus a `verify: observability` DoD item (structured "fail with
  context" + correlatable log).
- **Loop-C** — incident ingestion, symmetric to loop-B: a prod signal is triaged by an
  agent into a candidate issue (estimated blast radius → `risk`, cause hypothesis linked to
  the faulty commit via `Refs`, a correction DoD with ≥1 machine-verifiable item). The human
  keeps the upstream gate (accept into the sprint). The lifecycle becomes
  `spec → deploy → incident → spec`.
- **MTTR** as a first-class aggregated field (like cost), tracked per sprint.

## Falsifiability (the method commits to being disprovable)

- **Competence**: three junior cohorts at 3 years — A (hand-written), B (naive Lytos),
  C (Lytos + the learning apparatus above). Blind judgment battery. The vision is **false in
  its strong form if C < A stably** on the non-specifiable residue (bug-nose, over-engineering,
  spec-holes); the honest fallback is then the skeptic's "artisan mode by default".
- **Operability**: MTTR A/B on a *real* incident — original human author vs context-loaded
  agent under human gate. Falsified if the author repairs faster with fewer regressions.
- **Verification**: seed hard bugs in 100%-green modules; the jury's kill-rate must beat the
  best single model **and** a human panel at equal time-cost (see ISS-0122).

Leading indicator, available before the 3-year data: the judgment-exposure metric (§2). A
provisioned debt, not one discovered at bankruptcy.

## The desanalogy, stated plainly

"Code becomes transparent like binary" holds for *usage* (users don't speak binary) but not
for the *evaluator role*: binary doesn't lie, AI output can, so the human cannot become as
ignorant of software behavior as a user is of machine code. The architect remains the
**expert evaluator of the output** — comprehension migrates up a level, it does not vanish.

## Consequences

**Issues** (`lytos-cli`): explain-back (ISS-0117), judgment-exposure metric (ISS-0118),
learning mode + rotation + reviewer-evals (ISS-0119), operability gate — executable runbook
+ observability (ISS-0120), loop-C + MTTR (ISS-0121, spans App). Related answer-issues that
refine earlier ADRs: measured decorrelation + non-LLM verifiers + behavioral nets
(ISS-0122, refines ADR-0004 §5 / ADR-0005 / ADR-0007), capture of rejected reasoning
(ISS-0123, refines ADR-0006).

**Propagation**: folds into ISS-0106. **App / direction 2**: the judgment dashboard and
loop-C are cockpit-flavored.

## Non-goals

- **Not a return to mandatory hand-coding.** Both panels rejected "a human rewrites the core
  by hand" as the wrong remedy — writing ≠ future modifiability, and the author's memory has
  a bus factor of 1. The bar is *recoverable comprehension*, not authorship.
- **Not a claim the vision is proven.** It is a serious bet with written falsification
  conditions above.
- **Does not suspend proportionality.** These are risk-tiered gates like everything else —
  a low-risk change carries none of them.
