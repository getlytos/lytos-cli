---
id: ISS-0172
title: "CI on macOS, Linux and Windows, with a clean-install smoke test"
type: feat
priority: P1-high
effort: M
complexity: standard
skill: testing
skills_aux: []
status: 1-backlog
branch: "feat/ISS-0172-ci-on-three-operating-systems"
depends: [ISS-0171]
related: [ISS-0161]
created: 2026-11-20
schema_version: 2
risk: medium
---

# ISS-0172 — CI on macOS, Linux and Windows, with a clean-install smoke test

## Context

The CI runs on Ubuntu only (Node 22 and 24). A reader on Windows or macOS is a likely first user, and Windows was never verified (path separators, spawned processes, line endings). A launch must not meet that failure in public.

## Proposed solution

Add `os: [ubuntu-latest, macos-latest, windows-latest]` to the matrix with `fail-fast: false`, then a smoke test after the build that packs the tarball, installs it into an empty folder and runs `lyt --version`, `lyt init` without a terminal and `lyt doctor`.

| Option | Build cost | Maintenance | Robustness |
|---|---|---|---|
| A. Full matrix on every pull request | low | low on a public repository (hosted runners are free) | catches regressions early |
| B. Matrix nightly only | low | low | a regression reaches `main` first |

Decision: **A**, checked against the account's billing before merging. Failures that appear on Windows are fixed or tracked as their own cards; the required checks of `main` are updated to the new job names.

## Ready

- **Scope** — the matrix, the smoke test, the branch-protection update.
- **Out of scope** — new features.
- **Solution** — extend the existing workflow, no new workflow.
- `risk: medium`.

## Definition of done

- [ ] The CI runs on the three operating systems and both Node versions and passes — verify: auto
- [ ] The smoke test installs the packed tarball in an empty folder and `lyt init` works without a terminal — verify: auto
- [ ] The required checks of `main` name the new jobs — verify: auto
