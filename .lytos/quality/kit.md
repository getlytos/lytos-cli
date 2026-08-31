# Quality kit — gate catalog (lytos-cli)

*Pillar 3 made executable for this project. Stack-agnostic gates, bound to the CLI stack
(TypeScript, tsup, Vitest, ESLint). `tiers` = risk levels where the gate is mandatory; the
risk matrix (ADR-0007) selects from here.*

| id | kind | tiers | tool |
|----|------|-------|------|
| tests-unit | gate | low,medium,high | npm test |
| typecheck | gate | low,medium,high | npm run typecheck |
| lint | gate | low,medium,high | npm run lint |
| secrets-scan | gate | low,medium,high | npm run secrets:scan |
| format | gate | low,medium,high | npm run format:check |
| build-reproducible | gate | low,medium,high | package-lock.json committed; CI runs the same |
| doc-L0 | gate | low,medium,high | every command/lib has a header doc comment |
| deps-audit | gate | medium,high | npm audit --omit=dev --audit-level=high |
| tests-negative | gate | medium,high | error-path tests (bad input → exit code + message) |
| doc-L3 | gate | medium,high | frontmatter schema doc ↔ parser (ADR-0001) |
| over-engineering | reviewer | medium,high | rubric:over-engineering (diff vs effort, new deps) |
| runbook-smoke | gate | high | doc L4 runbook replayed in CI (ISS-0120) |
| product-intent | human | high | checklist:intent |

*Reference a gate from a DoD item with `— verify: auto:<id>` (e.g. `verify: auto:tests-negative`);
`lyt doctor` flags refs absent from this table.*
