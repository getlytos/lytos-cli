---
id: ISS-0189
title: "Consolidate the independence modules"
type: refactor
priority: P3-low
effort: L
complexity: standard
skill: ""
skills_aux: []
status: 1-backlog
branch: ""
depends: []
related: [ISS-0181]
created: 2026-11-20
schema_version: 2
risk: low
---

# ISS-0189 — Consolidate the independence modules

## Context

Over-engineering finding F12 of the first 1.7 review: the independence code is spread over nine `independence*.ts` files (about 1,500 lines) and three modules render the same facts. Behavior is covered by tests, so the code can be simplified without changing it. Candidate for the next minor release.

## Proposed solution

Merge the modules by responsibility (computation, policy, record, rendering) and delete the duplicated rendering, with no behavior change.

| Option | Build cost | Maintenance | Robustness |
|---|---|---|---|
| A. Merge by responsibility, keep every test | medium | lower after | tests prove no change |
| B. Leave as is | none | higher: nine files to read | works |

Decision: **A**, after 1.7.1, when the rules are stable.

## Ready

- **Scope** — the modules and their imports.
- **Out of scope** — any behavior or message change.
- **Solution** — a pure refactor under the existing tests.
- `risk: low`.

## Definition of done

- [ ] The whole test suite passes unchanged, with no test edited to fit — verify: auto
- [ ] The module count and total lines under `src/lib/independence*` go down — verify: auto
- [ ] The result is simpler to read and nothing was lost — verify: reviewer:over-engineering
