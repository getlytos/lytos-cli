---
id: ISS-0084
title: "Align ADR-0003 with the `lyt absorb` implementation (merge vs overwrite, --apply, active-issue)"
type: docs
priority: P2-normal
effort: S
complexity: light
domain: [audit, adr, cli]
skill: ""
skills_aux: []
status: 1-backlog
branch: "docs/ISS-0084-align-adr-0003-absorb"
depends: [ISS-0076]
created: 2026-06-14
updated: 2026-06-14
schema_version: 2
---

# ISS-0084 — Align ADR-0003 with the `lyt absorb` implementation

## Context

Found during the Sprint #03 review (ISS-0076). ADR-0003 §2 describes "overwrite / SET" semantics and states that `lyt absorb` rewrites the fields derived from the journal, but the code only *merges* the keys **present** in the delta (`updatedFm[key] = value`) — it never clears fields the current journal has stopped producing. Verified: reducing the journal to a single implementer line leaves stale `ai_reviewer` / `cost_usd` / `skills_used` in the frontmatter. Harmless in the documented append-only / per-session workflow, but the ADR — the **audit contract** — literally says "overwrite".

Two related drifts:
- The ADR documents `lyt absorb [issue-id] [--dry-run] [--json]`, but the shipped flag is `--apply` (dry-run by default, safer) — `--dry-run` is rejected (exit 1).
- The §2 active-issue resolution conflates the journal's per-line attribution with command-level resolution (explicit arg → `ISS-####` in the branch → the single `3-in-progress/` issue → error).

## Proposed solution

- **Option A** (keep the wording): clear every "command-owned" field before applying the delta → a true overwrite.
- **Option B**: soften the ADR wording to "merges present fields".
- Either way: fix the documented signature (`--apply`) and clarify the active-issue resolution.

## Definition of done

- [ ] ADR-0003 §2 and the `lyt absorb` code agree on the semantics (decision made and implemented).
- [ ] Documented signature = shipped signature (`--apply`, dry-run by default).
- [ ] Active-issue resolution wording clarified.
- [ ] Test covering the chosen semantics (stale field cleared OR explicitly kept).
