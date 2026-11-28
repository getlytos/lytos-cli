---
id: ISS-0143
title: Clear the 25 Dependabot alerts on the dev toolchain
type: chore
priority: P0-critical
effort: S
complexity: standard
domain: [cli, ci]
skill: ""
skills_aux: []
status: 4-review
branch: chore/ISS-0143-refresh-dev-dependencies
depends: [ISS-0142]
created: 2026-08-31
schema_version: 2
risk: low
assignee: fredericgalline
updated: 2026-11-28
started_at: 2026-11-28
ai_implementer:
  model: claude-sonnet-5-5
skills_used: [git-workflow, security]
---
# ISS-0143 — Clear the 25 Dependabot alerts on the dev toolchain

## Context — measured

`npm audit` reports **6 vulnerabilities: 5 high, 1 low**, all of them in the dev toolchain.
`npm audit --omit=dev` reports **0** — nothing published to npm is affected.

| Severity | Package | Advisory |
|---|---|---|
| high | `brace-expansion` | large numeric range defeats the documented `max` DoS protection |
| high | `js-yaml` | quadratic-complexity DoS in merge-key handling via repeated aliases |
| high | `nanoid` | non-secure generators can loop indefinitely with a negative size |
| high | `postcss` | arbitrary file read via attacker-controlled `sourceMappingURL` |
| high | `vite` (`launch-editor`) | NTLMv2 hash disclosure via UNC paths on Windows |
| low | `esbuild` | arbitrary file read when running the dev server on Windows |

These are the five advisories the audits of 2026-08-31 kept citing against ISS-0107, ISS-0114,
ISS-0115 and ISS-0124. Since ISS-0136 the shipping gate audits production dependencies only —
correctly, since that is what users install — so these do not block a release. They are the
*build* supply chain, not the artifact: whoever runs `npm ci` on this repo runs this code.

## Why this is an issue and not a command

`npm audit fix` was run on 2026-08-31 at 18:09 and it works: **1 low remains, 0 high**. It is
preserved in `git stash` (`stash@{0}`, "npm audit fix du 2026-08-31 18:09"). It was taken back out
of the tree because of what comes with it:

- **137 packages move**, which is not a diff anyone reviews line by line.
- **prettier 3.8.3 → 3.9.6 reformats three files** — `src/lib/merge-driver.ts`,
  `src/lib/next.ts`, `src/lib/scaffold.ts`. The format gate goes red until they are swept, and a
  formatting sweep poisons `git blame` unless it lands as its own commit in
  `.git-blame-ignore-revs`, exactly as ISS-0132 did.

It was deliberately kept out of the 1.5.1 release (ISS-0142), whose only purpose is to prove the
publish path: mixing 137 package moves into it would turn a failed publish into an investigation.

## Update — 2026-11-28

On 2026-11-28 the owner asked for the 25 open Dependabot alerts to be handled
urgently, so the priority goes from P2 to P0. The sections above describe
2026-08-31.

**State found:** 25 alerts opened on 2026-11-20 (10 high, 13 moderate, 2 low),
all of development scope, in 10 packages. Dependabot's pull requests #80 and #81
only touch the vite and vitest family, and bring vite 8 and its new bundler.

### How

- Resolved with `--package-lock-only --ignore-scripts --before=2026-11-17`: no
  release taken is younger than 11 days.
- Direct dev dependencies raised: `tsup` to ^9.0.0 (tsup 8 does not accept the
  fixed esbuild), `typescript-eslint` to ^8.73.0 (same for minimatch) and
  `vitest` to ^4.1.12.
- `vite` held on 6 (6.4.6): named as `vite@~6.4.6` for one resolution, then
  dropped from `package.json`.
- Transitive: `npm update postcss nanoid source-map-js js-yaml brace-expansion`.
- The stash of 2026-08-31 was not used and is left in place.

A first resolution was thrown away. The options sat in one zsh string, so npm got
them as a single unknown option and applied none. Releases a few days old came in
and were installed in the work folder. In that tree only `esbuild` and `fsevents`
had install scripts, which could run. Nothing was built or tested with it.

### Checks

- Alerts: all 25 vulnerable ranges matched the old lockfile; none matches the new
  one (evaluated with `semver`).
- Lockfile: 95 entries changed or added, 52 of them per-platform binaries; 3
  added and 2 removed. All come from registry.npmjs.org with a sha512, all are
  development entries, none was published on or after 2026-11-17. Among them, only
  `esbuild@0.28.2` has an install script.
- `npm audit signatures`, run before any install script: 184 packages with a
  verified registry signature, 54 with a verified attestation.
- One package name is new: `@isaacs/nonrecursive-glob-match`, used by minimatch
  11. It was one month old, published by the author of minimatch under their own
  scope, with no provenance and no repository field. Its tarball matches the
  integrity in the lockfile and was searched without running it: in its 8
  JavaScript files every import is relative, none is computed, and none names
  `process`, `globalThis`, `fetch`, `eval` or `Function`. The code was not
  reviewed line by line.
- On Node 22.23.4: format, lint, typecheck, secrets, build and tests green, 67
  files and 1415 tests, the same counts as before. `npm audit`, with and without
  `--audit-level=high` or `--omit=dev`, reports 0.
- tsup 9 is a major. Its one announced breaking change drops Node below 22.18.
  `dist/`, rebuilt from empty with tsup 9.0.0 and esbuild 0.28.2, is identical to
  the one tsup 8.5.1 built: 39 files, byte for byte.
- Merged for a trial with pull request #91: no conflict, gates green, 72 files and
  1507 tests.
- Node 24 is not installed on the machine used: left to CI.

### Scope change

The plan of 2026-08-31 restored the `npm audit fix` lockfile, which moved prettier
and called for a format sweep. This update leaves prettier at 3.8.3: there is
nothing to sweep. Removed from the Definition of done, quoted as it stood:

> The prettier sweep is its own commit, formatting only, listed in `.git-blame-ignore-revs` — verify: auto

The CI matrix does not change, but the Node floor to **build** the project rises.
The `engines` field of the published package does not change. The implementing
agent decided this under the owner's request; the owner can refuse it at merge.

## Ready

- **Scope** — update the vulnerable dev packages and what they require, and check
  the gates, the lockfile and the built package.
- **Constraints** — `npm audit --omit=dev` stays at 0; the published package does
  not change. Land after ISS-0142, never before.
- **Out of scope** — production dependencies, the Node version matrix, any
  behaviour change, and vite 8.
- `risk: low` — dev dependencies only; nothing here reaches the published package.

## Definition of done

- [x] `npm audit --audit-level=high` exits 0 — verify: auto
- [x] `npm audit --omit=dev` still reports 0 vulnerabilities — verify: auto
- [x] None of the 25 open Dependabot alerts matches a version left in `package-lock.json` — verify: auto
- [x] Format, lint, typecheck, secrets, build and the full test suite pass on the refreshed tree — verify: auto
- [x] The built `dist/` is identical, byte for byte, to the one the previous tools build — verify: auto
- [x] `CONTRIBUTING.md` states the Node versions the build now needs — verify: auto
- [ ] CI passes on Node 22 and 24 — verify: auto

The CI box is ticked at closing time. Ticking it before the merge would take a
second push: another CI run, or a head with no checks.

## Notes

- The stash is the starting point, not a mandate: `npm audit fix` re-runs from scratch if it is
  lost or has gone stale.
- Worth watching at review time: a dev-toolchain refresh is where a supply-chain compromise would
  arrive. 137 moving packages is precisely the diff nobody reads.
