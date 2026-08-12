---
id: ISS-0128
title: "Prose that does not run — default-rules.md still mandates what ADR-0007 forbids"
type: fix
priority: P1-high
effort: M
complexity: standard
domain: [method, cli]
skill: ""
skills_aux: []
status: 1-backlog
branch: "fix/ISS-0128-rules-contradict-proportionality"
depends: [ISS-0107, ISS-0114]
created: 2026-08-12
updated: 2026-08-12
schema_version: 2
risk: medium
---

# ISS-0128 — Two governing documents disagree, and nothing says which one wins

## Context — the contradiction is inside our own method

ADR-0007 fixed one invariant above all others: **"Nothing is always-on. Every dimension enters
through the risk matrix; adding one as unconditional is forbidden."** The quality kit made it
executable, and states the reason in its own words: *"`rules/` is prose. Prose does not run."*

`rules/default-rules.md` was never re-derived from either. It is the file agents load **before
every task** — the highest-leverage context surface the method has — and it is still the
pre-ADR-0005 version: a set of unconditional mandates with no risk tier and, for several of them,
no checker anywhere in the repo.

| `default-rules.md` asserts | The kit / ADR-0007 says | Verdict |
|---|---|---|
| "Unit test coverage — **80 % of public functions minimum**" | `tests-unit` at `low,medium,high`; no percentage in the kit, no coverage tool bound | a threshold nothing measures |
| "E2E tests on critical paths — **Mandatory**" | method kit: `e2e` at `high` only. The **CLI kit has no `e2e` row at all** | mandates a gate this project does not own |
| "README per module — each major module has a minimal README" | doc **L1**, due "on non-trivial change to the module" (ADR-0007 §2) | blanket where the ADR is proportional |
| "Dependencies up to date — no known vulnerabilities" | `deps-audit` at `medium,high` | blanket where the kit tiers |
| "Max file 300 lines / function 30 / nesting 3 / params 4" | nothing. No lint rule, no kit row, no rubric | four numbers nobody checks |
| "Mandatory documentation on every public function" | `doc-L0` at `low,medium,high` | ✅ aligned — keep as is |

The defect is **not** "the rules are too strict". It is that an agent loading both files has **no
precedence rule**. It reads "E2E mandatory on critical paths" and `e2e` absent from the kit, and
has to guess. Guessing is the failure mode the whole method exists to remove — and here the method
is the thing forcing the guess.

It propagates. `method/rules/default-rules.md` is bundled and shipped by `lyt init`
([scaffold.ts:71](../../../src/lib/scaffold.ts#L71)); the dogfood copy and the bundled copy are
byte-identical today. Every project initialised since ADR-0007 inherits the contradiction.

## Ready

- **Scope** — reconcile `rules/default-rules.md` (both copies) with the risk matrix and the gate
  catalog: state the precedence between prose and kit, and re-derive every row that claims to be
  mandatory so it either cites a kit gate id, or is restated as guidance.
- **Constraints** — the file must still read as *standards a senior would recognise*, not as a
  table of pointers into the kit. Direction of travel is fixed by ADR-0007: the matrix defaults
  conservative and a project may only **tighten**, never loosen below `low` — this issue aligns
  the default, it does not relax it. The two copies stay byte-identical.
- **Out of scope** — the wording of the documentation levels L0–L4 (**ISS-0116** owns it; this
  issue only removes the blanket claim and defers). The `verify: reviewer` mode (**ISS-0127**).
  Adding or retiering gates in the kit itself (**ISS-0107**). Propagation to the separate
  `lytos-method` repo (**ISS-0092**). A `lyt doctor` lint that auto-detects prose ↔ kit drift —
  deliberately not built now (see the gesture); reopen only if the drift recurs.
- `risk: medium` — no runtime data path, but it changes the instruction surface every project
  inherits, and a wrong loosening is a silent quality regression rather than a red test.

## The gesture

1. **State the precedence, once, in both files.** The kit + the risk matrix decide **what is
   mandatory and when**. `rules/` describes **what good looks like** and why. Where the two touch,
   the kit governs. Two sentences; they are what is actually missing.

2. **Re-derive each mandate-claiming row.** Each is routed to exactly one of three outcomes:
   cite a kit gate id (`verify: auto:<id>` already resolvable), declare it `reviewer`/`human`, or
   reword it as guidance without the mandate vocabulary. Nothing keeps a "Mandatory" / "minimum" /
   "Forbidden" claim that no gate backs.

3. **Reuse the existing checker rather than build one.** Once a rule cites a kit id, `lyt doctor`
   already flags a reference that resolves to no kit entry — the drift check comes for free. This
   is the cheaper rung, and taking it here is the thesis of ADR-0007 applied to this very issue:
   the fix is a precedence sentence and a re-derivation, not new machinery.

## Definition of done

- [ ] The precedence rule (kit + matrix decide what is mandatory; `rules/` says what good looks like) is stated in `rules/default-rules.md` and in `quality/kit.md` — verify: auto
- [ ] The 80 % coverage threshold is bound to a measurable gate in the kit or removed — verify: auto
- [ ] The blanket E2E mandate is re-tiered to match the kit (`high`), or removed while the CLI kit has no `e2e` row — verify: auto
- [ ] The structural thresholds (file 300 / function 30 / nesting 3 / params 4) are bound to a lint rule or declared reviewer judgment — verify: auto
- [ ] The blanket "README per module" claim is removed and defers to the documentation levels (ISS-0116) — verify: auto
- [ ] The dependency-audit row cites `deps-audit` and its `medium,high` tiering — verify: auto
- [ ] No row in `rules/default-rules.md` asserts a mandate that no kit gate, rubric, or checklist backs — verify: auto
- [ ] `method/rules/default-rules.md` and `.lytos/rules/default-rules.md` remain byte-identical — verify: auto
- [ ] `lyt init` in a temp dir ships the corrected rules; `lyt doctor` and `lyt lint` green — verify: auto
- [ ] Do the rules still read as standards, or did they become a pointer file — verify: human

## Notes

- Field origin: surfaced 2026-08-12 while comparing Lytos against **Ponytail**
  (github.com/dietrichgebert/ponytail, MIT), an external ruleset with the opposite bias — it
  constrains generation and refuses blanket mandates. The comparison did not produce this finding;
  it produced the *angle* from which our own two documents were read side by side. The
  contradiction is entirely internal and predates it.
- The companion issue is **ISS-0129** — this one removes mandates nothing backs; that one adds the
  procedure that decides what *not* to write. Neither depends on the other.
- Watch the failure mode this creates: re-deriving prose against a kit is an invitation to strip
  the file down to a list of gate ids. What makes `rules/` worth loading before every task is the
  *rationale* column — the "why" a threshold exists. Cut the mandates, keep the reasoning.
