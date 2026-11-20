---
id: ISS-0157
title: Document the team roles and the product loop
type: docs
priority: P2-normal
effort: S
complexity: standard
domain: [method, docs]
skill: documentation
skills_aux: []
status: 5-done
branch: docs/ISS-0157-document-the-team-roles-and-the-product-loop
depends: [ISS-0155]
created: 2026-11-20
updated: 2026-11-20
schema_version: 2
risk: low
assignee: fredericgalline
started_at: 2026-11-20
completed_at: 2026-11-20
commits: [29cc5a9]
---
# ISS-0157 — Document the team roles and the product loop

## Context

Lytos has the pieces of a governed loop (ADR-0004: two human gates, park on ambiguity, an auditor
that is not the implementer) and now the review lines and checklists of ISS-0155, but nothing says
which role does what, what each one reads and writes, what blocks, or when the loop must stop and
call a person. A team assembling the loop re-derives it each time.

## Proposed solution

- `method/rules/team-and-loop.md`, one or two pages: the catalog of eleven roles (framing,
  designer, UX expert, design-system keeper, code-quality lead, developers, end-to-end tester,
  cyber defender, red team, solutioner, release) each with mission, input, output as a structured
  report, right (read-only or write) and blocking criterion; then the loop, the owner's two gates,
  and the five cases where the loop stops.
- Shipped by `init`, upgradeable with confirmation like the other rules, referenced from
  `LYTOS.md` and `rules/README.md`.
- It does not contradict "Lytos replaces personas with procedures": a role is operational (mission,
  input, output, right, blocker), with no voice and no character. Said in the first paragraph.
- Cost study (`cost-review`): one short markdown file, no code, no new moving part. Rejected: one
  file per role (eleven files to keep in step, and a reader who needs the whole picture).

## Ready

- **Scope** — the document, its shipping and its two references.
- **Constraints** — English, generic, at most two pages; every command it names exists; it adds no
  new gate to the kit.
- **Out of scope** — enforcing roles in the CLI (the CLI never calls an AI), a loop runner.

## Definition of done

- [x] `method/rules/team-and-loop.md` names the eleven roles, each with mission, input, output, right and blocking criterion — verify: auto
- [x] It states the loop (owner frames and accepts on a packet of evidence; the owner does not replay what the machine has proved) and the five stop cases — verify: auto
- [x] It is generic (no project, vendor or client name), at most two pages, and names only commands the CLI has — verify: auto:doc-L3
- [x] `lyt init` ships it, `lyt upgrade` can update it, `LYTOS.md` and `rules/README.md` point at it — verify: auto
- [x] `LYTOS.md` reconciles the roles with its own "no personas" line in one sentence: the team roles are operational roles for review and for agents, and the method's three personas remain people — verify: auto
- [x] The team document carries nothing private: no name, machine path, address or credential (generic check; private terms only from the optional local list) — verify: auto
- [x] The role catalog reads as a usable brief for someone assembling a team, not as a list of personas — decided by Frédéric Galliné, 2026-11-20 — verify: human:product-intent
