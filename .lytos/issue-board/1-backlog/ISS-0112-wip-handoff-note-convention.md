---
id: ISS-0112
title: "WIP handoff note convention — put \"where I am\" in the issue"
type: feat
priority: P1-high
effort: S
complexity: standard
domain: [cli, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: []
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0112 — The portable context is the issue, not the chat

## Context

An agent's chat does not cross surfaces (Claude Code web → VSCode → App are different runtimes).
What resumes tomorrow is **the repo**: status, ticked DoD, branch… and what is missing is "where
I was / what's next" (ADR-0006 §2). It has to be materialised in the issue before finishing,
otherwise it is lost — that is the anti-vibecoding stance.

## The gesture

A normed `## WIP handoff` section in the issue body (last state, next step, known traps), which
the agent **writes before ending a session** and the next one reads first. The CLI recognises it:
`lyt show ISS-X` surfaces it at the top when present, dated so staleness is visible. Wired into
the `session-start` skill (end-of-task gesture: WIP note + checkpoint).

## Definition of done

- [ ] `## WIP handoff` convention documented (issue template + rules) — *verify: human*
- [ ] `lyt show ISS-X` surfaces the note at the top when present — *verify: auto*
- [ ] `session-start`: "write the WIP note" added to the end-of-task gesture — *verify: human*
- [ ] Is the note actually sufficient to resume cold — *verify: human*

## Notes

- Read by `lyt resume` (ISS-0111). Ref: ADR-0006 §2. The repo is the memory, the chat is disposable.
