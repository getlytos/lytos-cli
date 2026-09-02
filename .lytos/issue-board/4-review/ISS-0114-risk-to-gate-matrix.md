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
branch: feat/ISS-0114-flag-the-gates-nothing-carries
depends: [ISS-0107]
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
- [x] Is the default tiering sane for real projects — *verify: human*

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

## Audit — 2026-08-31

**Verdict:** NO_GO

### Checks
- [x] Tests pass (326 on the declared branch; 350 on the exporter branch)
- [ ] Machine-verifiable DoD items (`verify: auto`) complete
- [ ] Rules respected
- [ ] Documentation aligned

### Notes
[CRITICAL] The declared branch `claude/claude-loops-lytos-wtkc94` does not contain the baseline
repair from `4dba6cc`. Running `lyt doctor` on that branch still reports that `secrets-scan` is
missing, while the exported packet shows the repair from another ref. The audit target and the
implementation diff are not the same tree.

[CRITICAL] The promised "flags the missing ones" behavior is absent. `lyt gates ISS-XXXX` lists
the catalog rows selected by risk and exits successfully, but it does not compare them with the
issue's DoD, execute them, or report required gates that are missing. These review issues use bare
`verify: auto` markers and the command still reports success.

[WARNING] The shipped default matrix does not implement the documented tiers completely:
`method/quality/kit.md` puts `screen-reader` only at high although the issue puts accessibility at
medium, and it has no doc-L1, doc-L2, or architecture-review entry promised by the gesture.

The mandatory medium-risk gates are also red: formatting fails on 51 source files on the current
tree (and `format:check` is absent on the declared branch), while `npm audit --audit-level=high`
reports five high-severity vulnerabilities.

### To fix before next review
- [x] Align the declared branch with the corrections being audited. — *repointed to `chore/ISS-0126-translate-live-fiches-to-english`, which contains `4dba6cc`; the branch was stale, not the work*
- [x] Implement detection/reporting of mandatory gates missing for an issue, with a regression that currently fails on a bare-auto DoD. — *`gateCoverage()` + the flagged section in `lyt gates`, 9 regressions*
- [x] Align the shipped default tiers with the issue/ADR, or narrow those promises explicitly. — *`architecture-review` added; doc-L1/L2 and a11y-at-medium narrowed with their reasons, next to the table*
- [x] Make the mandatory format and dependency-audit gates green. — *`format:check` clean, `npm audit --omit=dev` at 0; dev-side advisories are ISS-0143*

## Response to audit — 2026-08-31

Both points accepted. The first was a promise the gesture made and the command never kept.

### 1. "Flags the missing ones" — it did not, and now it does

The audit was right: `lyt gates ISS-XXXX` listed the catalog rows selected by risk and exited,
never once looking at the issue. The gesture's own sentence — *"resolves, for an issue, the list of
gates due **and flags the missing ones**"* — had no implementation behind it.

`gateCoverage()` compares the mandatory gates against the fiche's Definition of Done and sorts
them three ways. **The asymmetry is the whole value**, and it is what keeps this from being noise:

| | Flagged? | Why |
|---|---|---|
| pinned by a DoD item | no | carried |
| unpinned, `kind: gate` | **no** | CI runs `npm test` whether or not a DoD item names it — and ISS-0107 deliberately kept pins optional so one-off assertions stay in DoDs |
| unpinned, `reviewer` or `human` | **yes** | no command will ever run these; absent from the DoD, they are mandatory on paper and discharged by nobody |

Flagging the machine gates too would have produced a warning on every issue in the repository,
which is how a signal becomes wallpaper.

One thing had to be fixed underneath: the pin syntax only recognised `auto:<id>`, so the two kinds
that most need carrying had **no way to be pinned at all**. `verify: reviewer:over-engineering`
and `verify: human:product-intent` now read as pins. This is not a taxonomy change — the mode
still says who verifies; the pin just also names which kit entry the item discharges.

Dogfooded on this board the moment it built: `lyt gates ISS-0114` flags `over-engineering` as
carried by nothing, on this very fiche. It is right, and the fiche now says so.

`lyt gates` stays read-only and exits 0. Flagging is not failing: this command reports, and
turning it into a gate of its own is a decision with its own blast radius, not a side effect of
fixing a report.

### 2. The shipped tiers — one added, two narrowed on the record

- **`architecture-review` (reviewer, high) added** to both `kit.md` copies. It was promised by the
  gesture, absent from the table, and a reviewer rubric costs nothing to bind.
- **Doc levels L1 and L2 — narrowed, not added.** ISS-0116 owns making documentation levels
  first-class. A `doc-L1` row today would have no honest `tool`, and would sit in the table
  *looking* enforced — precisely the failure `kit.md` opens by naming.
- **`screen-reader` stays at `high`.** The gesture puts a11y at medium, but `screen-reader` is a
  `human` gate: mandatory at medium, it stops every medium-risk change for a person. That is the
  opposite of rigor following blast radius, on the fiche whose entire thesis is that rigor follows
  blast radius. Medium-tier UI work is covered by `ds-conformance`, a machine gate. A project whose
  blast radius justifies more can tighten — that is what tightening is for.

Both narrowings are written next to the table in `method/quality/kit.md`, where the next reader
meets them, not only here.

### 3. The mandatory gates — green

`format:check` clean; `npm audit --omit=dev --audit-level=high` at 0 vulnerabilities. The five
high advisories the audit cited are dev-toolchain only: ISS-0143.

### A defect this fiche caught on itself

Writing the paragraph above — the one quoting \`verify: reviewer:over-engineering\` as the fix —
**silenced the flag it was describing**. The pin resolver scanned the whole fiche, so prose *about*
a pin counted as a pin, and `lyt gates ISS-0114` went quiet on the very gate it had just correctly
reported.

Exactly the shape `ready.ts:41` already guards against: a stray "out of scope" in a note used to
make an issue *look* ready. Pin extraction is now scoped to the Definition of Done section, fences
excluded, through a `dodSection()` helper shared with the DoD parser — one reader, one contract.

Four existing tests had to change with it: they passed bare checklist lines with no DoD heading,
which was testing an implementation shortcut rather than the contract. Three new cases cover the
real behaviour — prose ignored, fenced sample ignored, actual DoD item read.

383 tests green.
