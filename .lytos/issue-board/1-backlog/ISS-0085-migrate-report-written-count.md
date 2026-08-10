---
id: ISS-0085
title: "lyt migrate-frontmatter: report the real `written` count + warn on silent skips"
type: fix
priority: P3-low
effort: S
complexity: light
domain: [cli, audit]
skill: ""
skills_aux: []
status: 1-backlog
branch: "fix/ISS-0085-migrate-report-written-count"
depends: [ISS-0077]
created: 2026-06-14
updated: 2026-06-14
schema_version: 2
---

# ISS-0085 — migrate-frontmatter: a real `written` report, and no silent skip

## Context

Sprint #03 review (ISS-0077). `printReport()` prints `Migrated ${plan.toMigrate}` instead of the real `written` count. If a file is counted in the plan (`parseFrontmatter` accepts it) but `insertFields()` returns `null`, `applyMigration` does a `continue` **without logging** → the report overstates how many files were written and the skip is silent (violating "no silent failures"). Reachable when the opening fence has a trailing space (`--- \n`, accepted by `parseFrontmatter`'s `/^---\s*\n/` but rejected by `insertFields`'s `/^---\r?\n/`) or a leading blank line. Very unlikely on Lytos-generated files (always `---\n`), but real.

## Proposed solution

Report `written` in `--apply` mode, and warn explicitly when `written < toMigrate` (list the skipped files and the reason).

## Definition of done

- [ ] The `--apply` report shows the number actually written.
- [ ] A skip (`insertFields` null) emits an explicit warning, never silence.
- [ ] Test: a file with a spaced fence → the skip is reported.
