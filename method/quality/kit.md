# Quality kit — gate catalog

*The executable form of Pillar 3 (Standards). Each gate below is **stack-agnostic**;
its `tool` binds it to THIS project's stack. `tiers` says at which `risk` levels the gate
is mandatory — the risk matrix (ADR-0007) selects from this table. A rule that cannot be
bound to a machine checker is declared `reviewer` or `human`, never silently enforced.*

Columns: `id` · `kind` (gate | reviewer | human) · `tiers` (comma-separated: low,medium,high) · `tool` (per-stack binding).

| id | kind | tiers | tool |
|----|------|-------|------|
| tests-unit | gate | low,medium,high | <your test command, e.g. npm test> |
| typecheck | gate | low,medium,high | <e.g. tsc --noEmit> |
| lint | gate | low,medium,high | <e.g. eslint> |
| secrets-scan | gate | low,medium,high | <e.g. gitleaks detect> |
| build-reproducible | gate | low,medium,high | <lockfile committed + CI==local> |
| doc-L0 | gate | low,medium,high | <public API documented> |
| deps-audit | gate | medium,high | <e.g. npm audit --audit-level=high> |
| tests-negative | gate | medium,high | <error-path tests present> |
| perf-budget | gate | medium,high | <size/regression budget> |
| ds-conformance | gate | medium,high | <tokens-only lint, UI changes> |
| doc-L3 | gate | medium,high | <contract/schema ↔ implementation> |
| e2e | gate | high | <end-to-end suite> |
| runbook-smoke | gate | high | <doc L4 runbook replayed in CI, ISS-0120> |
| observability | gate | high | <structured error + correlatable log> |
| migration-check | gate | high | <backward-compat / migration> |
| over-engineering | reviewer | medium,high | rubric:over-engineering |
| security-review | reviewer | high | rubric:security |
| screen-reader | human | high | checklist:a11y |
| product-intent | human | high | checklist:intent |

*Edit this table to your stack: fill the `tool` column, add or remove gates, tighten the
tiers (a project may only tighten — never loosen below `low`). Reference a gate from a
Definition-of-Done item with `— verify: auto:<id>`; `lyt doctor` flags unresolved refs.*
