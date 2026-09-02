---
id: ISS-0093
title: The "union of sections" merge driver for issue fiches
type: feat
priority: P1-high
effort: M
complexity: standard
domain: [cli, git, dx]
skill: 
skills_aux: []
status: 5-done
branch: feat/1.4.0-retour-terrain
depends: []
created: 2026-08-04
updated: 2026-08-10
schema_version: 2
completed_at: 2026-08-10
---
# ISS-0093 — Issue fiches must stop producing merge conflicts

## Field feedback (immo project, night of 03–04/08)

Two merge conflicts on fiches in a single night, both resolved by hand. The cause is structural:
fiches live by APPEND (audit responses, delivered slices, logs) — two branches each adding a
section to the same fiche conflict, even though **the union of the two is always the right
resolution**.

## The gesture

`lyt init` (with `lyt doctor` checking it) installs a git merge driver, declared through
`.gitattributes` on `.lytos/issue-board/**/*.md`: the frontmatter is merged field by field (a real
conflict only when the SAME field diverges — the one case that deserves a human), and the body is
merged as an ordered union of the appended `##` sections. Implementation: a hidden subcommand
`lyt _merge-issue %O %A %B` plus the git config that `init` writes.

- [x] Driver: union of body sections, field-by-field frontmatter merge
- [x] `lyt init` writes `.gitattributes` + git config; `lyt doctor` checks they are there
- [x] Tests: append//append (automatic), same field edited (conflict kept), a section rewritten on
      both sides (conflict kept — a rewrite is not an append)

## Audit — 2026-08-10

**Verdict:** GO

### Checks
- [x] Tests pass (325)
- [x] Machine-verifiable DoD items (`verify: auto`) complete
- [x] Rules respected
- [x] Documentation aligned

### Notes
Re-review: the prior critical finding is withdrawn. The published package exposes the `lyt` bin; it resolves for both the documented global install and a local devDependency. In this environment `npx lyt` fails before executing any bin because the npm npx cache is root-owned, while the globally installed `lyt --version` succeeds. That is an environment repair, not a merge-driver defect. The structural merge tests cover the required append and conflict cases.


**Verdict:** NO_GO

### Checks
- [x] Tests pass (313)
- [x] Rules respected except for the executable invocation contract
- [ ] Documentation aligned

### Notes
[CRITICAL] src/lib/merge-driver.ts:19 configures Git with `npx lyt _merge-issue ...`. The published package is `lytos-cli`; a clean consumer project has no `lyt` package or local `lyt` binary, so `npx lyt` cannot start this hidden driver. The integration test bypasses the installed command with `node dist/cli.js`, leaving the shipped path unproven.

### To fix before next review
- [ ] Configure the driver with an invocation that resolves the published `lytos-cli` package, then cover it from a clean consumer fixture.
- [ ] Align the generated guidance with that executable command.

## Response to audit — 2026-08-10

**The [CRITICAL] finding is rejected: it was reasoned from the package name, never executed.**

`npx` resolves a binary from `node_modules/.bin`, then from `$PATH`, and only falls back to
fetching from the registry when both miss. `package.json` declares three bins — `lyt`, `lytos`,
`lytos-cli` — so the documented install (`npm install -g lytos-cli`, README §Install) puts `lyt`
on `$PATH`. Measured in a directory with no `node_modules` and no `package.json`:

```
$ which lyt
/Users/…/node/v22.23.1/bin/lyt
$ npx lyt --version
1.4.0                      # exit 0, no registry fetch
```

The driver command is therefore executable on the shipped path. It is also the *more* robust
form, not the less: it covers both supported installs — global (resolved via `$PATH`) and local
devDependency (resolved via `node_modules/.bin`). The devDependency case is precisely the field
incident that motivated ISS-0097 (`lyt not found` on a bare `lyt`), so replacing `npx lyt` with
a bare `lyt` would reintroduce the bug this epic fixed.

Residual risk, checked: if `lytos-cli` is installed nowhere, `npx lyt` falls through to the
registry. Both candidate names are unregistered — `npm view lyt` → 404 (unpublished 2017),
`npm view lytos` → 404 — so the failure mode is a clean 404, not the silent execution of an
unrelated package. No supply-chain exposure.

**Verdict contested → back to `4-review` for re-audit.** No code change was required.
