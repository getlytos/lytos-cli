---
id: ISS-0075
title: "Scaffold `adr/` in `lyt init` with an INDEX.md and a template"
type: feat
priority: P2-normal
effort: S
complexity: standard
domain: [scaffold, method, audit]
skill: ""
skills_aux: []
status: 1-backlog
branch: "feat/ISS-0075-adr-scaffold-and-index"
depends: []
created: 2026-05-25
updated: 2026-05-25
schema_version: 2
---

# ISS-0075 — Scaffold `adr/` in `lyt init` with an INDEX.md and a template

## Context

The `.lytos/adr/` folder has become a first-class artifact of the method (cf. [`ADR-0001`](../../adr/ADR-0001-frontmatter-schema-v2.md) — frontmatter schema v2). Yet `lyt init` creates no trace of it: someone adopting Lytos today gets neither the folder, nor a template, nor an index, and has to reinvent the convention. That is a drift between the method as practised and the method as scaffolded.

On top of that sits a context-loading problem: with no index, an agent must either read everything every session (expensive, drowned in noise) or ignore the ADRs entirely (losing the memory of past decisions). The `memory/MEMORY.md` pattern that indexes `cortex/*` already exists — apply it to ADRs.

## Proposed solution

Add three files to the `method/adr/` scaffold:

- **`README.md`** — one page: "what an ADR is, when to write one, how to index it". Short, opinionated.
- **`ADR-template.md`** — the standard structure: Context / Decision / Backward compatibility / Consequences / Status. Aligned with the existing `ADR-0001`.
- **`INDEX.md`** — a `Code | Title | Status | When to load` table. Loaded systematically by agents at startup. An individual ADR is read only when its scope matches the current task.

Update `method/skills/session-start.md` to state: "read `adr/INDEX.md` at startup; load an individual ADR only when its `When to load` matches the task".

## Definition of done

- [ ] `method/adr/` exists with `README.md` + `ADR-template.md` + `INDEX.md`
- [ ] `lyt init` creates `.lytos/adr/` with those 3 files
- [ ] Integration test `tests/commands/init.test.ts` asserts the 3 files exist post-init
- [ ] `method/skills/session-start.md` documents the "read the INDEX, load ADRs on demand" rule
- [ ] `lyt lint` emits no error when `adr/` is absent (backward compatible — v1 projects are not broken)
- [ ] Documentation updated in `method/` (reference to the ADR convention)

## Checklist

### Scaffold (method/)
- [ ] Create `method/adr/README.md`
- [ ] Create `method/adr/ADR-template.md`
- [ ] Create `method/adr/INDEX.md` (empty table + header)

### CLI (init logic)
- [ ] Check `src/lib/scaffold.ts`: the new files must be copied by `lyt init`
- [ ] Extend `tests/commands/init.test.ts`: assert they exist post-init

### Session-start skill
- [ ] Add an "ADRs: index mandatory, selective reading" subsection to `method/skills/session-start.md`

### Linter — backward compatibility
- [ ] Verify `lyt lint` stays silent when `adr/` is absent (no soft warning for v1 projects)

## Relevant files

- `method/adr/` (new)
- `src/lib/scaffold.ts` (init copy logic)
- `tests/commands/init.test.ts`
- `method/skills/session-start.md`

## Notes

- **Pattern consistency**: same principle as `memory/MEMORY.md` indexing `cortex/*` — the agent always reads the index, the content on demand.
- **Backward compatibility**: existing projects without `adr/` must not break. This is purely additive.
- **Out of scope**: a `lyt adr new <slug>` command that creates an ADR and updates the index automatically. Worth a future issue if manual index discipline proves insufficient (signal: ADRs appearing with no index entry).
- **Cross-repo**: `lytos-app` does not need to move. `.lytos/adr/` is consumed by agents (Claude Code, Cursor, …), not by the App, which only projects the board.
