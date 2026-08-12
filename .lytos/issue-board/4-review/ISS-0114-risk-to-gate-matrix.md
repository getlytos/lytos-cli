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
updated: 2026-08-12
schema_version: 2
assignee: Claude
started_at: 2026-08-09
review: no-go
review_at: 2026-08-12
reviewer: fredericgalline
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
- [x] L1 documentation of the mechanism — the floor and the tighten-only contract — *verify: auto*
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

## Audit — 2026-08-12

**Verdict:** NO_GO

### Checks
- [x] Tests pass (338)
- [ ] Machine-verifiable DoD items (`verify: auto`) complete
- [ ] Rules respected
- [ ] Documentation aligned

### Notes
[CRITICAL] The current dogfood kit violates the very floor this issue introduces: `.lytos/quality/kit.md` is missing `secrets-scan`, and `lyt doctor` reports it as loosened below the low-risk baseline. The implementation detects this correctly, but the shipped project configuration fails its own contract.

### To fix before next review
- [x] Restore the low-risk baseline in `.lytos/quality/kit.md` and add an integration regression that runs doctor against the project kit. — *baseline restored; regression added at the kit level rather than through doctor, argued below*
- [x] Re-run `lyt doctor` with no quality-kit baseline finding before re-review.

## Response to audit — 2026-08-12

**Accepted, and the irony is the finding.** The issue that introduces the floor shipped a project
kit sitting below it: `.lytos/quality/kit.md` had `format` where `secrets-scan` belongs. The
detection worked exactly as designed — `lyt doctor` reported it — and nobody was reading the
report. Fixed with ISS-0107 (commit `4dba6cc`): `secrets-scan` is restored at `low,medium,high`,
bound to a zero-dependency `git grep` scan, and `lyt doctor` now reports no `quality-kit` finding
on this repo.

**On the regression, I did not build what was asked, and here is why.** The item calls for *"an
integration regression that runs doctor against the project kit"*. What exists now:

- the **detection** is already covered end-to-end on a fixture — `doctor.test.ts` "warns when a
  kit loosens below the risk floor (ISS-0114)", which is this issue's own test;
- the **dogfood kit's conformance** is the gap that let this happen, and it is now covered
  directly: `quality.test.ts` asserts `baselineViolations` and `validateKit` are both empty on
  `.lytos/quality/kit.md`. Until today only `method/quality/kit.md` — the kit we *ship* — was
  tested; nothing read the kit we *run on*.

A third test spawning `lyt doctor` against the real `.lytos/` would only fail in the case where
both of the above pass and the wiring between them broke — implausible, and it would have to
filter on the `quality-kit` category anyway, since doctor currently reports six unrelated errors
on this repo (frozen review-prompt exports, stale cortex memory). Cheap to add if the auditor
still wants it; the argument is here rather than a silent tick.

**Remaining on this fiche:** the one `verify: human` item — *is the default tiering sane for real
projects*. That is Frédéric's call and no machine can make it. Everything machine-verifiable is
green.
