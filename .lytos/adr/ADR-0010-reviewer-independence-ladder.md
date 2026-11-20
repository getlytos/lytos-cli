# ADR-0010 — Reviewer independence: a ladder, computed and enforced by risk

Date: 2026-11-20

Status: Accepted (decided by the owner, 2026-11-20)

---

## Context

ADR-0004 §5 says the reviewer model must differ from the implementer, a different provider preferred. In practice not everyone has two AI providers, and a review by the same model that wrote the work shares its blind spots and tends to approve it. The schema v2 already records `ai_implementer` and `ai_reviewer` (model, session), but nothing measures how independent the review actually was, so nothing can require more of it where the stakes are higher.

## Decision

### 1. Three levels of independence

1. **Different provider** (for example one vendor implements, another reviews). The most decorrelated review.
2. **Same provider, a different and stronger model**, with a fresh context and an adversarial rubric. The fallback for someone with a single provider. Weaker than level 1: its blind spots partly overlap.
3. **Same model, a fresh session**, with a rubric imposed and no access to the implementer's reasoning. A last resort, reported as "weak independence".

### 2. Computed, never declared

The level is computed from `ai_implementer` and `ai_reviewer`. The provider of a model comes from a small shipped mapping that a project can override in `.lytos/config.yml`. "Stronger" comes from an ordered ranking of models in the same configuration; a model missing from the ranking is never treated as stronger. The packet (`lyt report`) shows the level.

### 3. The minimum depends on risk (ADR-0007)

- **low**: any reviewer.
- **medium**: a different model, or a fresh session.
- **high**: level 1 or 2. A level-3 review at high risk can NOT produce `review: go` alone: the card waits for the owner, who countersigns with "weak independence" recorded (who, when). A team may tighten this to a refusal in `.lytos/config.yml`.

### 4. What it does not replace

The deterministic gates and the human gate. A strong reviewer reduces missed defects; it does not prove their absence.

## Alternatives rejected

- Require a different provider: unusable for a solo user with one AI.
- Require nothing: a self-review becomes an approval, and a binding `review: go` (the App's merge gate) would carry no information.
- Refuse level 3 outright at high risk: it blocks the single-provider user instead of making them sign knowingly.

## Consequences

`lyt report` and `lyt gates` read the level and the minimum; `lyt review` records the models it was given. The App's merge gate (a `review: go` from a reviewer other than the implementer) gains a meaningful condition. Cost follows risk: the strongest reviewer is used where the risk justifies it.

## Non-goals

No automatic selection of a reviewer. No measurement of a model's quality; the ranking is a declared input.

## Known limits

Added on 2026-11-20, after the independent review of 1.7 (ISS-0176). Nothing above changes: this says how far the rule reaches, so that nobody reads it as reaching further.

### Guaranteed

- A verdict that approves (`go`, `go-pending-human`), recorded with `lyt review --verdict` at a risk whose minimum the review does not meet, is refused before any byte is written, unless a person passes `--countersign` (or the project chose `refuse`, in which case nothing passes). With the shipped defaults, at risk high that is every level-3 or unknown review.
- The configuration cannot loosen the defaults: a looser minimum or action, an invalid value or an unknown key is reported and ignored. A provider override that reassigns a model the shipped table already maps is reported, flagged on the card's level, and not counted at risk high.
- What a hand edit changes AFTER a verdict was recorded shows in `lyt report`. The level is recomputed from the card every time and compared with the `review_independence` block, so an approval that is no longer backed, a block that no longer matches the models or the risk, and an incomplete or typed countersignature are all flagged.

### Not guaranteed

- **A hand-lowered `risk:` before the first verdict.** Nothing records the risk when the work starts. Lowering `risk: high` to `low` and then running `lyt review --verdict go` records a verdict at risk low, and the block says so; nothing flags it. Putting `high` back afterwards is detected; lowering it first is not. The risk is a declared input, like the others.
- **Declared models can lie.** `ai_implementer` and `ai_reviewer` come from the AI wrapper's journal, from `--ai-model` and `--ai-session`, or from a hand edit. The CLI cannot verify who implemented or who reviewed. The ranking is likewise a declared order, not a measurement (see Non-goals).
- **A countersignature is only as good as the signer.** It records the git `user.name` and a date. Nothing tells a person from an automated run, and a complete `review_independence` block can be typed by hand: only the git history tells. The refusal message says an automated wrapper must never pass `--countersign`; the CLI cannot enforce it.
- **A provider override counts below risk high.** At low and medium risk a configuration that reassigns a shipped model gets the level it asked for. It is reported and flagged, not refused.
- **Only `--verdict` is guarded.** `lyt close` and `lyt lint` do not consult `review:`: an approval that is not backed is shown in the packet, not blocked. An audit block ingested with `--accept` is evidence and never writes `review:`, but a reader that trusts the block over the field would see a `GO`.
- **A stale reviewer.** A later `--verdict go` given without `--ai-model` reads the `ai_reviewer` of an earlier round. The CLI says so when it records the verdict.
- **Merges and `absorb`.** A three-way merge, or `lyt absorb --apply`, can change the inputs after a verdict. The packet shows the mismatch; nothing blocks it.
