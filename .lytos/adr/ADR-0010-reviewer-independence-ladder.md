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
