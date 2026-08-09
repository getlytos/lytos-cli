---
lockfile: ""
docs_source: ""
---

# Stack contract

*The declared stack of this project. The lockfile is the truth for pinned versions;
`docs_source` is where ground-truth API docs are injected from (ADR-0005 §3); the allow-list
below gates new dependencies (a new dep needs an ADR, not a silent add).*

- Set `lockfile:` in the frontmatter (e.g. `package-lock.json`, `poetry.lock`, `Cargo.lock`).
- Set `docs_source:` (e.g. a Context7-style MCP, or a vendored docs path).

## Allowed dependencies

- <list your runtime dependencies here; anything outside this list fails the dependency gate>
