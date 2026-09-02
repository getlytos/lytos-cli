# Memory — Discovered Patterns

*Code, structure, or organization patterns that have emerged and work well on this project. Load
this file for code review, refactoring, or writing new code.*

---

### A rule with no `tool` binding is not a rule — it is a wish

**What**: Every quality rule is bound to something that executes, or is explicitly declared
`reviewer` (a model against a written rubric) or `human`. Nothing sits in `rules/` looking enforced
while nothing checks it.
**Where**: `.lytos/quality/kit.md`, `src/lib/quality.ts`.
**Why it works**: It makes the classification greppable — you can see at a glance which rules are
machine-enforced and which are somebody's judgment. "Prefer KISS" cannot be a gate; saying so out
loud is the point.

### A gate nothing executes is not a gate

**What**: Before trusting a gate, check that a workflow actually runs it.
**Where**: `.github/workflows/ci.yml` and `release.yml` run the identical sequence, in the same
order, verified by parsing the YAML rather than reading it.
**Why it works**: `format:check` and `secrets:scan` sat in the kit for months while running
nowhere — and `format` had never passed on `src/` at all. The publish path validated *less* than
the review path for four months.

### The asymmetry that keeps a signal from becoming wallpaper

**What**: When reporting gaps, flag only what nothing else catches. `gateCoverage()` does not flag
an unpinned `gate` — CI runs it regardless — but does flag an unpinned `reviewer` or `human` entry,
because no command will ever run those.
**Where**: `src/lib/quality.ts`, `src/commands/gates.ts`.
**Why it works**: Flagging everything would warn on every issue in the repository. A warning
nobody can act on teaches people to ignore warnings.

### Proportionality is a threshold, not an adjective

**What**: "Keep it proportional" is not decidable. `effort` is: XS/S owe the two-line Ready, M and
above owe scope and constraints. An unstated field gets the stricter form — for an entry gate, an
unstated field is not a licence to ask for less.
**Where**: `src/lib/ready.ts`, `method/rules/default-rules.md`.
**Why it works**: The rule was already being followed by hand; enforcing it changed **zero** live
issues from ready to not-ready. Measuring the blast radius before shipping a hardening is what
made it a safe call rather than a judgment.

### Verify by parsing, not by reading

**What**: When a DoD item says two files agree, assert it in code rather than eyeballing them.
**Where**: the CI/release gate-parity check; `npm pack --dry-run` before a release; `lyt doctor
--json` in tests.
**Why it works**: Every claim this project made and did not check turned out false eventually —
the workflow comment claiming trusted publishing, the stack contract promising a dependency gate,
`lyt gates` promising to flag what is missing.

### One commit per issue, `Refs: ISS-XXXX` as the join key

**What**: Each commit references exactly one issue. `lyt review` selects an audit's diff by
`--grep=Refs: ISS-XXXX` across **all** refs.
**Where**: `src/lib/review.ts`.
**Why it works**: It survives what `branch:` cannot. Four fiches sharing a branch once produced
four identical 7113-line diffs and an auditor reporting one issue's defect on another.

### Derived artifacts are regenerated, gitignored, never hand-written

**What**: `BOARD.md` and `JOURNAL.md` are outputs, not sources — ADR-0002.
**Where**: `lyt board`, `lyt journal --write`, both `.gitignore` copies.
**Why it works**: Tracking `BOARD.md` caused recurring merge conflicts on multi-change PRs. The
frontmatter is the single source of truth; everything else is a view of it.

### Write the narrowing where the reader meets it

**What**: When a promise is narrowed, the narrowing goes in the artifact a reader opens — the kit
table, the rules file — not only in the fiche that decided it.
**Where**: `method/quality/kit.md` (why doc-L1/L2 are absent, why `screen-reader` stays at high),
`method/rules/default-rules.md` (the `effort` threshold).
**Why it works**: A rule a reader cannot apply the way the tool does is the drift that produces
the next audit finding.
