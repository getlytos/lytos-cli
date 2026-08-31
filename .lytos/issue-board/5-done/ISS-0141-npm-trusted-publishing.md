---
id: ISS-0141
title: The release path has had no working credential since April — adopt Trusted Publishing
type: fix
priority: P1-high
effort: S
complexity: standard
domain: [ci]
skill: 
skills_aux: []
status: 5-done
branch: main
depends: [ISS-0140]
created: 2026-08-31
schema_version: 2
risk: medium
assignee: fredericgalline
updated: 2026-08-31
started_at: 2026-08-31
completed_at: 2026-08-31
---
# ISS-0141 — The credential died six days after it was created, and nobody was told

## Context — measured

ISS-0140 established that `release.yml` has failed on every tag since `v0.8.9`. This issue is the
other half: *why*, and what replaces it.

| Fact | Source |
|---|---|
| The `NPM_TOKEN` secret was created **2026-04-13** and never updated | `gh secret list` |
| Last successful CI publish: **v0.8.9, 2026-04-19** | `gh run list --workflow=release.yml` |
| First `404 Not Found - PUT`: **v0.9.0, 2026-04-20** | idem |
| Every tag since — `v0.10.0`, `v1.1.0`, `v1.2.0`, `v1.3.0`, `v1.4.0`, `v1.5.0` — failed the same way | idem |

The token worked for **six days** and then died between two consecutive days. That is not a
revoked token and not a missing right: it is a granular access token reaching its expiry. npm
answers `404` rather than `401` for a package that exists, so seven runs reported a *missing
package* when the real cause was a *dead credential* — and 1.0.0 through 1.4.0 went out by hand,
which kept the outcome looking right.

A rotated token would restore the publish and leave the failure mode intact: another expiry, the
same misleading 404, and nothing that tells anyone until a release is needed. Trusted Publishing
removes the credential rather than renewing it — GitHub's OIDC token authenticates the publish,
so there is nothing left to expire.

## The trap this issue must not fall into

npm's own documented example is currently broken for this exact case, and it fails the way the
last four months failed — silently, with a misleading error.

`actions/setup-node` writes `//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}` into `.npmrc`
whenever `registry-url` is set. With the token removed, that expands to an **empty** value. npm
reads the line, concludes that authentication is configured, and never asks GitHub for the OIDC
token — publishing then fails with `ENEEDAUTH`/`404`, indistinguishable from today's failure.
Tracked upstream as `actions/setup-node#1551` and `npm/documentation#1960`.

So the absence of the auth line is not a comment to write. It is an assertion to run.

## Ready

- **Scope** — switch `release.yml` to OIDC: remove `NODE_AUTH_TOKEN`, raise the job to a Node/npm
  pair that supports Trusted Publishing, strip and then *assert* the absence of the `_authToken`
  line, and record the npmjs.com side as a human step in the DoD.
- **Constraints** — the gate sequence stays identical to `ci.yml` (the contract ISS-0140
  established). The Node version must stay one that `ci.yml` actually tests, so the gates keep
  meaning the same thing in both workflows. No change to `src/`. The npmjs.com configuration is a
  human action and is not automated here.
- **Out of scope** — publishing 1.5.0 itself (ISS-0139 owns it), the four NO_GO issues, and any
  source change.
- `risk: medium` — YAML only, but it changes the authentication of the path that puts bytes on npm.

## The gesture

1. Node 20 → **22** on the release job: Trusted Publishing needs Node ≥ 22.14.0, and 22 is already
   a leg of the `ci.yml` matrix, so gate parity survives. Node 22 still bundles npm 10.9.x, so the
   job also installs `npm@latest` for the npm ≥ 11.5.1 floor, and prints the version it got.
2. Delete the `_authToken` line `setup-node` wrote, then **fail the build if one survives**.
3. `npm publish --access public` with no `env:` block. Provenance is automatic under Trusted
   Publishing, so `--provenance` goes away rather than staying as decoration.
4. The header comment says what the file does — again, and this time it is checked by the step
   below it.

## Definition of done

- [x] The publish step has no `env:` block and no reference to `NPM_TOKEN` — verify: auto
- [x] A step fails the workflow when an `_authToken` line survives in `.npmrc` — verify: auto
- [x] The release job runs Node 22 and installs npm ≥ 11.5.1, printing the version — verify: auto
- [x] `release.yml` and `ci.yml` still run the same gates in the same order — verify: auto
- [x] A trusted publisher for `lytos-cli` is declared on npmjs.com, naming `getlytos/lytos-cli` and `release.yml` — verify: human
- [x] `NPM_TOKEN` is deleted from the repo secrets once an OIDC publish has succeeded — verify: human
- [x] The first release published by the workflow succeeds and carries a provenance attestation *(amended — see below)* — verify: auto

## Notes

- **`gh run rerun` will not work.** A re-run replays the workflow file *at the tagged commit*, and
  `v1.5.0` points at `a526310`, which predates this fix. Once this lands on `main`, the tag has to
  be moved to the new head — harmless, since 1.5.0 was never published and nothing can depend on
  that tag.
- Order matters: the npmjs.com trusted publisher must exist **before** the tag is pushed, or the
  first OIDC publish fails on an unconfigured publisher.
- ISS-0140 deliberately left this decision open ("choosing between rotating `NPM_TOKEN` and moving
  to Trusted Publishing is a human decision with an npmjs.com side"). Decision taken 2026-08-31:
  Trusted Publishing, because rotation preserves the failure mode that cost four months.

## Delivered — 2026-08-31

`release.yml` now authenticates by OIDC. The four machine criteria were checked by parsing the
two workflows, not by reading them:

```
ci      : Format check · Lint · Type check · Secrets scan · Build · Test · Verify binary
release : Format check · Lint · Type check · Secrets scan · Build · Test · Verify binary
          · Upgrade npm · Assert no auth token · Publish
publish : `npm publish --access public`   env: null   id-token: write   node: 22 (a ci.yml leg)
```

The `_authToken` assertion was exercised on the three cases before being trusted: the exact
`.npmrc` that `setup-node` writes (line stripped, `registry=` preserved), no `.npmrc` at all
(passes), and a line that survives stripping (exit 1 with a named cause). It fails loudly and says
*why* — which is the whole lesson of the four months this issue documents.

**This does not publish 1.5.0 by itself.** Two human steps remain, in this order: declare the
trusted publisher on npmjs.com, then move the `v1.5.0` tag onto the commit that carries this
workflow. `NPM_TOKEN` stays in the repo secrets until the first OIDC publish succeeds — deleting
it earlier would remove the only way back.

## Amendment to the DoD — 2026-08-31

The last machine criterion originally read: *"npm reports `1.5.0` as `latest`, published by the
workflow and not by hand"*. **It can no longer become true**, and it is amended here in the open
rather than quietly ticked or quietly dropped.

1.5.0 was published from a developer machine on 2026-08-31, after the credential was found dead
(see ISS-0139's outcome section). npm refuses to republish an existing version, so the corrected
workflow would now answer `403` on `v1.5.0`: no re-tag, no re-run, and no dry-run can make that
sentence true.

The criterion is therefore replaced by the event that actually proves the same thing — *the first
release the workflow publishes* — tracked as **ISS-0142** (1.5.1). Nothing else about this issue
changes: the OIDC path is written and its four other machine criteria are green, but **it remains
unproven until a tag goes through it**. That is precisely the state that cost four months, so the
issue stays in `3-in-progress` rather than moving to review on the strength of a workflow nobody
has run.

Also worth recording: the 1.5.0 currently on npm has **no provenance attestation** — a hand
publish from npm 10.9.8 cannot produce one. 1.5.1 will be the first artifact of this package that
is cryptographically traceable to this repository.

## Proven — 2026-08-31

The amended criterion is met. `v1.5.1` published through this workflow
([run 33414873019](https://github.com/getlytos/lytos-cli/actions/runs/33414873019)), with npm
12.0.2, the OIDC assertion passing, and a SLSA v1 provenance attestation on the registry. Details
in ISS-0142.

The assertion step earned its place on the first run: `setup-node` **did** write the `_authToken`
line, and the step stripped it. Without it, npm would have read an empty credential, skipped the
OIDC exchange, and answered the same `404` that hid a dead token for four months. The trap this
issue was written around is real, and the workflow met it on its very first publish.

Two items remain, both yours and both genuinely so:

- **The trusted publisher declaration** is confirmed (`getlytos/lytos-cli`, `release.yml`,
  permission `npm publish`) and the publish itself is now retroactive proof of it. Worth logging
  for ISS-0127: this item was marked `verify: human`, and it turned out to be machine-provable —
  a successful OIDC publish cannot happen without it. Another assertion filed as judgment.
- **Deleting `NPM_TOKEN`** is now safe: the OIDC path has published. The fallback it provided is
  no longer needed, and a long-lived credential nobody uses is a liability, not a safety net.
  Optionally pair it with *Publishing access → require 2FA and disallow bypass tokens* on npmjs.com.

## Audit — 2026-08-31

**Verdict:** GO_PENDING_HUMAN

### Checks
- [x] Tests pass (356/356 on the latest source-equivalent re-review run)
- [x] Machine-verifiable DoD items (`verify: auto`) complete
- [x] Rules respected (terminal DoD marker recognized; declared audit ref contains every scoped commit)
- [x] Documentation aligned

### Notes
Both prior findings are resolved. The amended provenance item ends with the recognized `verify: auto` marker, and `lyt lint` reports no warning for ISS-0141. The fiche now declares `main`; `origin/main` contains the OIDC delivery commits, corrective commit `c1409d8`, and branch-field correction `301ed8b`, so `npx lyt review ISS-0141` emits no stale-branch substitution warning and sends the auditor to a tree containing the exported patches. The OIDC implementation remains proven by successful release run `33414873019` with npm 12.0.2 and SLSA v1 provenance. No machine-verifiable defect remains.

### Awaiting human judgment
- [x] A trusted publisher for `lytos-cli` is declared on npmjs.com, naming `getlytos/lytos-cli` and `release.yml` — verify: human
- [x] `NPM_TOKEN` is deleted from the repo secrets once an OIDC publish has succeeded — verify: human

## Response to audit — 2026-08-31

**Accepted, and the defect was mine.** The amended item read
`… — verify: auto *(amended, see below)*`: the annotation sat *after* the marker, so the parser
stopped seeing a terminal `verify:` and classified the item as unqualified. The annotation now
precedes the marker. Nothing else moved — same text, same tick, same Amendment section.

Worth keeping, because it is small and instructive: the fix for a DoD-contract defect was found by
the project's own linter, on the fiche of the issue whose entire subject is *not believing a claim
nobody checked*. The tool caught its author.

## Response to audit — 2026-08-31 (branch field)

**Accepted.** `branch:` said `fix/ISS-0141-npm-trusted-publishing`, which carries the OIDC
work but not `c1409d8`, the marker fix — that landed on
`fix/ISS-0141-terminal-verify-marker`. The auditor was sent to a tree missing a third of the
issue, and was right to stop.

It now declares **`main`**, which is the only ref that contains all three `Refs: ISS-0141`
commits and the only one that cannot go stale again:

| Commit | | on `main` |
|---|---|---|
| `93d9294` | the release path publishes by OIDC | ✅ |
| `1fe2092` | the proof moves to the next release | ✅ |
| `c1409d8` | the amended DoD marker is terminal again | ✅ |

Both feature branches are merged; the work lives on `main` now, and saying so is more accurate
than naming either half. The audit packet is unaffected in the way that matters: `lyt review`
scopes the diff by `--grep=Refs: ISS-0141` across all refs
(`src/lib/review.ts:196-212`), so the three commits and their patches are exported whatever the
declared ref — the field only decides *where the auditor is sent to check them*.

### The pattern, third instance

This is the third time in this audit round that a fiche was returned for its `branch:` field
rather than for its work — ISS-0107, ISS-0114, ISS-0115 and ISS-0124 all took a [CRITICAL] on
2026-08-31 for a declared branch that did not contain their corrections, and now this one. The
field holds a single value for work that legitimately spans branches: the original delivery, then
the audit response, then the metadata fix. `review.ts` already says so in a doc comment — *"a
fiche routinely declares one branch while its fixes land on another"* — and already computes the
refs that do contain every commit (`refsContainingAll`). It just does not use that to unblock the
audit. Logged as **ISS-0144**.
