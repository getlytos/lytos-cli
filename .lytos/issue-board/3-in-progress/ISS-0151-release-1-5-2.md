---
id: ISS-0151
title: Release lytos-cli 1.5.2
type: chore
priority: P1-high
effort: S
complexity: standard
domain: [release]
skill: ""
skills_aux: []
status: 3-in-progress
branch: chore/ISS-0151-release-1-5-2
depends: [ISS-0149, ISS-0150]
created: 2026-09-21
updated: 2026-09-21
schema_version: 2
risk: high
assignee: fredericgalline
started_at: 2026-09-21
---
# ISS-0151 — Release lytos-cli 1.5.2

## Context

Versions 1.5.1 and earlier reject manifests generated in French and rewrite empty
frontmatter values with trailing whitespace. ISS-0149 and ISS-0150 are merged and
need a patch release so every project can consume both fixes.

## Proposed solution

- Bump the package and lockfile to 1.5.2 in a release-only pull request.
- Merge through CI, then tag the merged versioned commit as `v1.5.2`.
- Let the existing OIDC release workflow publish to npm; do not publish locally.

## Ready

- **Scope** — version bump, release verification, tag and workflow publication only.
- **Constraints** — GitHub Actions OIDC is the sole npm publishing path; the tag points to the versioned commit reachable from `main`.
- **Out of scope** — any source change beyond ISS-0149 and ISS-0150; manual npm publication.

## Definition of done

- [x] `package.json` and `package-lock.json` declare version 1.5.2 — verify: auto
- [x] `npm pack --dry-run` produces the intended 1.5.2 artifact — verify: auto
- [ ] The release PR passes CI on Node 20 and 22 and is merged into `main` — verify: auto
- [ ] Tag `v1.5.2` points to the versioned commit on `origin/main` — verify: auto
- [ ] The release workflow succeeds and npm reports 1.5.2 as `latest` with provenance — verify: auto
- [ ] No manual npm publish was used — verify: human
