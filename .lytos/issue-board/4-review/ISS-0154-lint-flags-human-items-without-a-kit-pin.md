---
id: ISS-0154
title: "lyt lint warns on a verify: human item with no human kit pin"
type: feat
priority: P1-high
effort: S
complexity: standard
domain: [cli, dod]
skill: ""
skills_aux: []
status: 4-review
branch: "feat/ISS-0154-lyt-lint-warns-on-a-verify-human-item-with-no-human-kit-pin"
depends: [ISS-0153]
created: 2026-11-20
updated: 2026-11-20
schema_version: 2
risk: medium
assignee: fredericgalline
started_at: 2026-11-20
---
# ISS-0154 — lyt lint warns on a verify: human item with no human kit pin

## Context

ADR-0004 §4 reserves `verify: human` for what nothing else can rule on, and the filed rule is
sharper in practice: a `verify: human` item is legitimate only when an end-to-end tester could not
check it itself, in a browser or with Playwright. Otherwise the item is `verify: auto:e2e`, with
the proof attached. A human item therefore always names a `human` line of the quality kit
(`human:product-intent`, `human:legal-accounting`, …): the pin is what makes the person's call
auditable, and an unpinned `human` is how screen walkthroughs end up queued on the accountable
human (ADR-0004 §4, "the human gate is the bottleneck").

Nothing enforces it today. ISS-0153 made `human:<pin>` parse; this card makes the missing or wrong
pin visible.

Field case: a private project (rule stated by its owner, 2026-11-20).

## Proposed solution

- `lyt lint` (schema v2 issues, open columns) warns on a `verify: human` item with no pin, and on
  a `human:<pin>` whose pin names a kit line that is not of kind `human`. Both are **warnings**,
  never errors: no existing project breaks, the exit code is unchanged.
- The unpinned warning gives both remedies: pin a human line of the kit (listing the ones the kit
  has), or, when a browser can check it, switch to `verify: auto:e2e`.
- A pin on an id the kit does not know is not repeated here: `lyt doctor` already flags it.
- Closed issues (`5-done`) are skipped: their Definition of Done is history, and flagging it would
  bury the warnings on live work.
- Cost study (`cost-review`): the check reads the parsed DoD items (ISS-0153) and the kit once per
  run; constant per issue. No per-project disable switch: `.lytos/config.yml` is write-only today
  (nothing reads it), so a switch would be a new mechanism, not an existing one; a warning that
  cannot fail the run does not need one.

## Ready

- **Scope** — two lint warnings, the pure function behind them, their tests.
- **Constraints** — warnings only; schema v2 issues only; no new dependency; the kit stays
  project-owned and is read, never written.
- **Out of scope** — the rule's wording in the kit and the rules (ISS-0155), a pin check for
  `auto:` or `reviewer:`, a config switch.

## Definition of done

- [x] `lyt lint` warns on a `verify: human` item with no pin and the message offers both remedies (pin a human line of the kit; `verify: auto:e2e`) — verify: auto
- [x] `lyt lint` warns when a `human:<pin>` names a kit line that is not of kind `human`, and stays silent when the pin names a `human` line or an id the kit lacks — verify: auto
- [x] Both are warnings: exit code unchanged, no new error on any existing project; `5-done` and schema v1 issues are skipped — verify: auto:tests-negative
- [x] The behaviour is covered by unit tests on the pure function and by end-to-end tests through the binary — verify: auto
- [ ] No new runtime dependency and the check stays proportionate — verify: reviewer:over-engineering
