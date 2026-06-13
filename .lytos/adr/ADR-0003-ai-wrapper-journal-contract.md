# ADR-0003 — AI wrapper journal contract for schema v2 audit fields

Date: 2026-06-13

Status: Accepted

> Phase 4 of the schema v2 rollout (ADR-0001). Phase 5 is ADR-less (`lyt
> migrate-frontmatter`, ISS-0077). This ADR was numbered 0003 because 0002 is
> already taken by "BOARD.md is a derived artifact".

---

## Context

Schema v2 (ADR-0001) defined the most distinctive audit fields — `ai_implementer`,
`ai_reviewer`, `tokens_in`/`tokens_out`, `cost_usd`, `skills_used`. Phase 3
shipped the write paths the CLI *can* own (`lyt start` / `review` / `close` write
lifecycle + verdict). But the CLI cannot know **which model is talking to it, on
what session, at what cost** — only the AI wrapper driving the session knows.

If these fields are never filled, schema v2 has a hole in exactly the spot Lytos
claims to differentiate itself from vibecoding: *which AI produced this code, at
what cost, on what prompts.*

The wrapper integrations themselves (Claude Code hook, Cursor plugin, Codex CLI)
are per-target and ship at their own pace. What they all need first is **one
stable contract to write to** that does not change when any single wrapper
changes. That contract is this ADR.

---

## Decision

A two-layer design that decouples the (many, fragile) producers from the (one,
stable) consumer.

### 1. The journal — what wrappers write

An append-only JSON Lines file:

```
.lytos/.runtime/session.jsonl
```

- **Append-only.** A wrapper appends one line per turn (or per session). It never
  rewrites or reads back — the thinnest possible integration.
- **Not tracked in git.** `.lytos/.runtime/` is local, transient session state.
  It is gitignored (by this repo and by the `lyt init` scaffold).
- **One JSON object per line.** Unknown keys are ignored; malformed lines are
  skipped and counted, never fatal — a wrapper bug must not corrupt the audit.

Line schema (every field optional):

| Field | Type | Meaning |
|-------|------|---------|
| `issue` | string | Target issue ID. If absent, attributed to the resolved active issue. |
| `role` | `"implementer"` \| `"reviewer"` | Which v2 role this turn played. |
| `model` | string | Exact model id at work time (e.g. `claude-opus-4-7`). |
| `session` | string | Session / conversation id. |
| `prompt_ref` | string | Primary skill or prompt used (e.g. `skills/code-structure/SKILL.md`). |
| `tokens_in` | number | Input tokens for this turn. |
| `tokens_out` | number | Output tokens for this turn. |
| `cost_usd` | number | Cost for this turn, USD. |
| `skills` | string[] | Skills exercised this turn (runtime trace). |
| `ts` | string | ISO-8601 timestamp (informational). |

Example:

```jsonl
{"issue":"ISS-0076","role":"implementer","model":"claude-opus-4-7","session":"s-1","prompt_ref":"skills/code-structure/SKILL.md","tokens_in":1200,"tokens_out":340,"cost_usd":0.018,"skills":["code-structure"],"ts":"2026-06-13T05:00:00Z"}
{"issue":"ISS-0076","role":"implementer","model":"claude-opus-4-7","session":"s-1","tokens_in":800,"tokens_out":210,"cost_usd":0.012,"skills":["testing"]}
```

### 2. `lyt absorb` — what the consumer reads

A single command aggregates the journal into the active issue's frontmatter:

```
lyt absorb [issue-id] [--dry-run] [--json]
```

**Aggregation rules (per issue):**

- **Identity fields** (`model`, `session`, `prompt_ref`), per role → last non-empty
  value wins (a session's model rarely changes; the last turn is the most
  representative). Written as `ai_implementer.{…}` / `ai_reviewer.{…}`.
- **Counters** (`tokens_in`, `tokens_out`, `cost_usd`) → summed across **all roles**
  (per ADR-0001, these are cumulative totals, implementer + reviewer).
- **`skills`** → unioned, de-duplicated, sorted → `skills_used`.

**SET, not ADD.** `lyt absorb` writes the aggregate of the *entire* journal for
the issue, overwriting the journal-derived fields. This makes it **idempotent**:
re-running with an unchanged journal yields identical frontmatter. Cumulative
growth comes from the journal being append-only, not from the command adding to
prior frontmatter values. The command owns these fields; it never touches
human/lifecycle fields.

**Active-issue resolution** (when `[issue-id]` is omitted), first match wins:

1. A line's explicit `issue` field.
2. An `ISS-####` token in the current git branch name.
3. Exactly one issue in `3-in-progress/`.
4. Otherwise: error asking for an explicit `lyt absorb ISS-####`.

### 3. `ai_reviewer`

The journal carries it via `role: "reviewer"` lines, absorbed the same way as the
implementer. `lyt review` continues to own the **human** `reviewer` handle and the
`review` verdict; the journal owns the **AI** reviewer's model/session/cost. The
two are orthogonal and never collide.

---

## Per-target producer issues

The producer side (instrumenting each wrapper to emit journal lines) is explicitly
**out of scope** here and split into independent follow-ups, each gated on that
wrapper's hook feasibility:

- ISS-0081 — Claude Code hook for the Lytos session journal
- ISS-0082 — Cursor plugin: write the Lytos session journal
- ISS-0083 — Codex CLI: write the Lytos session journal

---

## Consequences

- Wrappers integrate by appending JSONL — no Lytos SDK, no read-back, no coupling
  to frontmatter shape. The contract is the file, not the code.
- `lyt absorb` is unit-testable against synthetic journal lines with no real AI
  wrapper, which is how the reference implementation is verified.
- Because the journal is gitignored and local, cross-machine cumulative cost is
  not captured by this layer alone. That is acceptable for the reference layer;
  centralization (if ever wanted) is the Lytos App's job, not the CLI's.
- Malformed/partial journals degrade gracefully (skip + count), so a buggy wrapper
  can never make `lyt absorb` fail or corrupt an issue.

---

## Non-goals

- Not instrumenting any specific wrapper (per-target issues).
- Not inventing cost data — absent counters stay absent, never zero-filled.
- Not a billing system — `cost_usd` is self-awareness, per ADR-0001.
