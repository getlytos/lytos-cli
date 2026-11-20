---
id: ISS-0170
title: "Prepare the release of lytos-cli 1.7.0"
type: chore
priority: P1-high
effort: S
complexity: light
skill: ""
skills_aux: []
status: 1-backlog
branch: "chore/ISS-0170-release-lytos-cli-1-7-0"
depends: [ISS-0163, ISS-0164, ISS-0165, ISS-0166, ISS-0167, ISS-0168, ISS-0169]
related: [ISS-0162]
created: 2026-11-20
schema_version: 2
risk: medium
---
# ISS-0170 — Prepare the release of lytos-cli 1.7.0

## Context

The release card of 1.7, like ISS-0160 for 1.6: the version bump, the README and release notes consolidated, and the check of the tarball. The tag and the publication are done from `main` through the release workflow, never by hand.

## Proposed solution

Bump to 1.7.0 in `package.json` and the lockfile; consolidate the README (EN and FR) on the new fields and commands; write the release notes for the GitHub release; check the tarball contents.

## Ready

- **Scope** — the version, the docs, the notes.
- **Out of scope** — new features.
- **Solution** — a release commit with nothing beyond the bump and the docs.
- `risk: medium`.

## Definition of done

- [ ] The version is 1.7.0 and `npm pack --dry-run` lists only `dist/` and the files npm imposes — verify: auto
- [ ] The independent review of the release branch has been run and its findings addressed — verify: reviewer:security-review
- [ ] The release commit carries nothing beyond the bump, the docs and this card — verify: reviewer:over-engineering
