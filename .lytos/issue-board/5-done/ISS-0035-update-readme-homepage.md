---
id: ISS-0035
title: "Update lytos-method READMEs and lytos.org homepage for launch"
type: chore
priority: P1-high
effort: M
complexity: standard
skill: documentation
status: 5-done
branch: "chore/ISS-0035-update-readme-homepage"
depends: []
created: 2026-04-16
updated: 2026-04-18
---

> **TRANSFERRED — misfiled in lytos-cli.** This issue's scope spans two other repos (lytos-method, lytos-website) — no lytos-cli files are touched. Per the one-issue-per-repo convention (`lytos-method/ISS-0016`), it is closed here.
>
> **Method side (lytos-method):** both READMEs (EN + FR) have been updated in a prior session — badges, `lyt init`, CLI commands section, cross-links to lytos.org and npm. Verified with grep: 26 CLI-related mentions in each README. Nothing left to do method-side.
>
> **Website side (lytos-website):** the site repo has no `.lytos/` board, so website launch work is tracked externally (not in any Lytos board). If formal tracking is needed, run `lyt init` in lytos-website first, then create a dedicated issue there.

---

# ISS-0035 — Update lytos-method READMEs and lytos.org homepage for launch

## Context

The lytos-method README and lytos.org homepage were outdated. They presented Lytos as a theoretical method (markdown files to copy) instead of a concrete tool + method. The CLI (`lyt init`, `lyt board`, `lyt lint`, `lyt doctor`, `lyt show`, `lyt start`, `lyt close`) was not mentioned. No links between repos/site. No punchlines. Communication is about to start — these pages had to be ready.

## Checklist

- [x] Rewrite lytos-method README.md (EN): add CLI + npm badge, update Get Started to `lyt init`, add CLI commands section, add punchlines, link to lytos.org
- [x] Rewrite lytos-method docs/fr/README.md (FR): same updates in French
- [ ] Update lytos.org homepage (FR): reflect current CLI commands, ensure links work — *deferred, tracked externally*
- [ ] Update lytos.org homepage (EN): same — *deferred, tracked externally*
- [x] Cross-link: method repo → site, site → npm, site → method repo — *method side done; site side deferred with above*
