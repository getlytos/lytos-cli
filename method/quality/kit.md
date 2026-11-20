# Quality kit — gate catalog

*The executable form of Pillar 3 (Standards). Each gate below is **stack-agnostic**;
its `tool` binds it to THIS project's stack. `tiers` says at which `risk` levels the gate
is mandatory — the risk matrix (ADR-0007) selects from this table. A rule that cannot be
bound to a machine checker is declared `reviewer` or `human`, never silently enforced.*

Columns: `id` · `kind` (gate | reviewer | human) · `tiers` (comma-separated: low,medium,high) · `tool` (per-stack binding).

**A binding decides which question the gate asks.** `deps-audit` is the clearest case: audit
everything installed, or only what the project ships? A library that publishes a bundle with two
runtime dependencies (`npm audit --omit=dev`) and an application deployed from source with its
build tooling are asking different questions, and both are legitimate — but a gate bound to the
wrong one goes permanently red on findings nobody can act on, and teaches the team that red is
survivable. Choose deliberately, and write the reason next to the row.

| id | kind | tiers | tool |
|----|------|-------|------|
| tests-unit | gate | low,medium,high | <your test command, e.g. npm test> |
| typecheck | gate | low,medium,high | <e.g. tsc --noEmit> |
| lint | gate | low,medium,high | <e.g. eslint> |
| secrets-scan | gate | low,medium,high | <e.g. gitleaks detect> |
| build-reproducible | gate | low,medium,high | <lockfile committed + CI==local> |
| doc-L0 | gate | low,medium,high | <public API documented> |
| deps-audit | gate | medium,high | <e.g. npm audit --audit-level=high> |
| tests-negative | gate | medium,high | <error-path tests present> |
| perf-budget | gate | medium,high | <size/regression budget> |
| ds-conformance | gate | medium,high | <tokens-only lint, UI changes> |
| doc-L3 | gate | medium,high | <contract/schema ↔ implementation> |
| e2e | gate | high | <end-to-end suite> |
| runbook-smoke | gate | high | <doc L4 runbook replayed in CI, ISS-0120> |
| observability | gate | high | <structured error + correlatable log> |
| migration-check | gate | high | <backward-compat / migration> |
| over-engineering | reviewer | medium,high | rubric:over-engineering |
| security-review | reviewer | high | rubric:security |
| architecture-review | reviewer | high | rubric:architecture |
| ux-review | reviewer | medium,high | rubric:ux |
| design-fidelity | reviewer | medium,high | rubric:design-fidelity |
| red-team | reviewer | high | rubric:red-team |
| cost-review | reviewer | low,medium,high | rubric:cost-review |
| screen-reader | human | high | checklist:a11y |
| product-intent | human | high | checklist:intent |
| legal-accounting | human | high | checklist:legal-accounting |
| real-money | human | high | checklist:real-money |

*The `reviewer` and `human` lines point into this folder: `rubric:<name>` is
`rubrics/<name>.md`, `checklist:<name>` is `checklists/<name>.md`. Every review follows
`rubrics/FORMAT.md`: read-only, a severity, a confidence of at least 0.7, evidence as file and line,
a scenario, a one-sentence fix, and what the reviewer could not verify. `tests-negative` ships as a
`gate`; a project with no tool that can tell a refusal is tested rebinds it to `reviewer` with
`rubric:tests-negative`.*

*`cost-review` is the one `reviewer` line at `low`, a deliberate exception recorded in ADR-0007
(field revision of 2026-11-20): the method asks that someone look for the cheapest robust solution
on EVERY card. It meets the test this kit sets for `low` (cheap and universal, see "How to add an
executable rule") because the study is proportional: one line on a low-risk card, a table of options
on a medium or high one (`rubrics/cost-review.md`). It is written under "Proposed solution" before
the code and checked again at review. The six floor gates are untouched. `ux-review` and
`design-fidelity` bite on UI work: a project with no UI, or no mock-up to be faithful to, drops
them — above the floor the table is yours to tune.*

*Two promises of ADR-0007 §1 are deliberately **not** rows here, and saying so beats shipping
rows nobody can bind. **Doc levels L1 and L2** wait on ISS-0116, which makes documentation levels
first-class; a `doc-L1` row today would have no honest `tool` and would sit in the table looking
enforced — the exact failure this kit exists to prevent. **`screen-reader` stays at `high`,
not `medium`**: it is a `human` gate, and making it mandatory at medium stops every medium change
for a person, which is the opposite of rigor following blast radius. Medium-tier UI work is
covered by `ds-conformance`, a machine gate. Tighten either on a project where the blast radius
justifies it — that is what tightening is for.*

*Edit this table to your stack: fill the `tool` column, add or remove gates, tighten the
tiers (a project may only tighten — never loosen below `low`). The six `low` gates are the
floor: `lyt doctor` warns if one is removed, narrowed out of `low`, or downgraded to
`reviewer`/`human`. Everything above the floor is yours to tune — dropping `ds-conformance`
on a project with no UI is the proportionality this matrix exists for.*

---

## `verify: human` is the last resort

A Definition-of-Done item is `verify: human` only when an end-to-end tester could NOT check it
itself, in a browser or with Playwright. Otherwise the item is `verify: auto:e2e`, with the proof
attached (captures of the journey, the replayed run).

- **Walking a screen is never "human".** Replaying a journey, comparing a render, reading a state
  on a page: that is the end-to-end tester's work. What stays human is what no run can rule on:
  intent, a real screen reader, a legal or accounting opinion, a real-money gesture.
- **A human item always carries a pin**, naming a `human` line of this kit: `human:product-intent`,
  `human:screen-reader`, `human:legal-accounting` or `human:real-money`. The pin is what makes the
  person's call auditable and what puts the right checklist in front of them.
- **`lyt lint` enforces it as a warning, never an error.** It flags a `verify: human` item with no
  pin, and a `human:<pin>` whose pin names a line that is not of kind `human`. A pin on an id this
  kit does not have is flagged by `lyt doctor`.
- **Bind `e2e` honestly.** Until the project has an end-to-end command, a tester replaying the
  journey and attaching captures is evidence, not a green gate: say so in the `tool` column.

---

## The three kinds — and why a rule is never "silently applied"

`rules/` is prose. Prose does not run. The whole point of this kit is to bind each rule to
something that actually executes — and, when nothing can execute it, to say so out loud rather
than pretend the rule is enforced.

| `kind` | What it means | Who runs it | Failure mode it prevents |
|--------|---------------|-------------|--------------------------|
| `gate` | A command exits non-zero on violation | CI, or the agent before handing off | — |
| `reviewer` | No command can decide it, but a model reading the diff can judge it against a written rubric | The cross-model auditor | A rule that sounds enforceable but silently isn't |
| `human` | Neither a command nor a model can rule on it — it needs taste, product intent, or a body in front of a screen | The accountable human, via the review packet | A model rubber-stamping a judgment that was never its call |

**A rule with no `tool` binding is not a rule — it is a wish.** "Prefer KISS" cannot be a `gate`.
Either it becomes `reviewer` with a rubric that says what over-engineering looks like *here*
(diff size vs declared `effort`, new abstractions introduced, indirection added for a single
caller), or it becomes `human`, or it leaves the kit. What it must never do is sit in `rules/`
looking enforced while nothing checks it.

`reviewer` and `human` entries carry a `tool` too — a pointer, not a command: `rubric:<name>` for
a reviewer prompt, `checklist:<name>` for a human checklist. That is what makes the classification
auditable: you can grep the kit and see exactly which rules are machine-enforced and which are
somebody's judgment.

## How to add an executable rule

1. **Write the rule where humans read it** — a line in `rules/`, in plain language.
2. **Find the checker.** Is there a command that exits non-zero when the rule is broken? If yes,
   it is a `gate`. If no, can a model judge it from the diff against a written rubric? Then it is
   `reviewer`. Otherwise it is `human`.
3. **Add the row** — pick a stable kebab-case `id` (it becomes an API: DoD items reference it),
   set `kind`, set the `tiers` at which it is mandatory, and bind the `tool` to *this* project's
   stack.
4. **Pick the tiers by blast radius, not by enthusiasm.** `low` means "every change pays this
   cost" — reserve it for what is cheap and universal. Most new gates belong at `medium,high`.
   Never widen a gate to `low` because it feels important; widen it because a `low`-risk change
   that skipped it would still be dangerous.
5. **Point the Definition of Done at it**: `- [ ] Secrets scan clean — verify: auto:secrets-scan`.
   `lyt doctor` flags a reference that resolves to no kit entry, so a renamed gate cannot quietly
   orphan the DoD items that depended on it.
   **The pin is optional**: a bare `verify: auto` is a machine-checkable item no catalog gate
   covers — an assertion written for one issue alone — and most DoD items are exactly that. What is
   enforced is that a pin, once written, resolves.
6. **Verify the wiring**: `lyt gates ISS-XXXX` lists what is mandatory for that issue's `risk`;
   `lyt doctor` validates the kit's structure and its baseline.

A worked example. The rule "no secret ever reaches a commit" is universal and cheap to check, so
it is a `gate` at `low,medium,high` bound to `gitleaks detect`. The rule "the UI uses design-system
tokens, never raw hex" has a linter but only bites on UI work, so it is a `gate` at `medium,high`.
The rule "this screen is usable with a screen reader" has no honest checker, so it is `human` at
`high`, bound to `checklist:a11y` — and it surfaces in the review packet as your call, not as a
green tick somebody else made for you.
