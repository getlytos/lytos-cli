---
id: ISS-0143
title: Five high advisories in the dev toolchain — and the format sweep the fix drags in
type: chore
priority: P2-normal
effort: S
complexity: standard
domain: [cli, ci]
skill: 
skills_aux: []
status: 1-backlog
branch: chore/ISS-0143-refresh-dev-dependencies
depends: [ISS-0142]
created: 2026-08-31
schema_version: 2
risk: low
---

# ISS-0143 — The fix is one command; what it drags in is the issue

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

## Ready

- **Scope** — restore the audit-fixed lockfile, run the prettier sweep as a **separate commit**
  registered in `.git-blame-ignore-revs`, and verify the whole gate set on the new tree.
- **Constraints** — the sweep commit must contain formatting only, no logic change. `npm audit
  --omit=dev` must stay at 0. Land after ISS-0142, never before.
- **Out of scope** — production dependencies, the Node version matrix, and any behaviour change.
- `risk: low` — dev dependencies only; nothing here reaches the published package.

## Definition of done

- [ ] `npm audit --audit-level=high` exits 0 — verify: auto
- [ ] `npm audit --omit=dev` still reports 0 vulnerabilities — verify: auto
- [ ] The prettier sweep is its own commit, formatting only, listed in `.git-blame-ignore-revs` — verify: auto
- [ ] Format, lint, typecheck, secrets, build and the full test suite pass on the refreshed tree — verify: auto
- [ ] CI passes on Node 20 and 22 — verify: auto

## Notes

- The stash is the starting point, not a mandate: `npm audit fix` re-runs from scratch if it is
  lost or has gone stale.
- Worth watching at review time: a dev-toolchain refresh is where a supply-chain compromise would
  arrive. 137 moving packages is precisely the diff nobody reads.
