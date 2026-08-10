---
id: ISS-0114
title: Risk-to-gate matrix — proportional rigor
type: feat
priority: P1-high
effort: M
complexity: heavy
domain: [cli, method]
skill: 
skills_aux: []
status: 4-review
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0107]
created: 2026-08-09
updated: 2026-08-10
schema_version: 2
assignee: Claude
started_at: 2026-08-09
---
# ISS-0114 — Rigor follows the blast radius, not the other way round

## Context

Applying every gate to everything is the over-engineering we claim to avoid (a security audit on
a typo). The `risk: low|medium|high` field already exists (ADR-0001) and we ignore it. The
missing link: a **risk → mandatory gates** matrix (ADR-0007 §1).

## The gesture

The kit (ISS-0107) carries a matrix that, for a given `risk`, says which gates are **mandatory**.
Conservative defaults (ADR-0007): `low` = tests+type+lint+secrets+repro+doc L0; `medium` adds
deps audit + perf + negative paths + DS/a11y + doc L1/L3; `high` adds E2E + compat/migrations +
security/architecture review + doc L2. A missing `risk` is treated as `medium`. A project may
**tighten**, never loosen below `low`. `lyt` resolves, for an issue, the list of gates due and
flags the missing ones.

## Definition of done

- [x] Risk→gate matrix in the kit, documented format — *verify: auto*
- [x] Resolution: for an issue, the list of mandatory gates according to `risk` — *verify: auto*
- [x] Missing `risk` = `medium`; a project can only tighten — *verify: auto*
- [x] Tests per risk level — *verify: auto*
- [ ] L1 documentation of the mechanism — *verify: human*
- [ ] Is the default tiering sane for real projects — *verify: human*

## Notes

- The heart of ADR-0007. Nothing is "always on": that is the anti-over-engineering stance. Depends on the kit (ISS-0107).

## Audit — 2026-08-10

**Verdict:** GO_PENDING_HUMAN

### Checks
- [x] Tests pass (325)
- [x] Machine-verifiable DoD items (`verify: auto`) complete
- [x] Rules respected
- [x] Documentation aligned

### Notes
`baselineViolations()` now enforces the six low-tier floor gates, detects removal, narrowing, and kind downgrades, and is wired into doctor with regression coverage. The documentation marker is mapped to the current closed verification taxonomy.

### Awaiting human judgment
- [ ] Doc L1 du mécanisme
- [ ] Le tiering par défaut est-il sain pour de vrais projets


**Verdict:** NO_GO

### Checks
- [x] Tests pass (313)
- [ ] Issue checklist complete
- [ ] Rules respected
- [ ] Documentation aligned

### Notes
[WARNING] src/lib/quality.ts:141-143 resolves whatever tiers a project writes, without a reference baseline or validation that would prevent removing a mandatory lower-tier gate. The stated contract that a project may only tighten is therefore not enforced. In addition, the `verify: doc L1` DoD item is treated as unqualified by `lyt lint` and remains unchecked.

### To fix before next review
- [x] Enforce or narrow the claim that project matrices may only tighten the baseline, with regression coverage.
- [x] Implement or explicitly map the `verify: doc L1` marker and complete the documentation and human-review criteria.

## Response to audit — 2026-08-10

**Both points accepted and fixed.** The [WARNING] was correct: the tighten-only contract lived in prose only.

`baselineViolations()` in `src/lib/quality.ts` now enforces it, wired into `lyt doctor` as a
warning. The floor is deliberately the **six `low` gates**, not the whole catalog: "never loosen
below `low`" is what this issue says, and enforcing the full shipped table would forbid dropping
`ds-conformance` on a project with no UI — the exact over-engineering the matrix exists to
prevent. Three loosenings are caught: a floor gate removed, a floor gate narrowed out of a tier,
a floor gate downgraded from `gate` to `reviewer`/`human`.

Coverage: 6 unit cases in `tests/lib/quality.test.ts` (including "the kit shipped by `lyt init`
satisfies its own floor" and "dropping a non-floor gate is allowed") plus a `lyt doctor`
integration case. The doctor fixture was under-specified — it claimed to be a healthy project
with a one-row kit; it now carries the real floor.

`verify: doc L1` was resolved the other way, per the decision on the closed taxonomy: the marker
is now `verify: human` and the doc level stays in the item text. ISS-0116 (doc levels L0–L4) owns
the question of making levels first-class. Mechanism doc added to `method/quality/kit.md`; `lyt gates`
is now documented on the website (EN + FR).

Remaining: the human judgment on whether the default tiering is sane for real projects — that one
is yours, and it is what `GO_PENDING_HUMAN` is for.
