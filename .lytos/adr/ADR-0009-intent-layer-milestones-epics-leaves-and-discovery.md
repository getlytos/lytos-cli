# ADR-0009 — The intent layer: milestones, epics, leaves and the discovery phase

Date: 2026-11-20

Status: Accepted (decided by the owner, 2026-11-20)

---

## Context

Lytos governs the loop well once a card exists: a Definition of Done a machine can check, gates that scale with risk, an independent review, a human gate at the entry (the sprint) and at the exit (close). What it does not model is where a card *comes from*. Today a card starts from a task; the intent behind several cards, and the version they belong to, are implied by `depends` links only (the board shows children after a parent, derived from `depends`). There is no `parent`, no `epic`, no `milestone`.

Two practical problems follow. First, intent has no home: the outcome in product words, the acceptance scenarios, the design exploration and the feasibility check end up scattered in chats. Second, work is committed to a sprint before its intent is settled, and the loop builds on a moving target, which is the most expensive way to find an inconsistency.

## Decision

### 1. Three levels, never more

| Level | What it is | Closed by |
|---|---|---|
| **Milestone** | A product-level goal with exit criteria (a version). May span several sprints; a sprint may serve several milestones. | The owner's acceptance. Corresponds to a tag and a deployment. |
| **Epic** (intent card) | The outcome in product words, acceptance scenarios (which become end-to-end tests), constraints, out of scope, cost class, links to design artifacts, risk. | Its scenarios green AND the owner's acceptance on the review packet (`human:product-intent`). Not the sum of its children. |
| **Leaf** | A card the size of one loop iteration, with a machine-verifiable Definition of Done. | The usual gates. |

There are no grandchildren. A leaf that is too big is split into siblings under the same epic. A leaf that genuinely groups three or more cards becomes an epic itself.

### 2. Optional fields, schema v2 unchanged

`parent: ISS-XXXX` (on a leaf, pointing at an epic), `milestone: <id>` (on an epic or a leaf), `phase: discovery | frozen` (on an epic), and `type: epic`. A surface that ignores them still sees valid flat cards. Children, progress and the tree are DERIVED from the `parent` fields of the leaves, never written by hand (ADR-0002). `lyt lint` enforces: `parent` points at an existing epic, depth at most two, `phase` only on an epic, `milestone` names an existing file under `.lytos/milestones/`.

### 3. The discovery phase gates the sprint

While an epic is in `phase: discovery`, its leaves cannot enter the sprint (the 1-backlog to 2-sprint move, and `lyt next` excludes them). Two exemptions: a leaf marked `spike` (a feasibility study or a measurement, which produces the evidence the epic needs), and an explicit human override with a recorded reason. A card with no parent epic (a fix, a chore) is not concerned. Creating and refining leaves during discovery stays free, with a warning. The move to `frozen` is a human gate. To freeze, an epic carries: the intent in product words, the chosen thin slice, a feasibility matrix (per element: feasible as is, feasible with an adjustment, not feasible or too costly, each with cost and alternative), at most two rounds of discussion with design, and the links to the design artifacts. A change after the freeze is a change request, not an edit.

### 4. Where the design exchange lives

Everything is in the repository (ADR-0006: the portable context is the card, the board and the memory, never the chat). A design exchange entry is a small file under `.lytos/design/exchanges/<epic>/NNN-<slug>.md` with frontmatter (id, epic, milestone, from, type, status) and a short body. A derived index lists the open entries only. An agent reads the card, then the index, then the entries it needs, never the whole log. A resolved entry is distilled into one "Decision" line in the epic.

## Alternatives rejected

- **A deep tree** (epic, story, task, sub-task): high maintenance, rots by hand, and a loop wants small independent cards.
- **Flat cards with labels**: cheap, but the intent is not traceable.
- **A new `discovery` status**: touches the schema, the board, the App and every test; a field on the epic is enough and surfaces that do not know it stay valid.

## Consequences

`lyt lint`, `lyt board`, `lyt show`, `lyt start`, `lyt move` and `lyt next` learn the three fields. A `milestone` command reads `.lytos/milestones/<id>.md`. Existing projects change nothing until they adopt a field. This refines ADR-0004 §1 (the sprint stays the loop perimeter) and ADR-0007 (Ready): a frozen epic is the Ready gate of the intent.

## Non-goals

No new card status. No hand-written child lists or progress figures. No cross-repository epics in this version.
