---
id: ISS-0152
title: "Drop end-of-life Node 20: CI matrix 22/24, engines >=22"
type: fix
priority: P1-high
effort: XS
complexity: light
domain: [devops, security]
skill: ""
skills_aux: []
status: 4-review
branch: "fix/ISS-0152-drop-node-20"
depends: []
created: 2026-10-29
updated: 2026-10-29
---

# ISS-0152 — Drop end-of-life Node 20: CI matrix 22/24, engines >=22

## Context

Node.js security release of 2026-10-21: CVE-2026-111497 ("Node2Shell", Brotli decoder out-of-bounds write, remote code execution; on CISA KEV since 2026-10-27) plus nine other CVEs. Fixed in 22.23.4, 24.22.1 and 26.12.1. Node 20 and older are end of life and get no fix.

## Change

- CI matrix: Node 20, 22 → 22, 24.
- `engines.node`: `>=20.0.0` → `>=22.0.0` (package.json and package-lock.json). Users still on Node 20 get an engine warning on install.
- Manifest and stack docs: Node.js 22+.

## Checklist

- [x] Version bump, `actionlint` clean on the modified workflows
- [ ] CI green
