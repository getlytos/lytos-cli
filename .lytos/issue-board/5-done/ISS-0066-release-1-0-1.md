---
id: ISS-0066
title: Release 1.0.1 after premature 1.0.0 publish
type: chore
priority: P0-critical
effort: XS
complexity: light
domain: [release, npm]
skill: documentation
skills_aux: [testing]
status: 5-done
branch: chore/ISS-0066-release-1-0-1
depends: []
created: 2026-04-22
updated: 2026-04-22
---
# ISS-0066 — Release `1.0.1` after premature `1.0.0` publish

## Context

`1.0.0` was published to npm before the merge containing the final release bump and post-merge state landed on `main`. The repository is now correctly at `1.0.0`, but npm already consumed that version number.

The next clean release therefore has to be `1.0.1`.

## Proposed solution

Bump the package version from `1.0.0` to `1.0.1`, validate the release artifact, and leave the patch release on its own branch for final review before publish.

## Definition of done

- [x] `package.json` version is `1.0.1`
- [x] `package-lock.json` root version is `1.0.1`
- [x] Build passes on the release branch
- [x] Targeted tests still pass
- [x] `npm pack --dry-run` is clean for the release artifact
- [x] The issue is moved to `4-review` once the bump is ready

## Relevant files

- `package.json`
- `package-lock.json`

## Notes

- This issue is the corrective patch bump only, not the actual `npm publish` step.

## Finalization — 2026-04-22

- Bumped `lytos-cli` from `1.0.0` to `1.0.1`
- Validation run:
  - `npm run build`
  - `npx vitest run tests/commands/review.test.ts tests/commands/archive.test.ts tests/commands/upgrade.test.ts`
  - `npm_config_cache=/tmp/lytos-npm-cache npm pack --dry-run`
