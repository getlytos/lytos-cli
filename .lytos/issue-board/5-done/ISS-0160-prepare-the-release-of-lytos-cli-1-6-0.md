---
id: ISS-0160
title: Prepare the release of lytos-cli 1.6.0
type: chore
priority: P1-high
effort: XS
complexity: light
domain: [release]
skill: ""
skills_aux: []
status: 5-done
branch: chore/ISS-0160-release-lytos-cli-1-6-0
depends: [ISS-0153, ISS-0154, ISS-0155, ISS-0156, ISS-0157, ISS-0158, ISS-0159]
created: 2026-11-20
updated: 2026-11-20
schema_version: 2
risk: medium
assignee: fredericgalline
started_at: 2026-11-20
completed_at: 2026-11-20
commits: [b4ff975]
---
# ISS-0160 — Prepare the release of lytos-cli 1.6.0

## Context

ISS-0153 to ISS-0159 add features and fix a parser bug without breaking anything that worked: a
new marker grammar, two lint warnings, a shipped quality library, the solution study in the card
templates, the team-and-loop briefing, an optional design answer in `init`, and an `upgrade` that
delivers the library without touching what is the project's. New functionality, no break:
minor version, 1.5.2 to 1.6.0.

## Proposed solution

- Bump `package.json` and the lockfile to 1.6.0.
- Refresh the project memory with what this release taught (the end-of-task protocol): one entry
  on two readers of one syntax drifting, one on what `lyt upgrade` may write, the living summary.
- Verify what the tarball would contain: `dist/` only, as the package's `files` declares, with the
  method files (including the new library) inside `dist/method/`.
- Cost study (`cost-review`): a version bump is constant and reversible. The repository keeps no
  changelog, so none is created; the README (English and French) already carries what changed in
  what it describes.
- Publishing is not part of this card: no tag, no push, no `npm publish`. The release workflow
  (OIDC) publishes from a tag the owner pushes.

## Ready

- **Scope** — the version in `package.json` and `package-lock.json`, the tarball check, the memory refresh.
- **Constraints** — release preparation only; no tag, no push, no publish.
- **Out of scope** — tagging, pushing, publishing, a changelog.

## Definition of done

- [x] `package.json` and `package-lock.json` declare version 1.6.0, and `lyt --version` reports it — verify: auto
- [x] `npm pack --dry-run` lists only `dist/` and the package metadata, with the shipped method files and the new library inside `dist/method/` — verify: auto
- [x] Format, lint, typecheck, secrets scan, build and the whole test suite pass — verify: auto
- [x] The release commit carries nothing beyond the version bump, the memory refresh and this card — ruled by the independent review of 2026-11-20 (Claude Opus 5.5 reviewing Claude Sonnet 5.5 work, verdict GO with reserves, every finding addressed) — verify: reviewer:over-engineering
- [x] The one deliberate behaviour change is acceptable in a minor release: a DoD whose only non-human items are `verify: reviewer` was loop-eligible by accident of the old parser and is no longer — decided by Frédéric Galliné, 2026-11-20 — verify: human:product-intent
