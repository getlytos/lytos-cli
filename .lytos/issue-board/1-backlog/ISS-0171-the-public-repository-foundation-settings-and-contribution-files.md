---
id: ISS-0171
title: "The public repository foundation: settings and contribution files"
type: chore
priority: P1-high
effort: M
complexity: standard
skill: documentation
skills_aux: []
status: 1-backlog
branch: "docs/ISS-0171-public-repository-foundation"
depends: []
related: [ISS-0161]
created: 2026-11-20
schema_version: 2
risk: medium
---

# ISS-0171 — The public repository foundation: settings and contribution files

## Context

Lytos is public, MIT-licensed, and will be looked at by other developers (ISS-0161). Before any launch the repository needs the controls and the welcome documents that keep the maintainer in charge: nothing merges, tags or publishes without them.

## Proposed solution

Repository settings applied on 2026-11-20 through the GitHub API (squash merge only, branches deleted after merge, secret scanning and push protection, dependency alerts and security fixes, private vulnerability reporting, approval of CI runs for every outside contributor, `main` protected, `v*` tags reserved to administrators) and the files in this change (`CONTRIBUTING.md`, `SECURITY.md`, issue and pull request templates, `CODEOWNERS`, release-note categories).

| Option | Build cost | Maintenance | Robustness |
|---|---|---|---|
| A. Settings through the API plus files | low | low | verified by a refused direct push to `main` |
| B. Only documents | lowest | lowest | nothing enforces them |

Decision: **A**.

## Ready

- **Scope** — settings and files above.
- **Out of scope** — the CI operating-system matrix (ISS-0172), a code of conduct beyond the short section in `CONTRIBUTING.md`, version-update bots.
- **Solution** — settings by API, documents in the repository.
- `risk: medium`.

## Definition of done

- [ ] A direct push to `main` is refused and a pull request needs the CI green — verify: auto
- [ ] The contribution files exist and the templates load in GitHub — verify: auto
- [ ] Secret scanning, push protection, dependency alerts and private vulnerability reporting are enabled — verify: auto
- [ ] The contribution model (issues first, pull requests on invitation) is the one the owner wants — verify: human:product-intent
