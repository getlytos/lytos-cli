---
id: ISS-0035
title: "Update lytos-method READMEs and lytos.org homepage for launch"
type: chore
priority: P1-high
effort: M
complexity: standard
skill: documentation
status: 1-backlog
branch: "chore/ISS-0035-update-readme-homepage"
depends: []
created: 2026-04-16
---

# ISS-0035 — Update lytos-method READMEs and lytos.org homepage for launch

## Context

The lytos-method README and lytos.org homepage are outdated. They present Lytos as a theoretical method (markdown files to copy) instead of a concrete tool + method. The CLI (`lyt init`, `lyt board`, `lyt lint`, `lyt doctor`, `lyt show`, `lyt start`, `lyt close`) is not mentioned. No links between repos/site. No punchlines. Communication is about to start — these pages must be ready.

## Checklist

- [ ] Rewrite lytos-method README.md (EN): add CLI + npm badge, update Get Started to `lyt init`, add CLI commands section, add punchlines, link to lytos.org
- [ ] Rewrite lytos-method docs/fr/README.md (FR): same updates in French
- [ ] Update lytos.org homepage (FR): reflect current CLI commands, ensure links work
- [ ] Update lytos.org homepage (EN): same
- [ ] Cross-link: method repo → site, site → npm, site → method repo
