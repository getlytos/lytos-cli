---
id: ISS-0108
title: "Ground-truth injection skill (Context7-like) + verification"
type: feat
priority: P1-high
effort: M
complexity: heavy
domain: [cli, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0107]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0108 — You don't ask for the "latest API", you supply it

## Context

An agent hallucinates or deprecates an API from its own memory (training cutoff). You do not fix
that with an instruction: you **put the real documentation of the pinned version into the
context** and require a citation. That is retrieval, not memory (ADR-0005 §3).

## The gesture

A skill that, at work time, resolves versions from the lockfile (the stack contract, ISS-0107),
injects the documentation **for those versions** (a Context7-style MCP source or vendored docs)
and requires the agent to **cite** the API it used. The pairing is mandatory: injection **plus**
typecheck/tests (which catch an invented API) **plus** citation verification by the reviewer.
Sources are **allow-listed and pinned** — live documentation is a prompt-injection vector.

## Definition of done

- [ ] Version resolution from the lockfile + documentation selection — *verify: auto*
- [ ] Allow-listed and pinned sources; a source outside the list is refused — *verify: auto*
- [ ] API citation requirement traceable in the review packet — *verify: auto*
- [ ] Docs: wiring a documentation provider (Context7 / vendored) — *verify: human*

## Notes

- Injection alone guarantees nothing — always injection + gate. Ref: ADR-0005 §3.
- Depends on the stack contract (ISS-0107).
