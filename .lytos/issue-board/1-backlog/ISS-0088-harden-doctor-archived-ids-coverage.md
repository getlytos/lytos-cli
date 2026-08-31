---
id: ISS-0088
title: "doctor: harden collectArchivedIssueIds + wire up @vitest/coverage-v8"
type: fix
priority: P3-low
effort: M
complexity: standard
domain: [cli, doctor, tests]
skill: ""
skills_aux: []
status: 1-backlog
branch: "fix/ISS-0088-harden-doctor-archived-ids-coverage"
depends: [ISS-0060]
created: 2026-06-14
updated: 2026-06-14
schema_version: 2
---

# ISS-0088 — doctor: harden collectArchivedIssueIds + coverage

## Context

Sprint #03 review (ISS-0060). `collectArchivedIssueIds` greps every `ISS-XXXX` token in `archive/INDEX.md`, so an ID mentioned **only in prose** (not an actual archived entry) is accepted as a valid dependency target — verified: `depends:[ISS-7777]` passes when `ISS-7777` appears in a sentence of the INDEX. Implemented exactly as ISS-0060 specified, but it can be hardened. Separately, the `>=80%` coverage claim (ISS-0060's DoD) is self-asserted: `@vitest/coverage-v8` is not installed, so it is not measurable in CI.

## Proposed solution

Parse the INDEX's table rows (or rely on the archived file names, which are already collected precisely) instead of free-text tokens. Install and wire up `@vitest/coverage-v8`.

## Definition of done

- [ ] `collectArchivedIssueIds` no longer accepts an ID that only appears in prose.
- [ ] `@vitest/coverage-v8` installed and coverage measurable (`vitest run --coverage`).
- [ ] (Optional, noted) doctor.ts split if the 300-line rule warrants it.
