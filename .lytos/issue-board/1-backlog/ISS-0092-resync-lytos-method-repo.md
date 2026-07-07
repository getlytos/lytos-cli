---
id: ISS-0092
title: Resync the lytos-method repo (root/dogfood/starter) with the canonical lytos-cli/method
type: chore
priority: P2-normal
effort: M
complexity: standard
domain: [method, docs]
skill: documentation
status: 1-backlog
depends: []
created: 2026-07-07
updated: 2026-07-07
schema_version: 2
---
# ISS-0092 — Resync the lytos-method repo with the canonical method

## Context

The canonical method source is `lytos-cli/method/` (shipped in the npm package). The public `lytos-method` repo lags behind it on several structural points — flat `skills/*.md` instead of agentskills.io folders, no `4-review` flow, no mid-session/reactive-work section, no bootstrap batching exception, no AI session journal (schema v2) — and its `starter/` scaffold diverges even from its own root copies.

Caught by the ISS-0090 cross-model audit #2 (Codex gpt-5.5): `starter/.lytos/skills/session-start.md` omits the mid-session section and changes task-completion wording relative to root/dogfood. ISS-0090 synced only the model-guidance section; the broader divergence is pre-existing and out of that issue's scope.

## Proposed solution

Decide the relationship first, then enforce it:

- **Option A — mirror**: `lytos-method` becomes a generated mirror of `lytos-cli/method/` (script or CI), starter included. No hand edits.
- **Option B — retire**: the repo redirects to lytos-cli as the single source, keeping only README/MANIFESTO.
- Either way: one source of truth, no third lineage in `starter/`.

## Definition of done

- [ ] Relationship decided and documented (mirror vs retire)
- [ ] All copies byte-identical to the canonical (or repo retired)
- [ ] `starter/` scaffold regenerated from the same source
- [ ] Sync mechanism in place (script/CI) so it cannot drift again
