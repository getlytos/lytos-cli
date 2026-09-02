# Memory — Sprint History

*History of past sprints with key learnings. Load this file at sprint start, during retrospective,
or during planning.*

---

| Sprint | Objective | Result | Key learning |
|--------|-----------|--------|--------------|
| #01 | CLI MVP — init, board, tests, CI, npm | Delivered | — |
| #02 | Rename socle → lytos across method, CLI, website | Delivered | — |
| #03 | Close out frontmatter schema v2 | Partial | ISS-0067 (propagation to `lytos-method`) carried over, and sat in `2-sprint` for four months blocking `lyt next` |
| #04 | Laying the rail — `next`, `park`, DoD `verify:`, `budget` | Delivered, in review | Decidable primitives first; the loop cannot choose or stop without them |
| #05 | Standards & proportionality — quality kit, risk→gate matrix, Definition of Ready | Delivered, then returned NO_GO | Shipping the mechanism is not shipping the promise: the stack contract was parsed and never consulted, `lyt gates` never compared anything to a DoD, Ready never checked scope or constraints |
| #06 | The human gate — review packet, sprint report, derived journal | Delivered, then returned NO_GO | Same shape: the journal's grouping, its README and its fiche each described a different behaviour |

## What the audit round of 2026-08-31 actually found

Four NO_GO verdicts, and **not one was a classic bug**. All four were promises the code displayed
and did not keep — a contract parsed then ignored, a "flags the missing ones" with no
implementation, documented Ready criteria never checked, three artifacts disagreeing about the
same behaviour. The lesson for planning: *delivered* means the promise is executable, not that the
mechanism exists.

Two more findings came from the same round and are worth remembering when estimating:

- **Five fiches out of five were returned for a metadata field**, not for their work. Four of them
  cost a full cross-model audit round each to discover a stale string. Cheap defects can be the
  most expensive to find.
- **The human gate became the bottleneck**: 81 `auto` items against 34 `human`, of which about
  seventeen were assertions a `grep` could settle. Writing them as tests halved the review queue.
  Tracked as ISS-0127, with ADR-0004 §4 revised in place.

## The release path (2026-08-31 → 09-01)

`lytos-cli` had **no working automated publish from 2026-04-20 to 2026-09-01**: a granular npm
token created on 04-13 expired six days later, and seven consecutive release runs failed with a
misleading 404 while versions 1.0.0 → 1.4.0 went out by hand — which kept the outcome looking
right. Fixed by adopting trusted publishing (OIDC), proven by 1.5.1, the first artifact of this
package carrying a provenance attestation.

**Planning takeaway**: a red pipeline nobody reads costs more than a red pipeline that blocks. The
gap was found only because someone asked "what is next before a release?".
