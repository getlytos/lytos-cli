---
id: ISS-0081
title: "Claude Code hook for the Lytos session journal"
type: feat
priority: P2-normal
effort: M
complexity: standard
domain: [integration, ai, audit]
skill: ""
skills_aux: []
status: 1-backlog
branch: "feat/ISS-0081-claude-code-journal-hook"
depends: [ISS-0076]
created: 2026-06-13
updated: 2026-06-13
schema_version: 2
---

# ISS-0081 — Claude Code hook for the Lytos session journal

## Context

[[ISS-0076]] defined the journal contract
([ADR-0003](../../adr/ADR-0003-ai-wrapper-journal-contract.md)) and shipped the
consumer (`lyt absorb`). This issue is the **producer** for Claude Code: a hook
that appends journal lines so `lyt absorb` can fill `ai_implementer`, tokens,
cost, and `skills_used`.

Claude Code has the richest hook surface of the initial targets (SessionStart,
Stop, PostToolUse, …), so it's the natural first producer.

## Proposed solution

- A `Stop` (or per-turn) hook that, when the project is Lytos-managed
  (`.lytos/` present), appends one JSON line to `.lytos/.runtime/session.jsonl`
  with the fields available from the Claude Code environment: model id, session
  id, token usage, cost when exposed, and the active issue (resolved from the
  branch name or the single `3-in-progress/` issue).
- Optionally a `SessionEnd` hook that runs `lyt absorb --apply`.
- Ship as a documented snippet for `.claude/settings.json`, plus a `lyt`
  helper to install it if that proves ergonomic.

## Definition of done

- [ ] Documented hook config that appends valid journal lines per ADR-0003.
- [ ] Verified end-to-end: a real Claude Code session produces a journal that
      `lyt absorb --apply` turns into correct frontmatter.
- [ ] Graceful no-op when the repo is not Lytos-managed.
- [ ] Feasibility of token/cost exposure from Claude Code confirmed (or the
      gap documented).

## Notes

- **Feasibility gate**: confirm which audit fields Claude Code actually exposes
  to hooks before promising delivery. If cost isn't exposed, ship model/session/
  tokens and document the gap.

### Feasibility notes — 2026-11-21

Desk research only: nothing below has been run against a live Claude Code
session yet. It sharpens the feasibility gate above; it does not change the scope.

**What the Claude Code documentation (hooks and status line pages) states**

- Every hook receives on stdin `session_id`, `transcript_path`, `cwd` and
  `hook_event_name`. `Stop` fires once per turn and adds `last_assistant_message`.
- Token usage and cost are not listed in the `Stop` payload on the part of the
  page that was read. That is "not found", not "confirmed absent" — the full
  `Stop` / `SessionEnd` schemas still need a read.
- The file at `transcript_path` is written asynchronously and may lag: the
  messages of the turn that just ended can be missing when `Stop` fires.
- `SessionEnd` cannot block, and its command hooks share a 1.5 s budget by
  default. Keep heavy work out of it.
- The status line receives `model`, `session_id`, `transcript_path` and
  `cost.total_cost_usd`: an estimate at list price, cumulative over the session,
  reset by `/clear`. Its `context_window` token fields describe the current
  window, not cumulative usage, so they cannot fill `tokens_in` / `tokens_out`.

**Questions the feasibility gate has to answer on a real session**

1. Does the transcript carry per-message usage (input, output, cache creation,
   cache read) and the model id?
2. Can one API response appear on several transcript lines? If so, what is the
   de-duplication key? Without it the sums double-count.
3. What does `tokens_in` mean? ADR-0003 says "input tokens for this turn" and is
   silent on cache tokens. Decide whether they are summed in or kept out, and
   document the choice.
4. Where does `cost_usd` come from: a per-model price table, the status line
   value, or nowhere?

**Proposed approach (to be validated by the questions above)**

- A `Stop` hook reads the transcript from a stored offset (kept in
  `.lytos/.runtime/`, which is gitignored), sums usage over the new assistant
  messages and appends one journal line: `model`, `session`, `tokens_in`,
  `tokens_out`, `ts`.
- Omit `issue` from the line so `lyt absorb` resolves the active issue itself
  (ADR-0003 rules: branch name, then the single in-progress issue).
- Catch up on lagging messages at the next `Stop` and at `SessionEnd`, bounded by
  its time budget.
- No-op when `.lytos/` is absent.

**Why the cost question is not optional**

`lyt budget` sums `cost_usd` from the issue frontmatter, and `num()` turns a
missing or empty value into `0`. A hook that ships without `cost_usd` therefore
leaves a `--max-usd` ceiling unable to trigger, while the command still prints
"Within budget: $0.00". `--max-issues` is unaffected. Only what
`lyt absorb --apply` has written to the fiches is counted, so the figure also
lags until it is run. If cost is shipped as a gap, `lyt budget` should say that
no cost data exists rather than report zero.

**Suggested additions to the Definition of done** (for the owner to accept or drop)

- [ ] A test over a synthetic transcript that includes duplicated and lagging
      lines.
- [ ] The meaning of `tokens_in` with respect to cache tokens is decided and
      written down (ADR-0003 or the hook documentation).
- [ ] The behaviour of `lyt budget` when no `cost_usd` exists is specified —
      here or in a follow-up issue, not left implicit.

Related: [[ISS-0091]] (cost feedback loop) reads the same `tokens_*` / `cost_usd`
fields and is only as good as this producer.
