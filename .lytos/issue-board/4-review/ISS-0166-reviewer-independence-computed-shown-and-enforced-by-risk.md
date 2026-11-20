---
id: ISS-0166
title: "Reviewer independence: computed, shown in the packet and enforced by risk"
type: feat
priority: P1-high
effort: L
complexity: heavy
skill: ""
skills_aux: []
status: 4-review
branch: feat/ISS-0166-reviewer-independence
depends: []
related: [ISS-0162]
created: 2026-11-20
schema_version: 2
risk: high
assignee: fredericgalline
updated: 2026-11-20
started_at: 2026-11-20
---
# ISS-0166 — Reviewer independence: computed, shown in the packet and enforced by risk

## Context

ADR-0010. The schema records `ai_implementer` and `ai_reviewer` but nothing measures the independence of a review, so nothing can require more of it where the stakes are higher.

## Proposed solution

Compute the level (different provider, same provider and stronger model, same model fresh session) from the two fields; show it in `lyt report`; read a per-risk minimum from `.lytos/config.yml`; at high risk a level-3 review cannot yield `review: go` alone (the card waits for the owner's countersignature with "weak independence" recorded).

| Option for "stronger" | Build cost | Maintenance | Robustness |
|---|---|---|---|
| A. An ordered model ranking in the configuration, with a small shipped default | low | low | explicit; an unknown model is never "stronger" |
| B. Hard-code known model names | low | high: stale within weeks | wrong silently |
| C. Drop "stronger", compare "different model" only | lowest | lowest | loses the single-provider fallback |

Decision: **A**.

## Ready

- **Scope** — the computation, the packet line, the minimum by risk, the high-risk rule, the config keys.
- **Out of scope** — choosing a reviewer automatically, judging a model's quality.
- **Solution** — a configurable ranking; unknown means not stronger.
- `risk: high`.

## Definition of done

- [x] Each of the three levels is computed correctly from the two fields, including an unknown model — verify: auto
- [x] `lyt report` shows the level and the minimum for the card's risk — verify: auto
- [x] At high risk, a level-3 review cannot produce `review: go` alone, and the countersignature is recorded with who and when — verify: auto
- [x] Negative cases exist for every rule (missing fields, an empty ranking, a risk with no minimum configured) — verify: auto
- [ ] A verdict recorded below the minimum for the card's risk is refused, and edits made after the verdict show in the packet; a hand-lowered `risk:` before the first verdict, what the declared models claim and what a typed countersignature proves are not prevented, and are listed in ADR-0010 "Known limits" — verify: reviewer:security-review

## Delivery notes

What was built, and what the card left open.

- **Computation** (`src/lib/independence.ts`, pure). Level 1: two known providers that differ. Level 2: the same provider, two different models, the ranking puts the reviewer strictly above the implementer. Level 3: the same model, or anything that cannot be shown to be better. `unknown` (a model not recorded, or a field that is not a model/session block) is reported as such and counts as level 3 everywhere. A model whose provider is unknown counts as level 3 and is flagged. A model absent from the ranking is never stronger: ranking entries are exact ids, no prefix, so a longer id never inherits a shorter one's rank. A model-id prefix maps to a provider only up to a non-letter (`gpt` matches `gpt-5`, not `gptj`): a false negative is the safe side.
- **Configuration** (`.lytos/config.yml`, the first code to read it, `src/lib/config.ts`, a narrow reader that skips and reports what it does not understand). One `independence:` section: `ranking` (exact model ids, weakest first, none shipped: a shipped order would be a claim about quality nobody can back), `providers` (prefix to provider, added to the shipped table), `minimum` (`any`, `fresh-session`, `level-2`, `level-1`; defaults low `any`, medium `fresh-session`, high `level-2`), `below_minimum` (`warn`, `countersign`, `refuse`; defaults low and medium `warn`, high `countersign`). The defaults are also the floor: a looser value, an invalid one or an unknown risk is reported (packet, `lyt gates`, `lyt doctor`) and ignored.
- **Write path** (`src/lib/independence-record.ts`, called by `applyVerdict`, the only writer of `review:`). An approval (`go`, `go-pending-human`) below the minimum is refused before any byte is written, with `--countersign` as the way through (unless the project says `refuse`). The countersignature (`review_independence` block: `countersigned_by`, `countersigned_at`, `countersigned_as: weak independence`) belongs to one verdict: any later verdict rewrites or clears the block. A rejection (`no-go`, `pending`) is always recorded. `--accept` records `--ai-model` / `--ai-session` and never writes `review:`.
- **Where it shows.** `lyt report` (a "Decide first" line and an `## Independence` section, recomputed from the card, with where each value came from), `lyt gates` (the minimum per risk, the card's level), `lyt doctor` (unusable settings), `lyt review` (what it computed, and whether the reviewer was given or read from the card).
- **Open points settled here.** Medium only warns by default (a stricter team sets `below_minimum.medium: countersign`); the card text and the ADR set the hold only at high. A `risk:` that is present but not low, medium or high is read as high. `lyt close` is not changed: it never consulted `review:`.
- **Known limits.** The models and sessions are declared inputs: the CLI cannot prove who reviewed. A hand edit of the card is not prevented (it is a tracked markdown file) but is shown: an approval with no matching record, a record that no longer matches the models or the risk, an incomplete or typed countersignature. Nothing tells a human from an agent running `--countersign`: that is the wrapper contract's job (ISS-0168) and the App's.
