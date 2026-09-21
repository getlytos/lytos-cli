---
id: ISS-0150
title: "Frontmatter round-trip turns `skill: \"\"` into trailing whitespace"
type: fix
priority: P2-normal
effort: XS
complexity: light
domain: [cli]
skill: ""
skills_aux: []
status: 4-review
branch: fix/ISS-0150-empty-frontmatter-values-keep-their-quotes
depends: []
created: 2026-09-21
updated: 2026-09-21
schema_version: 2
risk: low
assignee: fredericgalline
started_at: 2026-09-21
---
# ISS-0150 — Frontmatter round-trip turns `skill: ""` into trailing whitespace

## Context

`quoteIfNeeded()` in `src/lib/frontmatter.ts` (around line 102) only adds quotes when a value
contains `:` or `#`. An empty string satisfies neither, so it comes back unquoted — and
`serializeFrontmatter()` then writes `` `${key}: ${value}` `` with `value` empty, producing
`skill: ` — colon, one space, nothing: trailing whitespace with no visible value, instead of the
`skill: ""` that was there before.

`moveIssue()` in `src/lib/issue-ops.ts` calls `serializeFrontmatter()` to rewrite an issue's
frontmatter, and backs `lyt start`, `lyt move`, and `lyt close` — so every transition of an issue
that holds an empty-string field rewrites that line to trailing whitespace. `skill` is the most
common case: every issue template ships it as `skill: ""` (an optional hint, empty by default —
see `.lytos/issue-board/templates/issue-feature.md`), so most transitions hit this. `claim.ts` and
`review.ts` call `serializeFrontmatter()` directly too and share the same defect.

Reproduced directly on ISS-0149's own issue file during that work: it was written by hand as
`skill: ""`, and `lyt start ISS-0149` rewrote the line to `skill: ` (trailing space) in place.
A cross-model review flagged the trailing whitespace as a defect; it comes back on the very next
transition since nothing fixes it at the source.

## Proposed solution

`quoteIfNeeded()` should render an empty string explicitly as `""`, not as nothing. One-line
change to the one function both the top-level and nested-object serialization paths already share
— no new call site, no parser change needed: `parseFrontmatter()` already strips `""` back to `""`
correctly (see the existing "does not confuse a v1 quoted-empty value..." test in
`tests/lib/frontmatter.test.ts`).

## Ready

- **Scope** — `quoteIfNeeded()` in `src/lib/frontmatter.ts` serializes an empty string as `""`
  instead of nothing, for every field that holds one (top-level and nested-object subvalues alike,
  since both paths call the same helper).
- **Constraints** — no change to `parseFrontmatter()` (it already round-trips `""` correctly); no
  change to the existing `:`/`#` quoting heuristic for non-empty values; no change to how empty
  lists (`[]`) serialize — that path is separate and already correct.
- **Out of scope** — broader YAML-quoting correctness (values starting with `[`/`{`, leading or
  trailing spaces inside a non-empty value, values that look like booleans or numbers) — real gaps
  if they ever bite, but a different issue.
- `risk: low` — the fix makes output more explicit for a case that previously produced ambiguous,
  trailing-whitespace output; nothing that parsed correctly before stops parsing correctly now.

## Definition of done

- [x] `serializeFrontmatter({ skill: "" })` produces `skill: ""`, with no trailing whitespace on
      the line — verify: auto
- [x] A parse → serialize → parse round-trip of an issue with an empty-string field (e.g.
      `skill: ""`) preserves the empty-string value and introduces no trailing whitespace —
      verify: auto
- [x] Another empty-string field (e.g. `branch: ""`) gets the same fix, covered by a test —
      verify: auto
- [x] An integration test drives the actual fix: `lyt start` (or `lyt move`) on an issue whose
      frontmatter holds `skill: ""` no longer rewrites that line to trailing whitespace —
      verify: auto
- [x] Full test suite, `tsc --noEmit`, and `eslint src/` all pass — verify: auto

## Relevant files

- `src/lib/frontmatter.ts` — `quoteIfNeeded()`, `serializeFrontmatter()`
- `src/lib/issue-ops.ts` — `moveIssue()` (consumer; backs `lyt start` / `lyt move` / `lyt close`)
- `tests/lib/frontmatter.test.ts` — unit regression coverage
- `tests/commands/start.test.ts` or `tests/commands/move.test.ts` — integration-level regression

## Notes

- Found via a cross-model review flagging trailing whitespace on `skill:` after a transition;
  reproduced directly on ISS-0149's own issue file in the same session.
- Companion fix to ISS-0149 (different root cause, different files) — kept as a separate issue on
  its own branch off `origin/main` per the constraint that the two must not be stacked.

## Delivered — 2026-09-21

`quoteIfNeeded()` in `src/lib/frontmatter.ts` now returns `""` for an empty string instead of
falling through to the unquoted (and therefore blank) branch. Both call sites in
`serializeFrontmatter()` — the top-level scalar path and the nested-object subvalue path — share
this one helper, so `ai_implementer.model: ""` and similar nested empty strings get the same fix
for free. `parseFrontmatter()` needed no change: it already stripped `""` back to `""` correctly
(covered by an existing test).

Reproduced the bug first (live, on this issue's own `skill: ""` line via `lyt start ISS-0150`),
then fixed it and reproduced the fix: `tests/lib/frontmatter.test.ts` gained a
`serializeFrontmatter — empty string values` block (direct serialization, a second empty field —
`branch` — a nested-object case, and a full parse→serialize→parse round-trip asserting no line in
the output ends in whitespace). `tests/commands/move.test.ts` gained an integration test that
injects `skill: ""` into a real issue fixture, runs `lyt move ISS-0002 4-review`, and asserts the
rewritten frontmatter still reads `skill: ""` with no trailing-whitespace line anywhere in the
block — the same shape as the `lyt start`/`lyt move`/`lyt close` path that triggered the original
report.

Full suite: 399 passed (31 files). `tsc --noEmit`, `eslint src/`, `prettier --check`, and
`secrets:scan` all clean.

## Audit — 2026-09-21

**Verdict:** GO

### Checks
- [x] Tests pass (399 tests in 31 files)
- [x] Machine-verifiable DoD items (`verify: auto`) complete
- [x] Rules respected (format, ESLint, typecheck, secret scan, build, tests, and whitespace diff check pass)
- [x] Documentation aligned

### Notes
The fix is correctly centralized in `quoteIfNeeded()`, so top-level and nested values share it. Regression coverage tests direct serialization, a second scalar field, a nested field, semantic round-trip integrity, and the actual `lyt move` transition that previously reintroduced trailing whitespace.
