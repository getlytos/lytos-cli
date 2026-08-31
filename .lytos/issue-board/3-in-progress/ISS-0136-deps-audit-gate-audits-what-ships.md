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
status: 3-in-progress
branch: fix/ISS-0133-audit-diff-scoped-to-the-issue
depends: [ISS-0107]
created: 2026-08-31
updated: 2026-08-31
schema_version: 2
risk: low
assignee: Claude
started_at: 2026-08-31
review: no-go
review_at: 2026-08-31
reviewer: fredericgalline
ai_reviewer:
  model: gpt-5
  session: codex-api
  prompt_ref: skills/code-review/SKILL.md
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
