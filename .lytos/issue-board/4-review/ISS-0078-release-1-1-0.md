---
id: ISS-0078
title: "Release 1.1.0 — frontmatter schema v2"
type: chore
priority: P1-high
effort: XS
complexity: light
domain: [release, npm]
skill: documentation
skills_aux: [testing]
status: 4-review
branch: "chore/ISS-0078-release-1-1-0"
depends: [ISS-0074]
created: 2026-05-25
updated: 2026-05-25
schema_version: 2
started_at: 2026-05-25
assignee: fredericgalline
review_at: 2026-05-25
---

# ISS-0078 — Release `1.1.0` — frontmatter schema v2

## Context

[`ISS-0074`](../5-done/ISS-0074-frontmatter-schema-v2.md) shipped frontmatter schema v2 (phases 1-3) — an additive, backward-compatible extension of the issue frontmatter that lets the project answer "which AI did this, who managed it, at what cost". Per semver this is a **minor** release: existing v1 repos keep working, but new behavior is exposed (`lyt review --verdict`, conditional `Assignee` / `Review` columns in `lyt board`, soft `info` warnings on v1 issues in `lyt doctor`).

`1.0.x` shipped without schema v2 ; `1.1.0` is the first release that carries it.

## Proposed solution

Bump `lytos-cli` from `1.0.1` to `1.1.0`, run the standard release validation, leave the bump on its own branch for review before merge + publish.

## Definition of done

- [x] `package.json` version is `1.1.0`
- [x] `package-lock.json` root version is `1.1.0`
- [x] `npm run build` passes
- [x] `npm test` is green (173/173)
- [x] `npm pack --dry-run` is clean (lytos-cli-1.1.0.tgz, 84.7 kB, 19 files)
- [x] Issue moved to `4-review` for PR review

## Relevant files

- `package.json`
- `package-lock.json`

## Notes

- This issue is the bump + validation only. The actual `npm publish` and `git tag v1.1.0` happen post-merge on `main`, by a human (or a release workflow if/when one exists).
- Release notes for the changelog (consumer-facing):
  - **New** : frontmatter schema v2 (optional, backward-compatible) — ADR-0001.
  - **New** : `lyt review --verdict go|no-go|pending` writes the verdict + lifecycle fields directly.
  - **New** : `lyt board` surfaces `Assignee` / `Review` columns when v2 fields are present.
  - **New** : `lyt doctor` emits a soft `info` finding for v1 issues (zero impact on health score).
  - **New** : `lyt start` / `lyt close` write lifecycle fields (`started_at`, `completed_at`, `commits`, `assignee`) and bump `schema_version: 2` on touched issues.
  - **Compat** : v1 issues continue to parse unchanged. No migration is required.
