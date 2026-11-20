---
id: ISS-0153
title: "The verify: marker recognizes reviewer and human:<pin>"
type: fix
priority: P1-high
effort: S
complexity: standard
domain: [cli, dod]
skill: ""
skills_aux: []
status: 4-review
branch: "fix/ISS-0153-the-verify-marker-recognizes-reviewer-and-human-pin"
depends: []
created: 2026-11-20
updated: 2026-11-20
schema_version: 2
risk: medium
assignee: fredericgalline
started_at: 2026-11-20
---
# ISS-0153 — The verify: marker recognizes reviewer and human:<pin>

## Context

`src/lib/dod.ts` reads a Definition-of-Done marker with a regex that only knows a bare
`verify: human` and `verify: auto[:pin]`. The kit documents more: `quality.ts` already resolves
`verify: reviewer:<pin>` and `verify: human:<pin>` against the catalog, ADR-0004 §4 defines three
modes (`auto`, `reviewer`, `human`) and the shipped kit tells projects to write
`verify: human:product-intent`. A project that follows the kit gets
`Definition-of-Done item(s) without a verify: marker` from `lyt lint` on exactly the forms the kit
asks for, and the item is silently counted as a machine item (an unqualified item defaults to
`auto`), so a `reviewer` item blocks the loop's gate as if a command could run it.

Field case: a private project (kit linked to its own stack, 2026-11-20).

## Proposed solution

- One regex, three modes, an optional pin on each: `verify: (auto|reviewer|human)[:pin]`. The
  forms that were already valid parse exactly as before; `human:<pin>` and `reviewer:<pin>` stop
  being reported as unqualified.
- `DodItem` gains `pin` (the kit id, lowercased) so a consumer reads it from the parsed item rather
  than re-scanning the text. `quality.ts` keeps its own scan of the DoD section (it resolves pins
  inside prose too), unchanged.
- Eligibility, decided from ADR-0004: **`reviewer` is not machine-verifiable.** §1 asks for "at
  least one machine-verifiable item", §4 defines `auto` as "a command that exits non-zero" and
  `reviewer` as "the adversarial reviewer model, against a rubric". A model ruling is a judgment,
  not a gate that "can say NO mechanically, independent of the model's confidence". So a DoD made
  only of `reviewer` and `human` items is not loop work (invariant 3). A `reviewer` item is not
  `human` either: an auditor may rule on it (§4), so an unticked one is a pending ruling, not a
  pending person.
- Cost study (`cost-review`): the cheapest option that passes the floor is the one-regex change,
  constant cost per issue read. Rejected: a separate `reviewer` parser (two syntaxes for one marker
  is the divergence `unresolvedGateRefs` already had to be tested against).

## Ready

- **Scope** — the marker grammar, the DoD counters, and every consumer of `VerifyMode`
  (`next`, `show`, `report`, the review prompt).
- **Constraints** — forms already valid keep their behaviour; zero new dependency; `lint` stays a
  warning; the doctor's check for a pin on an unknown kit id is unchanged.
- **Out of scope** — warning about `verify: human` without a pin (ISS-0154), the new kit rows
  (ISS-0155).

## Definition of done

- [x] `verify: auto`, `reviewer` and `human` each parse, with or without a `:pin`, through dashes, parentheses, asterisks, underscores and any case — verify: auto
- [x] The forms valid before this change parse exactly as before, and malformed pins (`auto:`, `human:`) are still unqualified — verify: auto:tests-negative
- [x] `lyt lint` no longer reports `human:<pin>` or `reviewer:<pin>` as a missing marker, end to end through the binary — verify: auto
- [x] A pin on an id absent from the kit is still flagged by `lyt doctor`, for all three modes — verify: auto
- [x] A DoD with no machine item (reviewer and human only) is refused by `lyt next` with its own reason; reviewer items are listed apart in the review packet and counted apart in `lyt show` — verify: auto
- [x] ADR-0004 §4 records the grammar and the eligibility decision for `reviewer`, and the generated rules and templates document the three modes — verify: auto
- [x] A very long item cannot freeze the reader: the marker is searched in a bounded window, 100 000-character lines are read in under 50 ms, and every valid form stays valid — verify: auto
- [x] One grammar reads the marker: `doctor` resolves pins from the parsed items, so a space before the colon, a second marker on one item and a marker that is not at the end are read the same by both — verify: auto
- [x] `lyt report --sprint` counts and lists the pending reviewer rulings like the per-card packet does — verify: auto
- [x] The rules, the templates and the repo's own rules say a DoD with no `auto` (or unmarked) item is not loop work and that a pin is a kit id, and `lyt next` documents `no-machine-dod` with the other reasons — verify: auto
- [x] The change stays proportionate to a marker fix: one regex, no new dependency, no new abstraction — ruled by the independent review of 2026-11-20 (Claude Opus 5.5 reviewing Claude Sonnet 5.5 work, verdict GO with reserves, every finding addressed) — verify: reviewer:over-engineering
- [x] The decision that a `reviewer` item does not make an issue loop-eligible is the one the owner wants — decided by Frédéric Galliné, 2026-11-20 — verify: human:product-intent
