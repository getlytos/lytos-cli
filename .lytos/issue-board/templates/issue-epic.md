---
id: ISS-XXXX
title: "[The outcome, in product words]"
type: epic
priority: P0-critical | P1-high | P2-normal | P3-low
effort: L | XL
complexity: heavy
skill: ""
status: 0-icebox
branch: "feat/ISS-XXXX-slug-title"
depends: []
created: YYYY-MM-DD
updated: YYYY-MM-DD
schema_version: 2

# === Intent layer (ADR-0009) — optional, backward-compatible ===
# An epic is the intent card of a group of leaves. A leaf points at it with
# `parent: ISS-XXXX`; the epic's children and progress are derived, never written here.
#
# discovery: the intent is still being settled, so the leaves cannot enter the sprint.
# frozen: a human froze it (see the freeze checklist); the leaves can be committed.
phase: discovery
# The milestone this epic belongs to: the name of a file under .lytos/milestones/
# milestone: v1.0

# Blast radius, and it selects the gates (ADR-0007): low | medium | high
risk: medium
---

# ISS-XXXX — [The outcome, in product words]

*An epic is the intent behind several cards. It is closed by its acceptance scenarios going green
AND the owner accepting it on the review packet — not by its leaves being done. Leaves are separate
cards, one loop iteration each. Copy this file to `0-icebox/` or `1-backlog/` and fill it in.*

## Intent

*The outcome in product words: who can do what they could not do before, and why it matters. One
short paragraph. No solution and no technology — that is the leaves' work.*

## Ready

*Definition of Ready (ADR-0007 §3), for the intent. An epic is not loop work: its leaves are.*

- **Scope** — the outcome, in one line.
- **Constraints** — what the whole epic must respect: rules, budget, deadline, data, accessibility.
- **Out of scope** — what this epic explicitly does NOT deliver.
- **Cost class** — the order of magnitude of the build (XS to XL, like `effort`) and of the run cost at 10, 100 and 500 units (rubric `cost-review`).
- **Solution** — the cheapest robust way to the outcome, and why: the study the leaves refine.
- `risk:` set in the frontmatter, and the Definition of done below has at least one machine-verifiable item.

## Thin slice

*The smallest slice that proves the outcome from end to end. The first leaves are cut from it.*

## Feasibility matrix

*One row per element of the intent. Put a mark in exactly one of the three middle columns; for
anything that is not feasible as is, give the cost and an alternative.*

| Element | Feasible as is | Feasible with an adjustment | Not feasible or too costly | Cost | Alternative |
|---|---|---|---|---|---|
| | | | | | |

## Design exchange

*Links to the design artifacts: mock-ups, design-system entries, the register entry
(`design/registry.md`, if the project uses one). At most two rounds of discussion with design; each
point settled becomes one line here, written `Decision: …`.*

- Artifact: [link]
- Decision: [one line]

## Freeze checklist

*A human freezes the epic by setting `phase: frozen`, once every line below holds. Until then the
leaves cannot enter the sprint: `lyt move … 2-sprint`, `lyt start`, `lyt claim`, `lyt unpark` and
`lyt next` refuse or skip them. A `spike` leaf (`type: spike`), which produces the evidence this
checklist needs, is exempt. After the freeze a change is a change request, not an edit.*

- [ ] The intent is written in product words, with no solution in it
- [ ] The thin slice is chosen
- [ ] The feasibility matrix classifies every element, with a cost and an alternative where needed
- [ ] The discussion with design took at most two rounds, and each point ends in a `Decision:` line
- [ ] The links to the design artifacts are in place

## Definition of done (acceptance scenarios)

*One item per scenario, in the form Given … when … then …: each becomes an end-to-end test. Declare
how each item is verified (ADR-0004 §4): `— verify: auto` for what a machine checks, with a pin to
the kit entry that carries it (`auto:e2e`); the owner's acceptance is `— verify: human:product-intent`.
A DoD with at least one `verify: auto` item is loop-eligible.*

- [ ] Scenario 1: given [state], when [gesture], then [observable result] — verify: auto:e2e
- [ ] Scenario 2: given [state], when [gesture], then [observable result] — verify: auto:e2e
- [ ] The owner accepts the outcome on the review packet — verify: human:product-intent

## Leaves

*Not written by hand. Each leaf says `parent: ISS-XXXX` in its frontmatter; `npx lyt show ISS-XXXX`
lists them with their progress, and `npx lyt board` shows the tree.*
