---
id: ISS-0159
title: lyt upgrade delivers the new quality library and never touches a linked kit
type: feat
priority: P1-high
effort: S
complexity: standard
domain: [cli, upgrade]
skill: ""
skills_aux: []
status: 4-review
branch: "feat/ISS-0159-lyt-upgrade-delivers-the-new-quality-library-and-never-touches-a-linked-kit"
depends: [ISS-0155, ISS-0157]
created: 2026-11-20
updated: 2026-11-20
schema_version: 2
risk: high
assignee: fredericgalline
started_at: 2026-11-20
---
# ISS-0159 — lyt upgrade delivers the new quality library and never touches a linked kit

## Context

A project's `quality/kit.md` is linked to its stack: the `tool` column holds its real commands,
rows are added (a rights gate, an end-to-end suite) and removed (no UI, no perf budget). Losing
that to an upgrade would silently loosen or detach every gate the project runs, and it would not
show: a kit overwritten with the shipped placeholders still parses, still resolves pins, and now
binds `tests-unit` to `<your test command>`.

`lyt upgrade` has never listed `quality/kit.md` or `stack.md`, so today it cannot overwrite them —
but nothing says it must not, and the new library (rubrics, checklists) has to reach existing
projects without the same risk: a rubric a project adapted to its own architecture is project
content too.

## Proposed solution

- Prove the guarantee instead of assuming it: a test on a temporary project whose kit is linked
  (filled `tool` cells, a row removed, a row added) and whose `stack.md` is filled, run through
  `upgrade --force` — both stay byte-identical.
- The library files (`quality/rubrics/*`, `quality/checklists/*`) are **add-only**: a missing one is
  added, one that exists is never rewritten, even by `--force` — so a project's adapted rubric
  survives. Same list as `init` (`method-files.ts`).
- `rules/team-and-loop.md` is upgradeable like `rules/default-rules.md` (prompt before replacing).
- Since the kit is not touched, say what the bundled kit has that the project's lacks: one line
  listing the missing gate ids and the rows to copy. Informational; nothing written.
- `design/registry.md`, `config.yml`, `manifest.md`, memory and the board stay out of reach, as
  before.
- Cost study (`cost-review`): add-only is the cheapest option that passes the floor (visible: each
  added file is printed; idempotent: a second run adds nothing; reversible: delete the file;
  isolated: per file). Rejected: a three-way merge of kit rows (a new mechanism that can corrupt
  the one file whose whole value is being exactly what the project wrote) and a `--force`-aware
  overwrite of rubrics (the destructive path).

## Ready

- **Scope** — `lyt upgrade`: the add-only library, `team-and-loop.md`, the kit hint, and the tests
  that pin what is never overwritten.
- **Constraints** — a kit, a stack contract, a register, a config or a modified rubric is never
  written, with or without `--force`; zero new dependency; existing upgrade behaviour for the other
  files is unchanged.
- **Out of scope** — merging new rows into a kit, a doctor check that kit pointers resolve,
  upgrading `quality/stack.md`.

## Definition of done

- [x] A kit linked to a stack — filled `tool` cells, a row removed, a row added — and a filled `stack.md` are byte-identical after `upgrade --force` and after `upgrade` — verify: auto:tests-negative
- [x] Missing rubrics and checklists are added (printed as new, written, equal to the bundled files); `--dry-run` lists them and writes nothing; a second run adds nothing — verify: auto
- [x] A rubric or checklist the project modified is left alone even by `--force`, and the run says so — verify: auto
- [x] `lyt upgrade` names the bundled kit gates the project's kit lacks, writes nothing, and stays silent when the kit has them all — verify: auto
- [x] `design/registry.md`, `config.yml`, `manifest.md` and `memory/` are untouched by `upgrade --force`; `rules/team-and-loop.md` is upgradeable — verify: auto
- [x] An end-to-end run of the compiled binary on a linked project, in a directory outside the repository, leaves every gate binding as it was — verify: auto
- [x] With no terminal (`lyt upgrade < /dev/null`, or CI), the library is delivered BEFORE any replacement question, each question is answered "no" out loud with the way to force it, the recap is printed, and the exit code is 0 — verify: auto:tests-negative
- [x] Nothing is written through a symbolic link (dangling, a linked directory, or a link standing in for a method file): it is skipped with a message and nothing is created outside `.lytos/` — verify: auto:tests-negative
- [x] The hint names the bundled kit at the tag of the installed version, not at `main` — verify: auto
- [ ] The write paths of `upgrade` are exactly: a missing method file, and a confirmed or forced upgradeable one — no new mechanism can reach a project-owned file — verify: reviewer:architecture-review
- [ ] The change stays proportionate: a list, a guard and one informational line — verify: reviewer:over-engineering
- [ ] Telling the project which kit rows it lacks, rather than merging them in, is the behaviour the owner wants — verify: human:product-intent
