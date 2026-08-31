---
id: ISS-0069
title: "Three checkbox counters, one of them correct — `close` and `show` guard on the wrong number"
type: fix
priority: P1-high
effort: S
complexity: light
domain: [cli, close, lib]
skill: code-structure
skills_aux: [testing]
status: 1-backlog
branch: "fix/ISS-0069-countchecklist-skip-fences"
depends: []
created: 2026-04-22
updated: 2026-08-12
schema_version: 2
risk: medium
---

# ISS-0069 — `--force` has become the normal way to close an issue

## Context

`lyt close` refuses to close an issue with unchecked checklist items. The count it guards on is
wrong, for two independent reasons, and the result is that `--force` is now routine — which means
the guard protects nothing.

**Cause 1 — code fences (observed 2026-04-22).** `countChecklist` scans with
`/^[ \t]*- \[([ xX])\] /gm` and knows nothing about fenced blocks. An issue documenting checklist
syntax inside a fence has its examples counted as real items. ISS-0059 reported `4 unchecked out
of 22` when only 2 were real. Workaround: `--force`.

**Cause 2 — no section scoping (observed 2026-08-12).** The same regex counts *every* checkbox in
the file, including the `### Checks` and `### To fix before next review` lists inside audit blocks.
So **any issue that has been audited requires `--force` to close**, regardless of its DoD. Frédéric
hit this closing ISS-0103, ISS-0113 and ISS-0126: their DoDs were complete, and the historical
audit blocks still held unchecked boxes.

Cause 2 is the worse one, because it is not an edge case — it is every audited issue, which on a
governed board means every issue. The consequence was already written in this fiche in April:
*"the bug pollutes audits and pushes humans toward `--force`, which then masks legitimate gaps."*
Four months on, that is the working practice.

**Same defect, visible on the board.** `show.ts` has its own copy of the naive regex
(`parseChecklist`), so the progress bars share the flaw: ISS-0107 renders `14/19 · 74 %` while its
Definition of Done is **6 items out of 6**. Every audited issue is displayed as less complete than
it is, its real work diluted by audit bookkeeping.

**Three implementations, one correct:**

| function | scope | fences | consumers |
|---|---|---|---|
| `countChecklist` (`issue-ops.ts`) | whole file | no | `close.ts` ×2 |
| `parseChecklist` (`show.ts`) | whole file | no | the progress bar |
| **`analyzeDod` (`dod.ts`)** | **the `## Definition of done` section** | **yes** | `next`, `report`, `linter`, `ready` |

`analyzeDod` already solves both causes and is covered by tests — including one named for this very
issue, *"ignores checklist items inside fenced code blocks (ISS-0069)"*. And `show.ts` **already
imports it** (line 12) for another purpose while computing its progress bar with its own copy.

## Ready

- **Scope** — make `close` and `show` count DoD items through `analyzeDod`, and delete the two
  naive counters.
- **Constraints** — `--force` keeps working and keeps meaning "close despite unchecked DoD items".
  No issue file changes: this is a reading bug, no stored data is wrong.
- **Out of scope** — indented (4-space) code blocks and HTML `<code>`; fenced covers the real
  cases. Changing what `analyzeDod` itself counts. The `verify:` taxonomy (ISS-0127).
- `risk: medium` — it loosens a gate on the human's close path. Loosening the wrong way would let
  a genuinely incomplete issue close silently, which is worse than today's noise.

## The gesture

Not the April plan (add fence handling to `countChecklist`) — the correct implementation already
exists, tested, in the same codebase:

1. `close.ts` counts through `analyzeDod` instead of `countChecklist` (both call sites).
2. `show.ts` drops `parseChecklist` and uses the `analyzeDod` it already imports.
3. **Delete `countChecklist` and `parseChecklist`.** With their only callers converted, keeping
   them leaves two naive counters for the next caller to pick up by accident.

## The decision this needs first

**Should an unchecked *audit* item block a close?**

Today it does, by accident. The proposal above makes it not, by design. The argument for that:
an audit's `### Checks` list belongs to the **auditor**, not the implementer — an implementer
cannot honestly tick "Rules respected" on their own work, and the audit already has a dedicated
gate, the `review:` verdict. Making the checkbox count a second, weaker gate on the same thing is
what produced the `--force` habit.

If the answer is instead "yes, they should block", the fix is different: keep counting them but
report the two families separately, so a human sees *"DoD 6/6, audit 8/13"* and can tell which one
is stopping them.

**This is the fork, and it belongs to the accountable human.** The recommendation above is the
first branch.

## Definition of done

- [ ] `close` guards on DoD items only — an audited issue with a complete DoD closes without `--force` — verify: auto
- [ ] `--force` still closes an issue with genuinely unchecked DoD items — verify: auto
- [ ] Checkboxes inside fenced blocks are not counted, at either call site — verify: auto
- [ ] `show` renders DoD progress: ISS-0107 reads 6/6, not 14/19 — verify: auto
- [ ] `countChecklist` and `parseChecklist` are deleted, with no remaining callers — verify: auto
- [ ] Tests: audited issue with complete DoD, issue with a real gap, fenced examples, an issue with no DoD section — verify: auto
- [ ] Close one real audited issue on this board without `--force` — verify: human

## Notes

- Field origin, second round: Frédéric, 2026-08-12, closing ISS-0103 / ISS-0113 / ISS-0126 with
  `--force` because the historical audit blocks held unchecked boxes while the DoDs were complete.
  The April case (ISS-0059, fenced examples) is the same defect through the other door.
- **Fourth case in one session** of a checker reading the wrong scope: `verify: auto:<id>` unparsed
  (ISS-0107), out-of-scope matched anywhere in the fiche (ISS-0115), the journal's "why" cut at the
  line wrap (ISS-0124), and this one. Worth noticing as a pattern rather than four coincidences —
  the recurring shape is a regex over a whole document where a section was meant.
- The stale note from April said `show.ts:180` shared the regex. The file has moved since; the
  duplicate is `parseChecklist` at `show.ts:190`. The observation held.
