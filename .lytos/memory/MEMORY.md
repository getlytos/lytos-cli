# Memory — lytos-cli

*This file is the project memory's table of contents. Load only what is relevant to the current
task.*

> **Last updated**: 2026-09-02
> **Number of entries**: 4

---

## Section index

| File | Content | Load when... |
|------|---------|--------------|
| [architecture.md](./cortex/architecture.md) | Stack decisions, the ADR map, the helpers a new checker must reuse, how the release path works | Any structural task, or the first session on this repo |
| [patterns.md](./cortex/patterns.md) | The patterns that hold here — executable rules, the flagging asymmetry, proportionality as a threshold, verify-by-parsing | Code review, refactoring, writing a new command |
| [bugs.md](./cortex/bugs.md) | What keeps coming back: checkers reading prose as data, `verify:`/`branch:` rot, npm's misleading 404, suite flakiness | Debugging, or before writing a checker over fiche text |
| [sprints.md](./cortex/sprints.md) | Sprint history and what each audit round actually taught | Planning, retrospective, estimating |

---

## Living summary

CLI for the Lytos method, published on npm as `lytos-cli` — **1.5.1** is `latest`, and the first
release this project ever published from CI with a provenance attestation.

The CLI now carries the governed loop (ADR-0004): `next`, `park`/`unpark`, `budget`, `gates`,
`report`, `journal`, alongside the original `init`, `board`, `lint`, `doctor`, `show`, `start`,
`move`, `close`, `review`, `claim`, `absorb`, `migrate-frontmatter`, `pull-notes`, `upgrade`. The
quality kit (`.lytos/quality/`) binds rules to checkers and the risk matrix selects which are
mandatory. ~393 tests; `lyt doctor` is the project's own health gate.

Sprint #06 delivered its three derived reading surfaces, and the audit round of 2026-08-31 sent
four foundation issues back — not for bugs, but for **promises the code displayed and did not
keep**. All four were answered; six issues sit in `4-review` awaiting the cross-model audit and the
human close.

**The habit this project is built on**: nothing counts because it is written. It counts because
something executes it, and because someone re-read the artifact it produced.

---

*The folder is the structure. The file is the content. This table of contents is the map.*
