---
id: ISS-0115
title: Definition of Ready — the entry gate, twin of the DoD
type: feat
priority: P1-high
effort: M
complexity: standard
domain: [cli, method]
skill: 
skills_aux: []
status: 4-review
branch: feat/ISS-0115-ready-checks-what-it-documents
depends: []
created: 2026-08-09
updated: 2026-08-31
schema_version: 2
assignee: Claude
started_at: 2026-08-09
review: no-go
review_at: 2026-08-31
reviewer: fredericgalline
ai_reviewer:
  model: gpt-5
  session: codex-api
  prompt_ref: skills/code-review/SKILL.md
---
# ISS-0115 — Catch ambiguity before spending tokens on it

## Context

Park-on-ambiguity (ADR-0004 §3) is **reactive**: we stop *after* hitting the ambiguity. A
"ready" gate shifts that left — an under-specified issue never enters the loop (ADR-0007 §3).
That is what turns "40% of parks are ambiguous-spec" into prevention.

## The gesture

An issue is **ready** when: the scope is clear, the constraints are stated, **out-of-scope is
explicit**, the DoD is testable (ADR-0004 §4), and `risk` is set. A normed `## Ready` section in
the template. `lyt next` **refuses** a non-ready issue (new ineligibility reason `not-ready`);
`lyt lint` flags it. Complements the existing loop-eligibility rule (machine-verifiable DoD).

## Definition of done

- [x] Ready criteria defined + `## Ready` section in both templates and the generated rules — *verify: auto*
- [x] `lyt next`: a non-ready issue is not eligible (reason `not-ready`) — *verify: auto*
- [x] `lyt lint` flags non-ready sprint issues — *verify: auto*
- [x] Tests: fully ready / missing field / no out-of-scope — *verify: auto*
- [x] Are the criteria sufficient without being bureaucratic — *verify: human*

## Notes

- The upstream twin of the DoD. Extends `lyt next` (ISS-0099). Ref: ADR-0007 §3.

## Audit — 2026-08-10

**Verdict:** NO_GO

### Checks
- [x] Tests pass (313)
- [ ] Issue checklist complete
- [x] Rules respected
- [ ] Documentation aligned

### Notes
The Ready analyzer and template section are present, but the documentation criterion is unchecked and `lyt lint` reports its `verify: doc L1` item as unqualified. The human sufficiency criterion is also still pending.

### To fix before next review
- [x] Complete the Ready documentation and explicitly record the human scope review.
- [x] Use a verification marker accepted by the current parser, or implement support for the documented level marker.

## Response to audit — 2026-08-10

**Partly accepted.** The audit was right that the documentation criterion was incomplete, but the
gap was narrower than "the Ready section is missing": `issue-feature.md` already carried a full
`## Ready` section. What was missing was the other half of the surface.

Delivered:

- `method/issue-board/templates/issue-task.md` — a `## Ready` section sized for a task: the
  out-of-scope line plus `risk:`, and nothing else. A task is XS/S; asking for the four-field form
  there would be the bureaucracy this issue's own human criterion asks you to guard against. The
  note says so explicitly, and points out that an agent hitting ambiguity mid-work will park it
  `ambiguous-spec` anyway — Ready moves that cost left, it does not add a new one.
- `method/rules/default-rules.md` — the Ready criteria, the `lyt lint` / `lyt next` consequences
  (`not-ready` ineligibility), and the proportionality caveat, in the rules every generated
  project receives.
- Propagated to `.lytos/` via `lyt upgrade --force`.

The `verify: doc L1` marker is now `verify: human`, per the decision to keep the ISS-0101 taxonomy
closed at `auto | human`; the doc level stays in the item text. ISS-0116 owns making levels
first-class.

Remaining, and genuinely yours: whether these criteria are sufficient without being bureaucratic.
The concrete way to answer it — would you accept filling this in on an XS task?

## Audit — 2026-08-12

**Verdict:** NO_GO

### Checks
- [x] Tests pass (338)
- [ ] Machine-verifiable DoD items (`verify: auto`) complete
- [ ] Rules respected
- [ ] Documentation aligned

### Notes
[CRITICAL] `src/lib/ready.ts:44` searches the entire issue body for `out of scope`; it does not require the declaration to be in `## Ready`. An unrelated Context or Notes sentence therefore makes an otherwise under-specified sprint issue eligible for `lyt next`, contradicting the entry-gate contract.

### To fix before next review
- [x] Parse the `## Ready` section and require the out-of-scope declaration within that section.
- [x] Add a regression where the phrase appears outside Ready and the issue remains `not-ready`.

## Response to audit — 2026-08-12

**Accepted.** `analyzeReady` now extracts the `## Ready` section and tests the out-of-scope
pattern against that body alone. The heading match is `^ready\b`, so `## Ready` and
`## Ready — the entry gate` both count; an issue with no such section fails the criterion, which
is the correct reading of the entry gate rather than a regression.

Two regressions pin it: the phrase under `## Notes` leaves the issue `no-out-of-scope`, and a
`## Ready` section that declares a scope but no boundary fails too — the second is the one that
matters, since a Ready section people fill out halfway is likelier than a stray mention.

**The fixture was carrying the defect.** `tests/commands/next.test.ts` built every fixture issue
with a bare `Out of scope: none.` paragraph and no Ready section, so two `lyt next` tests failed
on the corrected code. They were asserting the old contract, not the intended one — updated to
declare the boundary where it binds. Worth recording as the second case this week where a machine
gate was green because the test encoded the defect (see ISS-0107, defect 2).

Board effect, measured after the change: one sprint issue changes state — **ISS-0067**, already
flagged in `sprint.md` as a #03 leftover, is now correctly reported `not-ready: risk-unset,
no-out-of-scope` by both `lyt lint` and `lyt next`. No other issue on the board was relying on a
stray mention.

Tests 338 → 347 across both fixes; typecheck and eslint clean.

## Audit — 2026-08-31

**Verdict:** NO_GO

### Checks
- [x] Tests pass (326 on the declared branch; 350 on the exporter branch)
- [ ] Machine-verifiable DoD items (`verify: auto`) complete
- [ ] Rules respected
- [ ] Documentation aligned

### Notes
[CRITICAL] The declared branch `claude/claude-loops-lytos-wtkc94` does not contain commit
`5ae3e05`. Its `src/lib/ready.ts:44` still searches the entire fiche for "out of scope", so the
exact defect from the previous audit remains on the branch the prompt says to test.

[CRITICAL] Even on the exporter branch, `src/lib/ready.ts:65-72` checks only risk, a machine DoD,
and the presence of the words "out of scope". It never checks that scope is declared or that
constraints are stated, although both the issue gesture and generated rules define them as Ready
criteria. An issue with no scope and no constraints is therefore eligible for `lyt next`.

[WARNING] The Ready-section parser stops at every nested heading, not only at the next heading of
equal or higher level, and a label with no value (for example `Out of scope:`) satisfies the
criterion. Both cases allow the machine gate to disagree with the documented contract.

The mandatory medium-risk gates are red: formatting fails on 51 source files (and the declared
branch has no `format:check` script), while `npm audit --audit-level=high` reports five
high-severity vulnerabilities.

### To fix before next review
- [x] Land the previous Ready-section correction on the declared branch, or update the declared branch. — *repointed to `chore/ISS-0126-translate-live-fiches-to-english`, which contains `5ae3e05`; the branch was stale, not the work*
- [x] Enforce the documented scope and constraints criteria, proportionally by issue type if that is the intended policy, with regressions. — *proportional by `effort`: XS/S owe out-of-scope, M+ owe scope and constraints too*
- [x] Parse the Ready section by heading level and require a non-empty out-of-scope declaration. — *both fixed, with the emphasis-stripping the bare-label case needed*
- [x] Make the mandatory format and dependency-audit gates green. — *`format:check` clean, `npm audit --omit=dev` at 0; dev-side advisories are ISS-0143*

## Response to audit — 2026-08-31

Both defects accepted. The first was the gap between what the rules say and what the analyzer
checked; the second was two parser bugs in the same twenty lines.

### 1. Scope and constraints were documented and unchecked

The audit was exact: `analyzeReady()` checked risk, a machine DoD, and the *words* "out of scope".
`default-rules.md` says a Ready section states **four** things, `issue-feature.md` asks for all
four, and an issue with neither scope nor constraints was loop-eligible.

Enforced now, **proportionally by `effort`** — which is the policy the templates already
implement, not a new one:

| `effort` | Ready owes |
|---|---|
| XS, S | out-of-scope + `risk:` — `issue-task.md`'s two lines |
| M and above | scope, constraints, out-of-scope + `risk:` — `issue-feature.md`'s form |
| unstated | the full form — for an entry gate, an unstated field is not a licence to ask for less |

`effort` rather than `type` on purpose: an `L` fix deserves the same specification as an `L`
feature, and it is size, not category, that decides whether the form earns its cost.

**Measured before shipping, on the 50 live fiches**: **zero** issues that are ready today become
not-ready. Every M-or-larger fiche carrying a Ready section already declares scope and constraints
— the rule was being followed by hand and simply not enforced. That number was the deciding
argument for `effort` over a stricter or looser threshold; a hardening that silently blocked half
the backlog would have been a different decision, and would have needed to be your call.

### 2. Two parser bugs

- **The section stopped at every heading.** A `### Boundaries` subheading inside `## Ready` ended
  the section that was about to declare out-of-scope — a fiche read as *not ready* for being more
  structured, not less. It now closes only on a heading at the Ready level or above.
- **A label with no value satisfied the criterion.** `Out of scope:` passed: the words were there,
  the boundary was not. The label must open the line — so a passing mention inside a sentence no
  longer counts — and something must follow it. Emphasis marks are stripped for that emptiness
  test, because `- **Out of scope:**` leaves `:**` behind, and two asterisks are not a boundary.
  That case was caught by its own regression failing first.

### 3. Documentation

`default-rules.md` said *"on an XS task, Ready is two lines"* — true but not decidable. Both copies
now name the `effort` threshold, the unstated-effort stance, the gap codes `lyt next` and
`lyt lint` report, and the two parser rules. A rule a reader cannot apply the same way the tool
does is the drift this issue exists to prevent.

366 tests green.
