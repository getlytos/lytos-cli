---
id: ISS-0068
title: "Extract review prompt template out of src/lib/review.ts"
type: refactor
priority: P3-low
effort: S
complexity: light
domain: [cli, review]
skill: code-structure
skills_aux: [testing]
status: 1-backlog
branch: "refactor/ISS-0068-extract-prompt-template"
depends: []
created: 2026-04-22
updated: 2026-04-22
---

# ISS-0068 — Extract review prompt template out of `src/lib/review.ts`

## Context

`src/lib/review.ts` currently sits at 352 lines, above the default-rules threshold of 300. The `buildPrompt` function alone is 99 lines (limit: 50). The bulk of both numbers is the prompt template literal — the actual procedural code (helpers, parsers, file I/O) is small.

Surfaced as a SUGGESTION in the GO audit of ISS-0059 on 2026-04-22.

The template literal is also the thing reviewers want to read and edit in isolation: it's the cross-model contract — the wording shapes how every fresh auditor session frames the work. Keeping it inline with helper code makes diffs noisier than they need to be and forces unrelated changes to fight over the same file.

## Proposed solution

Extract the template into its own module:

- New file: `src/lib/review-prompt-template.ts`
- Exports a single function (e.g. `renderPrompt(opts: PromptInputs): string`) that takes the already-resolved inputs (manifest, rules, skill, issue body, diff, branch ref, issue ID) and returns the assembled markdown.
- `buildPrompt` in `src/lib/review.ts` keeps the orchestration: read files, resolve branch, generate diff, then call `renderPrompt(...)` with the resolved inputs.

This keeps:

- `src/lib/review.ts` under 300 lines and `buildPrompt` near the 30-line target
- The template editable as a self-contained file — diff noise on prompt tweaks is contained
- All file I/O and git execution in `review.ts`, so the template module is pure and trivially testable

## Definition of done

- [ ] `src/lib/review-prompt-template.ts` exists and exports `renderPrompt` (or similar)
- [ ] `src/lib/review.ts` is under 300 lines
- [ ] `buildPrompt` is under 50 lines (target: 30)
- [ ] No behavior change — existing `tests/commands/review.test.ts` still passes byte-for-byte (snapshot the prompt before and after to confirm)
- [ ] New unit test that calls `renderPrompt` directly with synthetic inputs and asserts the 9 sections are present in order
- [ ] Coverage on the touched modules does not regress (target ≥ 80%)

## Relevant files

- `src/lib/review.ts` — orchestration stays here, template extracted
- `src/lib/review-prompt-template.ts` — new
- `tests/commands/review.test.ts` — keep passing, optionally add snapshot
- `tests/lib/review-prompt-template.test.ts` — new (sections-in-order test)

## Notes

- Pure refactor. No new feature, no UX change.
- Worth doing **before** the next prompt-content change — once the template moves, every tweak to the wording lands in a small, focused diff.
- Out of scope: changing the prompt content itself, splitting `applyAudit` (it's 45 lines, within limits), or restructuring the `--accept` flow.
