---
id: ISS-0140
title: The workflow that publishes runs fewer gates than the one that reviews
type: fix
priority: P1-high
effort: XS
complexity: light
domain: [ci]
skill: 
skills_aux: []
status: 5-done
branch: fix/ISS-0140-release-path-weaker-than-ci-path
depends: [ISS-0132]
created: 2026-08-31
updated: 2026-08-31
schema_version: 2
risk: low
assignee: fredericgalline
started_at: 2026-08-31
completed_at: 2026-08-31
---
# ISS-0140 — You can publish code a pull request would have rejected

## Context — measured

ISS-0132 wired `format:check` and `secrets:scan` into `ci.yml`, because a gate nothing executes is
not a gate. It wired them into **one** of the two workflows.

| | `ci.yml` | `release.yml` |
|---|---|---|
| `format:check` | ✅ | ❌ |
| `lint` | ✅ | ✅ |
| `typecheck` | ✅ | ✅ |
| `secrets:scan` | ✅ | ❌ |
| `build` | ✅ | ✅ |
| `test` | ✅ | ✅ |

`ci.yml` runs on `pull_request` and on pushes to `main`. `release.yml` runs on `v*` tags and is
the only thing that puts bytes on npm. So the path with the largest blast radius — a published
artefact anyone can `npm install` — validates **less** than the path that gates a code review. A
secret committed on a release branch, or a format regression, reaches users without ever meeting
the check that exists to catch it.

## The second defect: the workflow's own comment is false

`release.yml` opens with:

> Uses npm Trusted Publishing (provenance) — no token needed.
> The GitHub Actions OIDC token proves to npm that this is a legitimate publish from this repo.

It does not. The publish step sets `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`, and the workflow
pins **Node 20**, whose bundled npm is 10.x — npm Trusted Publishing requires **npm ≥ 11.5.1**.
The workflow has only ever authenticated with the token; `--provenance` signs the artefact but
does not authenticate the publish.

This is not cosmetic. It is why the credential failure was misread for four months: the file says
no token is needed, so nobody checked the token.

**The evidence, from `gh run list --workflow=release.yml`:** the last successful publish is
`v0.8.9` on 2026-04-19. Every tag since — `v0.9.0`, `v1.1.0`, `v1.2.0`, `v1.3.0`, `v1.4.0`,
`v1.5.0` — failed, all with `npm error 404 Not Found - PUT .../lytos-cli`, which is what npm
returns instead of 401 for an existing package. **Seven consecutive failures.** Releases 1.0.0
through 1.4.0 were published by hand, so the outcome always looked right and the red workflow was
never read.

## Ready

- **Scope** — bring `release.yml`'s gate list up to `ci.yml`'s, and make the authentication
  comment describe what the file actually does.
- **Constraints** — the gate order must match `ci.yml` so a failure means the same thing in both
  places. Do **not** change the authentication mechanism here: choosing between rotating
  `NPM_TOKEN` and moving to Trusted Publishing is a human decision with an npmjs.com side, and
  smuggling it into a CI fix would repeat the mistake this issue documents.
- **Out of scope** — the credential itself (human action on npmjs.com). Bumping the workflow's
  Node version, which belongs to the Trusted Publishing decision if it is taken. Re-running the
  failed `v1.5.0` publish.
- `risk: low` — YAML only, no change to `src/`. The failure mode is a stricter release, and the
  release path is already failing for an unrelated reason.

## The gesture

1. Add `format:check` and `secrets:scan` to `release.yml`, in `ci.yml`'s order.
2. Replace the Trusted Publishing claim with what the file does today, and record what adopting it
   would actually require — so the option stays visible instead of being silently believed.

## Definition of done

- [x] `release.yml` runs `format:check` and `secrets:scan` — verify: auto
- [x] Both workflows run the same gates in the same order — verify: auto
- [x] The header comment describes token authentication, and names the two prerequisites Trusted Publishing would need — verify: auto
- [x] No change to the authentication mechanism in this issue — verify: auto
- [x] Is the release path now trustworthy enough to publish from unattended — verify: human

## Notes

- Field origin: 2026-08-31, answering "what is next before an npm release". The release was
  blocked by the credential; this is the second thing the investigation turned up.
- The credential itself is tracked separately as a human action: rotate `NPM_TOKEN` (a *classic
  automation* token does not expire) or adopt Trusted Publishing, then
  `gh run rerun 33401803788 --failed` — `v1.5.0` already points at `a526310`, so no re-tag.

## Delivered — 2026-08-31

Both workflows now run the identical gate sequence, verified by parsing the YAML rather than by
reading it:

```
ci      : Format check · Lint · Type check · Secrets scan · Build · Test · Verify binary
release : Format check · Lint · Type check · Secrets scan · Build · Test · Verify binary · Publish
```

The authentication mechanism is untouched, as the constraint required — the publish step's `env`
is still `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`, and the `v*` trigger is unchanged. What
changed is that the file now says so. The header records what it actually does, why the previous
claim cost four months, and the two things Trusted Publishing would genuinely require — including
that `NODE_AUTH_TOKEN` must be *removed* if it is adopted, since a token takes precedence and
would silently keep the broken path alive.

All four gates run clean locally: `format:check`, `secrets:scan`, `lint`, `typecheck`.

**This does not unblock the release.** `v1.5.0` still fails on the credential, which is a human
action on npmjs.com. It only means that when the credential is fixed, what gets published will
have passed the same bar as what gets reviewed.

## Audit — 2026-08-31

**Verdict:** GO_PENDING_HUMAN

### Checks
- [x] Tests pass (356/356 on the confirming full run; one unrelated `park` timeout passed both in isolation and on rerun)
- [x] Machine-verifiable DoD items (`verify: auto`) complete
- [x] Rules respected (focused workflow-only change, no dependency or source change)
- [x] Documentation aligned

### Notes
Commit `0c513b1` adds `format:check` and `secrets:scan` to `release.yml` in the same order as `ci.yml`, while preserving the then-current `NODE_AUTH_TOKEN` authentication mechanism exactly as scoped. PR #33 passed CI on Node 20 and 22. The later OIDC change in ISS-0141 does not invalidate these issue-scoped checks; the release workflow still preserves the gate sequence established here.

### Awaiting human judgment
- [x] Is the release path now trustworthy enough to publish from unattended — verify: human
