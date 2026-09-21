---
id: ISS-0150
title: "Frontmatter round-trip turns `skill: \"\"` into trailing whitespace"
type: fix
priority: P2-normal
effort: XS
complexity: light
domain: [cli]
skill: 
skills_aux: []
status: 3-in-progress
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

- [ ] `serializeFrontmatter({ skill: "" })` produces `skill: ""`, with no trailing whitespace on
      the line — verify: auto
- [ ] A parse → serialize → parse round-trip of an issue with an empty-string field (e.g.
      `skill: ""`) preserves the empty-string value and introduces no trailing whitespace —
      verify: auto
- [ ] Another empty-string field (e.g. `branch: ""`) gets the same fix, covered by a test —
      verify: auto
- [ ] An integration test drives the actual fix: `lyt start` (or `lyt move`) on an issue whose
      frontmatter holds `skill: ""` no longer rewrites that line to trailing whitespace —
      verify: auto
- [ ] Full test suite, `tsc --noEmit`, and `eslint src/` all pass — verify: auto

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
