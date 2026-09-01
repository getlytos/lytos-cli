---
id: ISS-0074
title: Frontmatter schema v2 (durable auditability)
type: feat
priority: P1-high
effort: L
complexity: heavy
domain: [schema, parser, template, audit]
skill: code-structure
skills_aux: [testing, documentation]
status: 5-done
branch: feat/ISS-0074-frontmatter-schema-v2
depends: []
created: 2026-05-23
updated: 2026-05-25
schema_version: 2
completed_at: 2026-05-25
commits: [17efe29, 3aca299, 2e34141, 546d59c, 74194e1, dee6a83]
review: go
review_at: 2026-05-25
reviewer: fredericgalline
started_at: 2026-05-25
---
# ISS-0074 — Frontmatter schema v2 (durable auditability)

## Context

The current frontmatter is calibrated for a hand-written MVP workflow. It carries no auditability information at all: who implemented (human and AI), who reviewed, at what cost in tokens and in money, on exactly which prompts and skills, with what verdict, what risk, what confidence.

That is precisely what separates Lytos from vibecoding. Without these fields the trace is lost the moment the AI session closes. With them, we can answer in two years' time: *which AI did this, who managed it, at what cost?*

Durable decision: see [`ADR-0001-frontmatter-schema-v2`](../../adr/ADR-0001-frontmatter-schema-v2.md).

## Proposed solution

Extend the frontmatter with roughly 15 new fields, **all optional and backward-compatible**, organised in five categories: human accountability, AI traceability, lifecycle, audit & cost, decision & risk, Git artifacts.

The implementation runs in **five independent phases** (each shippable on its own):

1. **Spec + parser** — accept the new fields without using them
2. **Read support** — display the new fields in `lyt board` and `lyt doctor`
3. **Automatic write support** — `lyt start` / `lyt review` / `lyt close` write lifecycle + verdict
4. **AI wrapper integration** — a separate issue per target (Claude Code, Cursor, …)
5. **Migration helper** — `lyt migrate-frontmatter` to backfill existing repositories

## Definition of done

- [x] ADR-0001 is merged and referenced from `manifest.md`.
- [x] The `issue-feature.md` template is updated (v2 fields commented "auto" vs "manual").
- [x] The validator accepts every new field with its value domain.
- [x] The parser politely ignores unknown fields (forward compatibility).
- [x] No existing v1 issue breaks — regression tests over the whole current board.
- [x] `lyt doctor` reports v1 issues as a soft warning, not an error.
- [x] `lyt start` / `lyt review` / `lyt close` write the lifecycle fields automatically.
- [x] `lyt review --verdict go|no-go|pending` writes `review`.
- [x] Documentation up to date in `method/` and `docs/`. *(template + ADR-0001 referenced from the manifest; CLI help updated for `--verdict`)*
- [x] Tests: parsing, validation, write paths, migration. *(parsing + validation + write paths delivered; the migration tests live in [[ISS-0077]], which owns the command)*

## Checklist

### Phase 1 — Spec + parser
- [x] Update `issue-feature.md` (template) with the commented v2 fields.
- [x] Extend the parser to accept every optional v2 field.
- [x] Extend the validator with the value domains (review, risk, validation.*).
- [x] Parser tests: valid v1, valid v2, unknown fields ignored, out-of-domain values rejected.

### Phase 2 — Read support
- [x] `lyt board` displays `review` / `assignee` when present.
- [x] `lyt doctor` detects v1 issues and offers the migration.
- [x] E2E tests on a mixed v1/v2 repository.

### Phase 3 — Automatic write support
- [x] `lyt start` writes `started_at` + `assignee` (from the git config).
- [x] `lyt review` writes `review_at`, `reviewer`, and `review` according to `--verdict`.
- [x] `lyt close` writes `completed_at` + `commits` (via git log).
- [x] Tests: each command edits the frontmatter correctly and keeps the YAML clean.

### Phase 4 — AI wrapper integration *(split out → [[ISS-0076]])*
This phase is carried by a dedicated issue because it depends on a contract ADR (AI journal → frontmatter) and on N implementations, one per target (Claude Code, Cursor, Codex CLI). See [[ISS-0076]].

### Phase 5 — Migration *(split out → [[ISS-0077]])*
This phase is carried by `lyt migrate-frontmatter` in a dedicated issue. Not blocking: the automatic migration through `lyt start/close/review` already covers every actively touched issue. See [[ISS-0077]].

## Relevant files

- `.lytos/adr/ADR-0001-frontmatter-schema-v2.md` (the decision)
- `.lytos/issue-board/templates/issue-feature.md` (project template) + `method/issue-board/templates/issue-feature.md` (the template `lyt init` distributes)
- `src/lib/frontmatter.ts` (parser/serializer — phase 1)
- `src/lib/linter.ts` (validator — phase 1)
- `src/commands/start.ts` / `src/commands/close.ts` / `src/lib/review.ts` (write paths — phase 3)
- `tests/lib/frontmatter.test.ts` (unit tests parser — phase 1)
- `tests/commands/lint.test.ts` (integration tests validator — phase 1)
- `method/` (user documentation — phases 2/3)

## Notes

- **Absolute backward compatibility**: non-negotiable. Every v1 repository must keep working untouched.
- **Auto-population**: the v2 fields should almost never be written by hand — adoption fails if manual filling is imposed. See the table in the ADR.
- **Cross-repo**: delivering phase 1 + phase 3 (at minimum `review`) unblocks the lytos-app issue **ISS-0018** (the green/red dot). Coordinate both sides.
- **Out of scope**: a comment system, per-issue permissions, sub-tasks. Lytos is not Jira.
- **Future evolution**: v3 will need a new ADR. This issue does not fix the future, only the v2 present.
- The lytos-app manifest gained an explicit line — "we prefer durable auditability over disposable speed" — which justifies this schema; see the lytos-app manifest, Principles section.
