---
id: ISS-0136
title: The dependency gate audits the toolchain, not what ships
type: fix
priority: P2-normal
effort: XS
complexity: light
domain: [cli, method]
skill: 
skills_aux: []
status: 5-done
branch: chore/ISS-0132-format-sweep-and-ci-wiring
depends: [ISS-0107]
created: 2026-08-31
updated: 2026-08-31
schema_version: 2
risk: low
assignee: Claude
started_at: 2026-08-31
review: go-pending-human
review_at: 2026-08-31
reviewer: fredericgalline
ai_reviewer:
  model: gpt-5
  session: codex-api
  prompt_ref: skills/code-review/SKILL.md
completed_at: 2026-08-31
commits: [0753d85, 50597d4, 0f5ee92, 51b27ef, 3b7c6f9, c6da535, 81e3307, 30fcdf6, 1f80ea7, 658ab48, d718db9, e670052, cc62f35, 21ea10c, 5aced53, d984b02, d7149c5, c60e9d1, 3fa59b9, 5ae3e05, 4dba6cc, 883a452, cfbc955, 16f484b, d339db7, f2a0c1d, a01a12f, 4a1af88, 89b5157, 4e68b3c, 070d2f5, b81d23f, 349cd9e, 881e87a, d5cf5cb, afae795, ed37ccf, 80d658a, ce6f91d, 230ad0d, 8e0e745, c23fcf6, 76035ed, c34c9cb, a39e1e9, 8665d38, 71e4bfa, 873931c, 31a9a8c, bb502e8, 09f2c4d, 15ba056, 5d3d472, 08d295d, 7aaa7c5, 96fad9d, 24230a0, a8483f3, 7c16fd8, 3c16cd8, a6fac6a, 71ded27, 8b89911, cb17e83, 0933900, c7e454b, f492a0e, 2be7413, f4a5405, d0f5e77, 6a3e84e, 0c86b6c, bce1a82, 35c0d61, 638fc40, a70f8cf, 07e23ed, fa18610, ab68138, 23d0673, 4318a7f, 5740116]
---
# ISS-0136 — Five high-severity findings, none of them reachable by a user

## Context — measured

`deps-audit` is bound to `npm audit --audit-level=high`. It reports **5 high** on this repo, and
it has blocked two audit rounds of ISS-0133 as a mandatory `medium` gate.

Every one of the five is a **dev-only transitive**:

| advisory | path |
|---|---|
| js-yaml | `eslint → @eslint/eslintrc → js-yaml` |
| postcss, nanoid | `tsup → postcss → nanoid` |
| vite, esbuild | `vitest → vite`, `tsup → esbuild` |

`package.json` declares **one** runtime dependency, `commander`, and publishes
`files: ["dist"]` — a tsup bundle. `npm audit --omit=dev --audit-level=high` returns
**0 vulnerabilities**.

So the gate is red on code that cannot reach anyone who installs `lytos-cli`, and the remedy it
implies — `npm audit fix` — would pull **vite 7** (rolldown, lightningcss): a test-toolchain major
bump to close an exposure that does not exist, with a lockfile conflict against the open PR #29
thrown in.

This is ISS-0132's argument about `format`, on the neighbouring row of the same table: **a gate
that is permanently red teaches that red is survivable**, which is the one lesson a quality kit
must never teach. ISS-0132 says the gate must be corrected or removed, never left lying.

## Ready

- **Scope** — rebind `deps-audit` in `.lytos/quality/kit.md` so it audits what the package ships,
  and record the distinction in the shipped template so other projects make the call knowingly.
- **Constraints** — the gate must still be a *gate*: `--omit=dev` narrows what is audited, it does
  not weaken the threshold, which stays `high`. `deps-audit` is not part of the ADR-0007 low-risk
  floor, so `baselineViolations()` is not in play — verify that, do not assume it.
- **Out of scope** — upgrading any dependency. Changing the shipped template's default binding for
  other projects: a web app deploying from source has a genuinely different answer, and choosing
  it for them is exactly the over-reach the matrix exists to prevent. A note, not a default.
- `risk: low` — one table cell and a doc paragraph; no behaviour in `src/`.

## The gesture

`npm audit --audit-level=high` → `npm audit --omit=dev --audit-level=high`.

The honest reading of the gate's question. "Are the dependencies we ship vulnerable?" is a release
question with a real blast radius. "Is any package in `node_modules` vulnerable?" is a different
question, worth asking, but not one that should block an unrelated issue from closing.

The shipped `method/quality/kit.md` keeps its `<e.g. …>` placeholder and gains the distinction in
prose, so a project filling the kit in decides which question it is asking.

## Definition of done

- [x] `.lytos/quality/kit.md` binds `deps-audit` to `npm audit --omit=dev --audit-level=high` — verify: auto
- [x] That command exits 0 on this repo — verify: auto
- [x] `lyt doctor` reports no quality-kit baseline finding after the change — verify: auto
- [x] `method/quality/kit.md` states the ships-vs-toolchain distinction where the binding is chosen — verify: auto
- [ ] Is narrowing to what ships the right call for this project, or is the toolchain worth gating too — verify: human

## Notes

- Field origin: 2026-08-31, ISS-0133's second audit — "Tracking them in ISS-0132 explains the
  sequencing but does not make the mandatory gates pass or waive them for this issue."
- The waiver question that same audit raised is **ISS-0137**, deliberately separate: this fiche
  fixes a gate that was asking the wrong question, which is not the same as excusing a gate that
  is asking the right one.

## Audit — 2026-08-31

**Verdict:** NO_GO

### Checks
- [x] Tests pass (356/356)
- [x] Machine-verifiable DoD items (`verify: auto`) complete
- [ ] Rules respected: the mandatory `format` gate fails on 51 source files
- [x] Documentation aligned

### Notes
The narrowed dependency audit is effective: `npm audit --omit=dev --audit-level=high` exits 0
with no reported vulnerabilities. `lyt doctor --json` also exits 0 with no quality-kit baseline
error, and typecheck, lint, secrets scan, and build all pass. The remaining human question is not
a defect, but the review contract requires `NO_GO` while any mandatory gate is red. ISS-0137 is
only a proposed waiver mechanism and does not waive the current failure.

### To fix before next review
- [ ] Make the mandatory `format` gate green, or return only after an explicit, valid waiver has
  been implemented and granted for this issue.

## Response to audit — 2026-08-31

**No defect was found in this fiche, and none is answered here.** The audit confirmed the narrowed
dependency gate works — `npm audit --omit=dev --audit-level=high` exits 0 — and found typecheck,
lint, secrets, build, `lyt doctor` and 356/356 tests green. The NO_GO was `format`, red on 51
files this issue does not touch.

It was the third such verdict in a row (ISS-0133 twice, then this one), which is what made the
deadlock legible: `format` sits at `low,medium,high`, so it blocked *every* issue at *every* risk
tier. **ISS-0132 has now paid it** — sweep committed, `format:check` green, both unwired gates
added to CI.

`branch:` is repointed to `chore/ISS-0132-format-sweep-and-ci-wiring`, which carries this fiche's
commit plus the sweep. Nothing in `src/` changed for this issue since the audit; only the tree it
is audited on.

## Audit — 2026-08-31 (re-review)

**Verdict:** GO_PENDING_HUMAN

### Checks
- [x] Tests pass (356/356)
- [x] Machine-verifiable DoD items (`verify: auto`) complete
- [x] Rules respected (all mandatory low-risk gates pass)
- [x] Documentation aligned

### Notes
`npm audit --omit=dev --audit-level=high` exits 0 with no reported vulnerabilities. `lyt doctor`
has no quality-kit error, and format, typecheck, lint, secrets scan, and build all pass on the
remote-retrievable review branch. The previous audit's sole blocker has therefore been removed;
the product-level choice about whether to gate the development toolchain remains human-owned.

### Awaiting human judgment
- [x] Is narrowing to what ships the right call for this project, or is the toolchain worth gating too.
