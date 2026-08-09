# ADR-0006 — Cross-surface & multi-user continuity (repo-first, git-flow-native)

Date: 2026-08-09

Status: Proposed

---

## Context

Requirement: a user must be able to **start work on one surface** (phone / Claude Code
web) and **resume on another** (VSCode, Lytos App) — or as a different teammate — the next
day, **losing nothing**, with the **git flow** as the only transport.

Lytos is repo-first, so this is not a new feature to invent — it *is* the core
architecture. State lives in `.lytos/` in git; any surface that clones the repo resumes.
Much of the machinery already exists or is in flight:

- `lyt claim` / `unclaim` (+ ISS-0041 freshness, ISS-0042 atomic claim via branch+push+
  draft PR) — the multi-user lock, built on git ref-update atomicity.
- `lyt pull-notes` (ISS-0096) — repatriates `.lytos/`-only commits from `main` (its own
  docstring names "mobile capture" as the use case).
- `lyt merge-issue` + the union merge driver (ISS-0093) — issue files survive concurrent
  edits without clobbering.
- `lyt board --all --remote` (ISS-0043) — lead view read from `origin`, near-real-time.
- ISS-0040 — which surfaces auto-read `.lytos/` via the bridge file.

This ADR does **not** build a parallel sync system. It **states the continuity contract**
that unifies the above, and names the genuine gaps.

## Decision

### 1. Continuity = the last pushed state

The only thing that transfers between surfaces is the **git repo**. Committed **and
pushed** = portable; uncommitted = local to a (usually ephemeral) container = lost.
Corollary: a surface hands off by **checkpointing** — commit + push. This is the honest
core; there is no live filesystem magic behind it. → gap ISS-0110.

### 2. The portable context is the issue + board + memory — never the chat

Resume-from is the **repo**: issue frontmatter (status, `assignee`, ticked DoD, `branch`),
the memory cortex, and a **WIP handoff note materialized in the issue**. The agent
*conversation* does not cross engines (Claude Code web → VSCode Copilot → the App's chat
are different runtimes) and **must not be relied on**. This is the anti-vibecoding stance
made concrete: the workflow is reproducible from the repo, not from a disposable prompt
thread. → gaps ISS-0112 (WIP note), ISS-0111 (resume).

### 3. Multi-user concurrency is async and merge-based — not live co-editing

"Respecting git flow" means concurrency is resolved by **merge**, not by real-time sync:

- **claim** = an atomic git ref-update; two concurrent claims, one push wins, the loser
  rolls back cleanly (ISS-0041/0042).
- **per-issue files + union merge driver** so two board updates never clobber (ISS-0093).
- **pull-notes** to repatriate board/notes commits dropped on `main` (ISS-0096).
- **board --remote** for the origin-truth lead view (ISS-0043).

Two humans/agents never edit the same *live* file; they commit and merge. Real-time
collaborative editing is explicitly **out** — git flow does not provide it, and async
merge is precisely what preserves auditability.

### 4. Ephemeral surfaces need an *assisted* checkpoint, not manual discipline

Today the cloud/mobile rule asks the human to "commit per issue + push" by hand. On an
ephemeral container a forgotten push loses in-flight work. A `lyt checkpoint` — and an
optional session-end hook — commits WIP to a durable ref and pushes, so a dropped
container loses nothing. → gap ISS-0110.

### 5. Stable per-human identity across surfaces

Claim and `assignee` attribution anchor on git identity (`git config user.name`). The same
human on phone, VSCode, and the App must resolve to the same identity for the audit trail
to hold. Anchored on git identity; noted here, minor, no new primitive expected.

## Invariants & limits (the honest lines)

1. **Unpushed = lost.** The checkpoint is the mitigation, not magic. No live FS sync.
2. **The chat does not transfer.** Materialize into the repo (DoD ticks, WIP note) or lose
   it. The repo is the memory; the conversation is disposable.
3. **Multi-user = merge, not live sync.** Async, git-flow-native, auditable.
4. **No central state store.** Continuity is the repo, consistent with the manifest
   ("Aucun stockage central au MVP", repo-first, no lock-in).

## Consequences

**Gap issues** (`lytos-cli`): `lyt checkpoint` (ISS-0110), `lyt resume` (ISS-0111), the
WIP handoff-note convention (ISS-0112).

**Already covered** (reference, do not duplicate): claim (ISS-0041/0042), union merge
(ISS-0093), pull-notes (ISS-0096), board --remote (ISS-0043), surface compatibility
(ISS-0040).

**Session-start skill**: task-end must include *write the WIP note + checkpoint* so a
handoff never depends on the chat.

**App / direction 2** (`lytos-app`): the surface-handoff UX — "continue where you left
off", the VSCode-side resume, the App picking up an in-progress issue — consumes these
primitives; it does not replace them.

**Propagation**: method decision → fold into ISS-0106 (the continuity contract belongs in
LYTOS.md / rules alongside the loop-B and standards decisions).

## Non-goals

- Real-time collaborative editing of the same file.
- Syncing or migrating the agent conversation across surfaces.
- Any central server or state store outside the git repo.
