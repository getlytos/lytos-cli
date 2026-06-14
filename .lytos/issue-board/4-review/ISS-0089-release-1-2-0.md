---
id: ISS-0089
title: Release 1.2.0 — lyt absorb + migrate-frontmatter + ai_reviewer + doctor fixes
type: chore
priority: P1-high
effort: XS
complexity: light
domain: [release, npm]
skill: documentation
skills_aux: [testing]
status: 4-review
branch: chore/ISS-0089-release-1-2-0
depends: [ISS-0076, ISS-0077, ISS-0060, ISS-0079]
created: 2026-06-14
updated: 2026-06-14
schema_version: 2
assignee: fredericgalline
---
# ISS-0089 — Release `1.2.0`

## Context

Since `1.1.0`, `main` has shipped **Sprint #03** (closing the schema v2 epic) plus the `ai_reviewer` write path. All additive and backward-compatible → per semver a **minor** release.

## Proposed solution

Bump `lytos-cli` from `1.1.0` to `1.2.0`, run the standard release validation (build / test / pack), tag + publish on `main`.

## Definition of done

- [x] `package.json` version is `1.2.0`
- [x] `package-lock.json` root version is `1.2.0`
- [x] `npm run build` passes
- [x] `npm test` green (205/206 — the single failure is the pre-existing flaky `claim.test.ts` git-timeout, [[ISS-0086]], passes in isolation 9/9)
- [x] `npm pack --dry-run` is clean
- [ ] `git tag v1.2.0` + `npm publish` (human, post-validation)

## Notes — release notes (consumer-facing)

- **New** : `lyt absorb [issue]` — ingest an AI session journal (`.lytos/.runtime/session.jsonl`) to fill `ai_implementer` / `tokens` / `cost` / `skills_used` (schema v2 phase 4, ADR-0003). Dry-run by default.
- **New** : `lyt migrate-frontmatter` — backfill `schema_version` + lifecycle dates on existing / archived / icebox issues that never hit an auto-migration write path (phase 5). Dry-run by default.
- **New** : `lyt review --verdict` now writes `ai_reviewer` (cross-model attribution, ADR-0001 phase 3/4).
- **Fix** : `lyt doctor` — two false-positive classes removed (repo-relative links resolved against repo root, archived-issue dependency targets).
- **Scaffold** : `lyt init` now gitignores the derived `.lytos/issue-board/BOARD.md` and the `.lytos/review/` work area from day one.
- **Compat** : no migration required; v1 repos keep working.
