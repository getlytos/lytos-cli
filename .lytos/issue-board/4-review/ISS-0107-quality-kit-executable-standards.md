---
id: ISS-0107
title: Versioned quality kit — the Standards pillar made executable
type: feat
priority: P1-high
effort: L
complexity: heavy
domain: [cli, method]
skill: 
skills_aux: []
status: 4-review
branch: claude/claude-loops-lytos-wtkc94
depends: []
created: 2026-08-09
updated: 2026-08-10
schema_version: 2
assignee: Claude
started_at: 2026-08-09
review: go-pending-human
review_at: 2026-08-10
reviewer: fredericgalline
---
# ISS-0107 — Make Pillar 3 (Standards) executable

## Context

ADR-0004 says quality must be *gated*, not asked for. ADR-0005 says *with what*. Today `rules/`
is prose: "prefer KISS" does nothing. Each rule must be **bound to a checker**, and the whole
grouped into a versioned kit that travels with the repo (multi-project → nobody memorises which
config belongs where).

## The gesture

One `.lytos/quality/` kit per project: a **stack contract** (pinned versions + allow-listed deps
+ `no-new-dependency-without-ADR` + the docs source), **gate configuration**
(lint/type/format/architecture/complexity, plus the dimensions folded in from ADR-0007: secrets,
build reproducibility, dependency audit, perf/size regression budget, observability /
"fail with context", compatibility/migrations, doc L0/L3), and the **reviewer rubric** (a
versioned prompt). Each dimension is **selected by the risk matrix** (ISS-0114), not applied
uniformly. The DoD's `verify: auto` items (ISS-0101) **point** at a kit entry. Rules that cannot
be gated are marked `reviewer-judged` or `human-checked` — never silently "applied".
Anti-over-engineering signals included: diff size vs declared `effort`, complexity, number of new
abstractions.

## Definition of done

- [x] `.lytos/quality/` structure + stack contract schema — *verify: auto*
- [x] ADR-0007's folded-in dimensions present as checkers (secrets, repro, deps audit, perf, observability, compat, doc L0/L3) — *verify: auto*
- [x] `lyt doctor` checks the kit's presence and coherence — *verify: auto*
- [x] Convention: a `verify: auto` item references a resolvable kit entry — *verify: auto*
- [x] Non-gatable rules explicitly classified reviewer/human, and both kinds actually used in the shipped kit — *verify: auto*
- [x] Docs: how to add an executable rule to the kit — *verify: auto*

## Notes

- Ref: ADR-0005 §1-2. Consumed by ADR-0004's gates; it does not drive them.
- Method propagation tracked by ISS-0106.

## Audit — 2026-08-10

**Verdict:** NO_GO

### Checks
- [x] Tests pass (313)
- [ ] Issue checklist complete
- [x] Rules respected
- [ ] Documentation aligned

### Notes
The kit parser and doctor validation are covered, but both human documentation criteria are unchecked. The template/rules introduce the kit but do not close the explicit review checklist.

### To fix before next review
- [x] Review and document the classification of non-gatable rules as reviewer or human.
- [x] Add and validate user-facing guidance for adding an executable rule, then tick both DoD items.

## Response to audit — 2026-08-10

**Accepted: both documentation criteria were genuinely unwritten.** `method/quality/kit.md` now
carries them.

- **"The three kinds"** — a table stating what `gate` / `reviewer` / `human` mean, who executes
  each, and which failure mode each prevents. The load-bearing sentence: *a rule with no `tool`
  binding is not a rule, it is a wish*. "Prefer KISS" cannot be a gate; it becomes `reviewer` with
  a rubric that says what over-engineering looks like here, or `human`, or it leaves the kit — but
  it never sits in `rules/` looking enforced while nothing checks it.
- **"How to add an executable rule"** — six steps from prose rule to wired gate, with the tier
  guidance that matters (`low` means *every* change pays this cost; most new gates belong at
  `medium,high`) and a worked example across the three kinds.

Two real defects surfaced while writing this, both fixed:

1. **`parseGates` read any 4-column markdown table.** Adding a documentation table to `kit.md`
   silently produced 8 phantom gates. The parser now anchors on the exact `id | kind | tiers |
   tool` header, so a project can document its kit without corrupting its catalog. This was
   latent — it would have hit the first user who added a note table.
2. **`unresolvedGateRefs` compared a lowercased reference against raw ids.** The shipped kit ships
   `doc-L0` and `doc-L3`; every DoD item pinning them was reported unresolved by `lyt doctor`.
   Both sides are lowercased now. Regression test asserts every shipped gate is referenceable.

The `verify: auto` DoD item "an item references a resolvable kit entry" was ticked while defect 2
made it false for two of the shipped gates — worth noting as a case where a machine gate passed
because nothing exercised it on real data. The new test does.

Remaining: your judgment on whether the classification and the guidance read right.
