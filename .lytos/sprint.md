# Sprint #06 — The derived reading surfaces (the human gate)

> **Objective**: Give the human what they need to *govern* what the loop produces. Three views **derived** from the issues, all of the same family (they read the frontmatter and assemble a narrative): the per-issue **review packet** (ISS-0103), the aggregated **sprint report** (ISS-0105), and the project **logbook** (ISS-0124). The foundation (#04 the rail + #05 standards) produces the material; this sprint makes it readable and governable.
> **Start**: 2026-08-09
> **Target end**: 2026-08-20

---

## Why this sprint

The loop can select, park, gate and stop — but the human at the gate can only govern what they
*see*. These three surfaces are the autopilot→pilot interface.

- **ISS-0103** (review packet) is the core: diff + gate evidence + parks + human checklist + verdict + audit, in a **doubt-first** layout (green relegated to the end). It consumes everything built so far (DoD `verify:`, `park`, `gates`).
- **ISS-0105** (sprint report) aggregates the packets: done/parked, budget, coverage — the overview.
- **ISS-0124** (`lyt journal`) is the narrative of the *why*, derived and chronological — three readers (stakeholder, onboarding, learner).

They share a common base (reading frontmatter + assembling) — hence the grouping.

---

## Tasks

| Issue | Title | Effort | Depends | Status |
|-------|-------|--------|---------|--------|
| ISS-0103 | `lyt report ISS-X` — review packet (doubt-first) | L | ISS-0100, ISS-0101 | 4-review ✅ |
| ISS-0105 | `lyt report --sprint` — packet aggregate | M | ISS-0103 | 4-review ✅ |
| ISS-0124 | `lyt journal` — derived logbook | M | — | 4-review ✅ |

> **State as of 2026-08-09**: the 3 derived views are delivered (code + tests), 313 tests green, in `4-review`. `lyt report ISS-X` (doubt-first packet), `lyt report --sprint` (aggregate), `lyt journal` (the narrative of the why) — all dogfooded on this repo.

## Suggested order

1. **ISS-0103** first — the core; 0105 depends on it, and it lays the shared reading base.
2. **ISS-0105** after 0103 — aggregates the packets.
3. **ISS-0124** in parallel — independent.

## Dependency graph

```
ISS-0103 (review packet) ── ISS-0105 (sprint report)
ISS-0124 (journal) ── independent
```

---

## Out of scope / notes

- **ISS-0116** (documentation levels L0–L4) follows immediately after #06 — P2, depends on the kit.
- The **review packet (ISS-0103)** and the **checklist/sign-off (ISS-0104)** slipped to **#06**: standards were prioritised, as requested.
- **ISS-0067** is still sitting in `2-sprint` (a #03 leftover) — not attached to #05. To close or push back to the backlog.
- **Sprint #04**: its 4 issues are in `4-review`, awaiting `lyt close`. They finish their review during #05.
- ADR-0005 / ADR-0007 are `Proposed` — promotion to `Accepted` by the human is an accepted prerequisite.

---

## Roadmap towards the goal (multi-sprint)

- **#04 — The rail** ✅ *(delivered, in review)*: decidable primitives — ISS-0099, 0100, 0101, 0102.
- **#05 — Standards & proportionality** *(this sprint)*: quality kit (0107) + risk→gate matrix (0114) + Definition of Ready (0115).
- **#06 — The human gate & closing**: review packet (0103), checklist/sign-off (0104), documentation levels (0116), ground-truth injection (0108), DS conformance (0109), sprint report (0105), `lytos-method` propagation (0106), closing the ISS-0098 epic.

> **ADR-0007** refines ADR-0005: rigor follows risk. The forgotten dimensions (observability, security, perf, compatibility, reproducibility) are **folded into the quality kit (ISS-0107)** as checkers selected by the matrix — not 8 more issues.

### Track — The human capability contract (ADR-0008)

Came out of a red-team/blue-team exercise (two adversarial panels): the *human* side of
"human-governed" was assumed, never tooled. Attack and defence converged on the same additions —
three faces, all risk-tiered:

- **Comprehension**: **ISS-0117** — explain-back from memory before `close` (`verify: human-comprehension`).
- **Competence**: **ISS-0118** — judgment-exposure metric (the debt on the balance sheet); **ISS-0119** — `learning` mode (invert the routing) + rotation + reviewer trap diffs.
- **Operability**: **ISS-0120** — executable L4 runbook + observability (risk: high); **ISS-0121** — loop-C (prod→issue) + MTTR.

Cross-cutting answer-issues (refining earlier ADRs): **ISS-0122** — measured decorrelation +
non-LLM judges + downstream nets (ADR-0004 §5/0005/0007); **ISS-0123** — log the rejected
reasoning (ADR-0006). ADR-0008 records its **falsifiability conditions** (cohort C≥A, MTTR A/B,
kill-rate) — the method commits to being refutable.

**Transmission (the competence face, in readable form)**: **ISS-0124** — `lyt journal`, the
derived logbook (a changelog of the *why* + a clickable summary + a companionship notebook),
rendered in the App. **ISS-0125** *(icebox)* — elearning mode: the interactive tutor laid on top
of the logbook, with `dev_level` set at init.

### Parallel track — Multi-surface & multi-user continuity (ADR-0006)

Largely built already — `claim`/`unclaim` (ISS-0041/0042), `pull-notes` (ISS-0096), union-merge
(ISS-0093), `board --remote` (ISS-0043), surface compatibility (ISS-0040). ADR-0006 leaves only
**three holes**, insertable into any sprint (independent of the loop):

- **ISS-0110** — `lyt checkpoint` (the net: WIP commit + push when switching surfaces).
- **ISS-0112** — WIP handoff note convention (the portable context is the issue, not the chat).
- **ISS-0111** — `lyt resume` ("where was I" across repos/surfaces) — depends on ISS-0112.

On the surface-handoff UX side (VSCode, App "continue where you left off"): direction 2, repo
`lytos-app`.

---

## Previous sprints

### Sprint #05 — Standards & proportionality (2026-08-09) ✅ Delivered (in review)
ISS-0107 (dogfooded quality kit), ISS-0114 (`lyt gates`, risk→gate matrix), ISS-0115 (Definition of Ready via `lyt next`/`lyt lint`). 303 tests green, in `4-review`.

### Sprint #04 — Laying the rail (2026-08-09) ✅ Delivered (in review)
ISS-0099 (`lyt next`), ISS-0100 (`parked` + `lyt park`), ISS-0101 (DoD `verify:`), ISS-0102 (`lyt budget`). Code + tests (282 green), in `4-review` awaiting `close`.

### Sprint #03 — Closing out schema v2 (2026-06-13 → 2026-06-20) ⚠️ Partial
ISS-0076 (AI wrapper) and ISS-0077 (migrate-frontmatter) delivered. ISS-0067 (propagation to `lytos-method`) remains open → carried over.

### Sprint #02 — Rename socle → lytos (2026-04-14 → 2026-04-20) ✅
ISS-0011 → ISS-0015: renaming every "socle" reference to "lytos" across the method / CLI / website repos, npm publication, domain configuration.

### Sprint #01 — CLI MVP (2026-04-13 → 2026-04-13) ✅
ISS-0001 → ISS-0007: setup, init, board, tests, CI, npm publish.
