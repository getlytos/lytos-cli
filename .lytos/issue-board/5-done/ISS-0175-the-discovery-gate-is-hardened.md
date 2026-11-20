---
id: ISS-0175
title: "The discovery gate is hardened: card corruption, a bypass through review, bare overrides and unflagged leaves"
type: fix
priority: P1-high
effort: S
complexity: standard
skill: ""
skills_aux: []
status: 5-done
branch: fix/ISS-0175-discovery-gate-hardening
depends: []
related: [ISS-0163, ISS-0165]
created: 2026-11-20
schema_version: 2
risk: medium
updated: 2026-11-20
completed_at: 2026-11-20
commits: [a324ff1, 8b4bd2d, d38175e, 073a849, 323050d, 5ff5be1, ab448e7, e27e974, f3cae8f, 4629f73, 1c6e272, 889b647, 0aaa03d, ba6e11a, 27d1fd2, b5e8493, 3fd4185, a54e2a5, 957f8b6]
---
# ISS-0175 — The discovery gate is hardened: card corruption, a bypass through review, bare overrides and unflagged leaves

## Context

The independent review of 1.7 (findings F1, F2, F3 and F8) found four defects in the code of ISS-0163 and ISS-0165, all reproduced.

- **F1.** An override reason ending in `---` corrupted the card. Four writers (`moveIssue`, two in `review.ts`, `claim`) cut the body with a regex that stops at the first `---` before a line end, wherever it is, while the frontmatter parser closes on a line that starts with `---`. The tail of the frontmatter leaked into the body and every later write added another copy.
- **F2.** `lyt move LEAF 4-review` then `lyt move LEAF 2-sprint` (taken for a send-back) put a leaf of a discovery epic in the sprint, and `4-review` then `lyt close` delivered it, with no override. A test asserted the first path.
- **F3.** A hand-written `discovery_override` with a reason only exempted a leaf for good, from any epic.
- **F8.** `lyt lint` never flagged a leaf already in the sprint or beyond under an epic in discovery.

## Proposed solution

One helper, `bodyOf`, built on the very expression the parser uses, serves all the writers and `lyt show`. `cleanReason` makes a reason a plain one-line text that cannot read as a delimiter or a YAML construct. The gate runs on every move out of the icebox, the backlog or parked into a later stage, and on `lyt close`; a send-back (a card already in the sprint or beyond) is not asked again, because every way in is gated. An override counts only when complete (reason, date, by, epic) and made for the leaf's current parent, as an incomplete countersignature does not count. `lyt lint` warns on a leaf that got past the gate and on a record that does not count.

Solution study: one line. Kept the single shared helper and the existing gate: the simplest option that closes each hole at its source, with no new state to store.

## Ready

- **Scope** — the four findings above, in `frontmatter.ts`, `discovery-override.ts`, `discovery-gate.ts`, `discovery-lint.ts` and the verbs that apply the gate.
- **Out of scope** — a wrapper contract for the override (ISS-0168), the reviewer-independence findings, the README.
- **Solution** — one shared helper, a stricter record, the gate on every exit from the backlog.
- `risk: medium`.

## Definition of done

- [x] A reason such as `agreed ---`, `---`, `a\n---\nb` or `x: y` cannot corrupt a card: one shared `bodyOf` serves the four writers and `lyt show`, `cleanReason` neutralizes delimiters and YAML constructs, and each writer has a regression test — verify: auto
- [x] Every later write (move, start, claim, review verdict) keeps such a card whole and the other fields untouched — verify: auto
- [x] Every move out of the icebox, the backlog or parked into a later stage runs the gate, and `lyt close` refuses a leaf of a discovery epic unless a person overrides; a send-back from the sprint or beyond still works (both sides tested) — verify: auto
- [x] Only a complete record (reason, date, by, epic) made for the leaf's current parent exempts a leaf; a bare, partial, stale or foreign record does not, and `lyt lint` warns on it with its remedy — verify: auto
- [x] `lyt lint` warns, never errors, on a leaf in the sprint or beyond under an epic in discovery; a spike and a leaf with a valid record are not flagged — verify: auto
- [x] The refusal says the override is a person's decision and that an agent or a wrapper never passes it — verify: auto
- [x] The whole suite stays green, and a project that adopts none of the intent fields sees no change — verify: auto

## Evidence

Reproduced on the 1.7.0 build, then replayed on this branch (a throwaway project with an epic in `phase: discovery` and a leaf in the backlog).

| Scenario | Before | After |
|---|---|---|
| `lyt move ISS-0011 2-sprint --discovery-override "agreed in the call ---"`, then two more moves | the card holds four `---` lines and three copies of `by:` | two `---` lines, `by:` once, the reason reads `agreed in the call -` |
| `lyt move ISS-0011 4-review`, then `lyt move ISS-0011 2-sprint` | exit 0 and exit 0, the leaf is in the sprint | exit 1 and exit 1, the epic is named |
| `lyt move ISS-0011 4-review`, then `lyt close ISS-0011` | exit 0, the leaf is in `5-done` | exit 1 at the first command; a leaf found in review is refused by `lyt close` unless a person overrides |
| a leaf with `discovery_override:` and `reason: x` only, `lyt move ISS-0011 2-sprint` | exit 0 | exit 1, and the refusal says the record is incomplete (missing: date, by, epic) |
| `lyt lint` on a leaf in `2-sprint` under the epic | no warning about the epic | `Leaf of ISS-0010 ("Big outcome") is in 2-sprint while the epic is still in discovery` |

The new tests fail against the previous source (53 failures and two files that do not load) and pass now, with the rest of the suite.
