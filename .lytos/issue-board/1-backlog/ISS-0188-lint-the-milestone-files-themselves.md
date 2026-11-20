---
id: ISS-0188
title: "`lyt lint` checks the milestone files themselves"
type: feat
priority: P3-low
effort: S
complexity: light
skill: ""
skills_aux: []
status: 1-backlog
branch: ""
depends: []
related: [ISS-0181]
created: 2026-11-20
schema_version: 2
risk: low
---

# ISS-0188 — `lyt lint` checks the milestone files themselves

## Context

`lyt lint` validates that a card's `milestone` names an existing file, but nothing validates the milestone file: missing `id` or `title`, an `id` that differs from the file name, no `## Exit criteria` section. Candidate for the next minor release.

## Proposed solution

Warnings (never errors) for those four cases. One line of study: the reader already parses the file, so the checks are a few lines.

## Ready

- **Scope** — the four warnings and their tests.
- **Out of scope** — editing milestones.
- **Solution** — warnings in the existing reader.
- `risk: low`.

## Definition of done

- [ ] Each of the four cases warns with its remedy and never changes the exit code — verify: auto
- [ ] A well-formed milestone file does not warn — verify: auto
