# Memory — Architecture & Technical Decisions

*Load this file for any task that affects the project structure. Durable decisions live in
`adr/` — this file points at them and records what an agent needs before reading code.*

---

### 2026-04-13 — TypeScript + Commander.js + tsup

**Context**: Choosing the stack for the CLI. Options: plain Node.js, oclif, Commander.js, yargs.
**Decision**: TypeScript for type safety, Commander.js for CLI parsing (lightweight,
well-maintained), tsup for bundling (fast, zero-config for TypeScript).
**Consequence**: A single runtime dependency. The bundle is one JS file. Still true — `commander`
is the only entry in `dependencies`, and the stack contract enforces it (`lyt doctor` reports a
runtime dependency that `quality/stack.md` does not allow-list).

### 2026-04-13 — No YAML parser dependency

**Context**: Issues carry YAML frontmatter. Full parsers (js-yaml) are heavy for simple key-value
data.
**Decision**: A hand-written parser for the subset used (strings, lists, dates).
**Consequence**: Smaller bundle, no dependency. Nested YAML would force a reconsideration — and
schema v2 came close, with `ai_reviewer:` as a nested block (ADR-0001). It held.

### 2026-04-13 — One file per command in `src/commands/`

**Context**: How to organise command implementations.
**Decision**: Each command is self-contained in `src/commands/`; `src/cli.ts` only registers them.
**Consequence**: Commands are independently testable and the entry point stays small. Shared logic
lives in `src/lib/` — `quality.ts`, `dod.ts`, `ready.ts`, `review.ts`, `journal.ts`, `doctor.ts`.

### Since — the decisions that shaped the current codebase

Recorded as ADRs; read the ADR rather than a summary of it. What matters at session start:

| ADR | What it changes about the code | Status |
|-----|-------------------------------|--------|
| [ADR-0001](../../adr/ADR-0001-frontmatter-schema-v2.md) | The frontmatter is the audit journal. Schema v2 fields are optional, backward-compatible, and auto-populated by `start`/`review`/`close` | Accepted |
| [ADR-0002](../../adr/ADR-0002-board-md-derived-artifact.md) | `BOARD.md` — and now `JOURNAL.md` — are derived, gitignored, regenerated | Accepted |
| [ADR-0003](../../adr/ADR-0003-ai-wrapper-journal-contract.md) | The AI session journal → frontmatter contract (`lyt absorb`) | Accepted |
| [ADR-0004](../../adr/ADR-0004-autonomous-loop-under-governance.md) | The governed loop. §4 defines the DoD verification modes — revised in place to three (`auto`/`reviewer`/`human`) | Proposed |
| [ADR-0005](../../adr/ADR-0005-executable-standards-quality-kit.md) | The quality kit: gate catalog + stack contract | Proposed |
| [ADR-0006](../../adr/ADR-0006-cross-surface-multi-user-continuity.md) | Multi-surface continuity — `claim`, `pull-notes`, the union merge driver | Proposed |
| [ADR-0007](../../adr/ADR-0007-risk-tiered-gates-doc-levels-ready.md) | Rigor follows blast radius: the risk→gate matrix, doc levels, Definition of Ready | Proposed |
| [ADR-0008](../../adr/ADR-0008-human-capability-contract.md) | The human capability contract — comprehension, competence, operability | Proposed |

**Five of the eight are still `Proposed`** while the loop applies them daily. ADR-0004 §4 was
revised in place rather than superseded precisely because it was never accepted — a proposal
surviving contact with its own dogfooding is what `Proposed` is for.

### The three helpers a new checker should reuse

Fiche text is prose containing code, and three checkers learned the same lesson separately (see
`bugs.md`). Before scanning a fiche:

- `dodSection(content)` (`src/lib/dod.ts`) — the Definition of Done alone, fences excluded
- `readySection(content)` (`src/lib/ready.ts`) — the `## Ready` section, closing only on a heading
  at its own level or above
- `withoutCode(content)` (`src/lib/doctor.ts`) — prose with fenced blocks and code spans removed

### The release path is OIDC, and holds no credential

`release.yml` publishes through npm trusted publishing: no `NODE_AUTH_TOKEN`, provenance
automatic, Node 22 plus an npm upgrade for the ≥ 11.5.1 floor, and a step that **asserts** no
`_authToken` line survives in `.npmrc`. It runs the same gate sequence as `ci.yml`, in the same
order, on purpose. Do not add a token back: one would take precedence and silently restore the
path that failed for four months.
