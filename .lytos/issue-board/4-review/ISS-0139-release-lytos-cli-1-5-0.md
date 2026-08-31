---
id: ISS-0139
title: Release lytos-cli 1.5.0
type: chore
priority: P1-high
effort: XS
complexity: light
domain: [cli, ci]
skill: 
skills_aux: []
status: 4-review
branch: chore/ISS-0139-release-lytos-cli-1-5-0
depends: [ISS-0132, ISS-0133, ISS-0136]
created: 2026-08-31
updated: 2026-08-31
schema_version: 2
risk: medium
assignee: fredericgalline
started_at: 2026-08-31
---
# ISS-0139 — Release lytos-cli 1.5.0

## Context

Version 1.4.0 is the current npm `latest`. The delivery merged by PR #31 adds the governed-loop
commands, executable quality gates, derived reports and journal, and hardened issue-scoped audit
packets. These are backward-compatible capabilities and warrant a minor release.

## Ready

- **Scope** — bump the package and lockfile to 1.5.0, validate the exact npm artifact, merge the
  release commit through CI, tag the resulting `main` commit, and verify npm `latest`.
- **Constraints** — the tag must point to the versioned commit reachable from `origin/main`;
  publication must use the existing trusted GitHub release workflow; no manual local publish.
- **Out of scope** — source changes, dependency upgrades, and unrelated documentation edits.
- `risk: medium` — the diff is mechanical, but the artifact is publicly distributed.

## Definition of done

- [x] `package.json` and `package-lock.json` declare version 1.5.0 — verify: auto
- [x] Tests, typecheck, lint, format, secrets scan, build, doctor, and production dependency audit pass — verify: auto
- [x] `npm pack --dry-run` reports a 1.5.0 package containing only the intended published files — verify: auto
- [x] The release PR passes CI on Node 20 and 22 and is merged into `main` — verify: auto
- [x] Tag `v1.5.0` points to the versioned commit on `origin/main` — verify: auto
- [ ] The release workflow succeeds and npm reports `1.5.0` as `latest` — verify: auto

## Notes

- Release origin: PR #31, merged as `f4c3d96`.
- SemVer choice: minor, because the release adds commands and governance capabilities without
  intentionally removing or changing an existing public interface.
- Pre-merge evidence: 356/356 tests; all static gates green; doctor score 100; production audit
  reports 0 vulnerabilities; the 119,446-byte dry-run package contains 22 intended files and its
  executable reports version 1.5.0.

## Outcome — 2026-08-31

**1.5.0 is on npm as `latest`, published by hand. The constraint said not to.**

The Ready section of this issue reads *"publication must use the existing trusted GitHub release
workflow; no manual local publish"*. That constraint was not met, and the fiche records it rather
than rounding it off — the frontmatter is this project's audit journal.

What happened, in order: the release workflow failed on `v1.5.0` like the six tags before it
(ISS-0140), the cause turned out to be a credential that expired on 2026-04-20 (ISS-0141), and the
version was then published from a developer machine after `npm login`.

The last DoD item stays **unticked**, because half of it is false:

| Half | State |
|---|---|
| npm reports `1.5.0` as `latest` | ✅ true — shasum `7af93c05…`, the locally built tarball |
| the release workflow succeeds | ❌ false — it never ran successfully; run 33401803788 is red |

Two consequences worth carrying forward:

- **The published 1.5.0 has no provenance attestation.** A hand publish from npm 10.9.8 cannot
  produce one, so this artifact is not cryptographically traceable to this repository. Users can
  install it; they cannot verify where it was built.
- **The OIDC fix is still unproven.** `v1.5.0` cannot demonstrate it — npm refuses to republish an
  existing version, so the corrected workflow would answer `403` on that tag. The proof moves to
  the next release, tracked as the follow-up to ISS-0141.

This issue is otherwise complete: the artifact is correct, distributed, and matches its pre-merge
evidence. What it does not have is the path it promised to take.
