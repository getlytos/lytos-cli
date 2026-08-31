---
id: ISS-0142
title: Release lytos-cli 1.5.1 — the first publish the workflow performs
type: chore
priority: P1-high
effort: XS
complexity: light
domain: [cli, ci]
skill: 
skills_aux: []
status: 3-in-progress
branch: chore/ISS-0142-release-lytos-cli-1-5-1
depends: [ISS-0140, ISS-0141]
created: 2026-08-31
schema_version: 2
risk: medium
assignee: fredericgalline
updated: 2026-08-31
started_at: 2026-08-31
---
# ISS-0142 — A patch release whose payload is the proof

## Context

1.5.0 is on npm, published by hand on 2026-08-31 because the release credential had been dead
since April (ISS-0139, ISS-0141). Two things follow from that, and one release settles both:

1. **The corrected OIDC workflow has never run.** A publish path that has not published is exactly
   the state that cost four months — a red workflow nobody reads, believed to work. `v1.5.0`
   cannot prove it: npm refuses to republish an existing version.
2. **The 1.5.0 artifact has no provenance.** A hand publish from npm 10.9.8 cannot generate an
   attestation, so nothing links the tarball on npm to this repository. Trusted Publishing
   produces one automatically; 1.5.1 would be this package's first verifiable artifact.

The source diff is empty on purpose. This release ships no feature: its value is the path it
takes and the attestation it produces. Saying so plainly is the point — a patch release with no
code change is otherwise the kind of thing nobody can explain six months later.

## Ready

- **Scope** — bump to 1.5.1, merge through CI, tag the resulting `main` commit, let the release
  workflow publish, and verify the published artifact carries a provenance attestation.
- **Constraints** — the publish must come from the workflow. **If it fails, it is not to be
  rescued by a manual publish**: a hand publish here would destroy the only thing this release
  exists to establish. A failure means diagnosing the workflow and re-tagging, or reverting the
  bump.
- **Out of scope** — any change to `src/`, dependency upgrades, and the deletion of `NPM_TOKEN`
  (that belongs to ISS-0141, after this succeeds).
- `risk: medium` — mechanical diff, publicly distributed artifact.

## Definition of done

- [x] `package.json` and `package-lock.json` declare 1.5.1, with no other source change — verify: auto
- [ ] The release PR passes CI on Node 20 and 22 and is merged into `main` — verify: auto
- [ ] Tag `v1.5.1` points to the versioned commit on `origin/main` — verify: auto
- [ ] The release workflow run succeeds, and its log shows npm ≥ 11.5.1 and the OIDC assertion passing — verify: auto
- [ ] npm reports `1.5.1` as `latest` — verify: auto
- [ ] `npm view lytos-cli@1.5.1` reports a provenance attestation — verify: auto
- [ ] No manual publish was used at any point — verify: human

## Notes

- Prerequisite, human and off-repo: the trusted publisher must be declared on npmjs.com
  (`getlytos` / `lytos-cli` / `release.yml`) **before** the tag is pushed. Otherwise the first OIDC
  publish fails on an undeclared publisher.
- `NPM_TOKEN` stays in the repo secrets until this release succeeds — it is the only way back.
  Deleting it is the last DoD item of ISS-0141, not of this issue.
- If this publishes cleanly, ISS-0141 can move to review: its amended criterion is this release.
