---
id: ISS-0127
title: The human gate became the bottleneck — a third verification mode + risk-tiered human items
type: feat
priority: P1-high
effort: M
complexity: heavy
domain: [cli, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: "feat/ISS-0127-human-gate-is-the-bottleneck"
depends: [ISS-0101, ISS-0114]
created: 2026-08-10
updated: 2026-08-10
schema_version: 2
risk: medium
---

# ISS-0127 — Rigor was supposed to follow risk; the human gate never got the memo

## Context — this comes out of dogfooding, not theory

Sprints #04 → #06 built the loop and its human gate, then we ran the gate for real on this repo.
It did not scale. At the review gate the board held **81 `verify: auto` items against 34
`verify: human`** — close to a third of the entire Definition-of-Done surface waiting on one
person. On a board this size that is already a queue; on a real team running a loop it stops the
loop being worth having.

The volume is the symptom. Classifying those 34 items against the only criterion that should
matter — *is this genuinely unverifiable by an agent or by E2E?* — is the finding:

| Category | Count | Example from the board |
|---|---|---|
| Genuinely human | ~10 | "is the default tiering sane for real projects", "readable by a non-technical reader" |
| A model could judge it against a written rubric | ~6 | "cross-consistency cli ↔ method (no contradiction)" |
| **Machine-gatable, most of them a `grep`** | **~17** | "Document the convention in the issue template + rules", "`## Ready` section in the template", "the principle X stated in the manifest", "ADR-0004 accepted (`Status: Accepted`)" |
| Simply mis-marked | 1 | "`verify: human-comprehension` mode parsed and classified" — that is a test |

**Half of what waits on the human is an assertion nobody wrote.** ISS-0113 shipped a test that
fails when a CLI verb has no `--help` example; the identical shape — "the README documents
`lyt journal`" — was filed as human judgment on the very same day.

## Two structural causes, not carelessness

**1. The DoD marker had two values; the quality kit has three.** The kit (ISS-0107) separates
`gate` / `reviewer` / `human`, where `reviewer` means *no command can decide it, but a model
reading the diff can rule on it against a written rubric* — no human required. The DoD marker
knew only `auto | human`, so everything non-mechanical fell to `human` for lack of anywhere else
to go. This is the same design error we just fixed on audit verdicts: two values where the domain
has three, and the missing third becomes a queue on a person. **ADR-0004 §4 now defines the three
modes and the rule that decides between them; this issue makes the tooling match.**

**2. ADR-0007 promises to route human judgment by risk. The code does not.** ADR-0007 §Consequences
states: *"Does not remove human judgment — it routes it by risk (reviewer/human on high, cheap
gates on low)."* In `src/lib/report.ts`, the human checklist is
`dod.items.filter(i => i.verify === "human")` with **no risk filter at all**; the matrix is applied
to `requiredGates` only. A `verify: human` item on a `risk: low` typo blocks exactly as hard as one
on an auth change. The proportionality thesis is enforced for machines and unenforced for humans.

Nothing on the roadmap attacks either cause. ISS-0116 (doc levels) reclassifies `doc L0/L3` as auto
and would drain part of the grep pile; ISS-0104 makes human items *cheaper to process* without
reducing their number; ISS-0117 **adds** a human gate on `risk: high`. Net, the plan adds about as
much human load as it removes.

## Ready

- **Scope** — the DoD verification taxonomy and how human items are selected: a third `reviewer`
  mode, risk-tiering of human items, a lint that challenges lazy `human` marking, and the written
  criterion that decides which mode an item gets.
- **Constraints** — backward compatible: existing `auto`/`human` items keep working, an unmarked
  item still defaults to `auto` and is still flagged. Reviewer judgment must stay adversarial
  (ADR-0004 §5) — `reviewer` must not become a rubber stamp with extra steps.
- **Out of scope** — ISS-0116 (documentation levels L0–L4) keeps ownership of the `doc <L>`
  markers; this issue only has to not conflict with it. ISS-0104's checklist library. Retro-fixing
  the 34 existing items — that is mechanical follow-up once the modes exist.
- `risk: medium` — it changes a parser and a gate contract that every project inherits, but no
  runtime data path.

## The gesture

Four levers, in order of leverage:

1. **A third marker `verify: reviewer`** — judged by the adversarial reviewer model against a kit
   rubric, no human turn. Aligns the DoD taxonomy with the kit's three kinds. The review packet
   gets a third section, and `GO_PENDING_HUMAN` stops absorbing work a model was allowed to rule on.
2. **Risk-tier the human items.** On `risk: low`, a `verify: human` item is advisory and does not
   block `close`; on `medium`/`high` it stays mandatory. This is ADR-0007 applied to what it
   already claims to cover.
3. **Lint the lazy marking.** An item marked `human` whose text matches the assertion vocabulary
   — *documented, section, present, stated in, listed, appears in* — is almost always a `grep` in
   disguise. `lyt lint` says so: "this item looks machine-gatable".
4. **Write the criterion down.** The rule that is missing, and whose absence is what let this
   drift: **an item is `human` only when it is genuinely unverifiable by an agent or by an E2E
   run.** Taste, product intent, and "would a newcomer understand this" qualify. "The file
   contains X" never does.

Note that ADR-0008 §1 already defines a machine-runnable bar that two current human items should
be using instead of judgment: a fresh, zero-context agent, given only the in-repo artifacts,
makes a correct behavioural change with green gates.

## Definition of done

- [ ] `verify: reviewer` parsed, classified, and surfaced by `lyt show` — verify: auto
- [ ] The review packet renders reviewer items as their own section, distinct from the human checklist — verify: auto
- [ ] `verify: human` items are advisory on `risk: low`, blocking on `medium`/`high` — verify: auto
- [ ] `lyt lint` flags a `human` item whose wording matches the assertion vocabulary — verify: auto
- [ ] Backward compatibility: existing `auto`/`human` items and unmarked items behave unchanged — verify: auto
- [ ] The "human only when unverifiable by an agent or E2E" criterion is stated in the generated rules and the issue templates — verify: auto
- [ ] Tests: each mode, each risk tier, the lint heuristic on true and false positives — verify: auto
- [ ] Measured on this repo after the change: the human item count and what it drops to — verify: auto
- [ ] Does `reviewer` hold up adversarially, or does it become a rubber stamp with extra steps — verify: human

## Notes

- **ADR-0004 §4 has been revised in place** (2026-08-10) to define the three modes, the rule that
  decides between them, and the risk-tiering of human items. No superseding ADR: §4 was `Proposed`
  throughout and never accepted, so a revision is the proposal surviving contact with its own
  dogfooding — which is what `Proposed` is for. This issue **implements** the revised §4; it does
  not argue against it. The two-value version is preserved inside §4 as the record of why the
  third mode exists.
- Field origin: Frédéric, at the gate, after sprints #04–#06 landed together in `4-review`. The
  criterion in lever 4 is his wording.
- Once the modes exist, re-mark the 34 existing items. Expect roughly 17 to become `auto` and 6
  `reviewer`, leaving about 10 genuinely human — a manageable gate rather than a queue.
- Watch the failure mode this creates: `reviewer` is a place to hide work that should have been a
  gate. The lint heuristic in lever 3 must apply to `reviewer` items too, not just `human` ones.
