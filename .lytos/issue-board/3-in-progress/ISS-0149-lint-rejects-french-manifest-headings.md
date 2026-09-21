---
id: ISS-0149
title: `lyt lint` rejects a French manifest — section headings are English-only
type: fix
priority: P1-high
effort: S
complexity: standard
domain: [cli]
skill: 
skills_aux: []
status: 3-in-progress
branch: fix/ISS-0149-lint-only-recognizes-english-headings
depends: []
created: 2026-09-21
updated: 2026-09-21
schema_version: 2
risk: low
assignee: fredericgalline
started_at: 2026-09-21
---
# ISS-0149 — `lyt lint` rejects a French manifest — section headings are English-only

## Context

`lyt init` with `language: fr` generates a manifest with French section headings
(`## Identité`, `## Pourquoi ce projet existe`, `## Stack technique` — `templates.ts` around
line 49, 60, 76). `MANIFEST_SECTIONS` in `linter.ts` (around lines 58-74) only recognizes the
English spellings (`## Identity`, `## Why this project exists`, `## Tech stack`). A project
scaffolded in French fails `lyt lint` out of the box — three "Missing section" errors on a
manifest that is, in fact, complete. Every cross-model audit (`lyt review`) of such a project
then returns `NO_GO` for the same non-reason. Observed on a real French project on 2026-09-21.

The two lists (template headings, linter expectations) are hand-kept in sync across two files in
two different languages. Nothing enforced that they matched, and they didn't.

The same shape shows up in `PLACEHOLDER_PATTERNS`: the "empty owner" check looks for literal
`| Owner |`, which never matches the French template's `| Propriétaire | |` row — a French
manifest with an unfilled owner field is silently not flagged. The "why" placeholder-text check
(`*3-5 sentences. The "why"`) is English-only prose and never matches the French template's
`*3-5 phrases. Le "pourquoi"...*` line, for the same reason. (The "empty description" pattern is
unaffected — the French template keeps the English loanword "Description" for that row.)

## Proposed solution

Single source of truth: define the manifest section headings, the "owner" field label, and the
"why" placeholder text once per supported language (English, French today), in one module.
`templates.ts` interpolates from it when generating a manifest; `linter.ts` builds its checks
from the same data instead of hardcoded English regexes. The linter does not need to know a given
manifest's declared language for this — it accepts whichever supported language's heading/label
is present, which is simpler than threading a language setting through `lint()`. Error messages
and fix hints stay in English (CLI output is English per `.lytos/rules/cli-rules.md`); only the
manifest content itself is bilingual.

## Ready

- **Scope** — one shared definition for manifest section headings + the language-dependent
  placeholder patterns (owner label, "why" placeholder text), consumed by both `templates.ts` and
  `linter.ts`, so the two cannot silently diverge again.
- **Constraints** — CLI output (messages, fix hints) stays English. No new dependency (no i18n
  library; still hand-rolled per `.lytos/rules/cli-rules.md`). Which sections are *required* does
  not change — only which spellings satisfy them. The "empty description" placeholder check is
  untouched (already language-agnostic).
- **Out of scope** — reading a manifest's declared language from config to narrow the check to
  one language; adding languages beyond en/fr; an `--fix` auto-fixer; unrelated linter checks.
- `risk: low` — the linter only becomes more permissive (accepts a second, already-generated
  spelling); no existing valid manifest can start failing.

## Definition of done

- [x] Manifest section headings and the language-dependent placeholder labels are defined once,
      per language, and imported by both `templates.ts` and `linter.ts` — verify: auto
- [x] A manifest generated from the French template passes `lyt lint`'s section and placeholder
      checks — verify: auto
- [x] A manifest generated from the English template still passes `lyt lint` — verify: auto
- [x] A manifest missing a section still fails lint, in both English and French — verify: auto
- [x] A regression test fails if a template heading and the linter's expectation ever diverge
      (lints each language's generated manifest) — verify: auto
- [x] Full test suite, `tsc --noEmit`, and `eslint src/` all pass — verify: auto

## Relevant files

- `src/lib/linter.ts` — `MANIFEST_SECTIONS`, `PLACEHOLDER_PATTERNS`
- `src/lib/templates.ts` — `manifestTemplate()`
- `src/lib/manifest-sections.ts` — new shared source of truth (headings + placeholder labels per
  language)
- `tests/lib/manifest-sections.test.ts` or `tests/commands/lint.test.ts` — regression coverage

## Notes

- Found via a real French `.lytos/` project failing `lyt lint` and `lyt review` immediately after
  `lyt init --language fr`.

## Delivered — 2026-09-21

`src/lib/manifest-sections.ts` is the new shared source of truth: `MANIFEST_SECTIONS` (heading
per language, keyed `identity`/`why`/`stack`), `MANIFEST_OWNER_LABEL`, and
`MANIFEST_WHY_PLACEHOLDER`. `templates.ts`'s `manifestTemplate()` interpolates the heading and
label for the requested language instead of hardcoding them inline. `linter.ts` builds
`MANIFEST_SECTIONS` (its own local, pattern-bearing array) and the last two `PLACEHOLDER_PATTERNS`
entries from the same source, matching any supported language via a small `anyLanguagePattern`
helper — the manifest's declared language is never read; whichever spelling is present is
accepted. Verified against the original bug by stashing the fix, rebuilding, and re-running `lyt
lint` on a manifest generated by the (already-fixed) French template: reproduced the exact 3
"Missing section" errors plus 2 silently-missed placeholder warnings, then confirmed they're gone
with the fix restored.

`tests/lib/manifest-sections.test.ts` lints a fresh `manifestTemplate()` output for every language
in `MANIFEST_LANGS` (currently en/fr) and asserts no "Missing section" finding — this is the test
that would fail the day a heading and the linter's expectation diverge again. It also checks the
owner/placeholder warnings still fire per language, and that removing any one section from a
generated manifest, in either language, still produces the matching "Missing section" error.

Full suite: 404 passed (32 files). `tsc --noEmit`, `eslint src/`, and `prettier --check` all clean.
