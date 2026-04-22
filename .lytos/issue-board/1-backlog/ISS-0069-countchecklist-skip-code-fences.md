---
id: ISS-0069
title: "countChecklist: skip checkboxes inside fenced code blocks"
type: fix
priority: P2-normal
effort: S
complexity: light
domain: [cli, close, lib]
skill: code-structure
skills_aux: [testing]
status: 1-backlog
branch: "fix/ISS-0069-countchecklist-skip-fences"
depends: []
created: 2026-04-22
updated: 2026-04-22
---

# ISS-0069 — `countChecklist`: skip checkboxes inside fenced code blocks

## Context

`lyt close ISS-XXXX` warns about unchecked checklist items based on a regex scan over the issue's markdown:

```ts
// src/lib/issue-ops.ts:298
export function countChecklist(content: string): { done: number; total: number } {
  const pattern = /^[ \t]*- \[([ xX])\] /gm;
  ...
}
```

The regex doesn't know about markdown code fences (` ``` `). As soon as an issue contains an example checkbox inside a code block — e.g. an audit-block format spec, or any docstring of a checklist syntax — those examples get counted as real DoD items.

Concrete case observed on 2026-04-22: ISS-0059 has an example `### To fix` block inside its markdown code fence (the audit-format spec). Two `[ ]` examples in that fence get counted as real unchecked items, so `lyt close ISS-0059` reports `4 unchecked out of 22` when only 2 are real (cold-run with vendors, coverage). Workaround was `--force`.

Every future issue that documents checklist syntax in a code block will hit the same false positive. The bug pollutes audits and pushes humans toward `--force`, which then masks legitimate gaps.

## Proposed solution

Make `countChecklist` skip the contents of fenced code blocks. Single-line approach:

1. Strip fenced regions before scanning. A simple state machine over lines:
   - Toggle `insideFence` when the line matches `^[ \t]*` ` ``` ` (with or without a language tag).
   - Skip lines while `insideFence` is true.
2. Apply the existing checkbox regex to the remaining lines.

Indented code blocks (4-space indent) are out of scope — markdown allows them but they're rarely used in this project, and the existing regex's `^[ \t]*` already permits indented checkboxes (which is correct for nested DoD lists). Touching indented blocks would risk over-stripping.

## Definition of done

- [ ] `countChecklist` returns `{done, total}` that ignores any `- [ ]` or `- [x]` line found between matching fence markers
- [ ] Real checklist items above and below the fence are still counted
- [ ] Multiple fences in the same file are handled (open/close cycles)
- [ ] Unmatched / unclosed fences fail safe — either count nothing inside (preferred) or count everything inside (acceptable), but not throw
- [ ] New unit tests in `tests/lib/issue-ops.test.ts` cover:
  - checkbox above + inside + below fence → only above and below counted
  - two fences with checkboxes between them → only between counted
  - language-tagged fence (` ```markdown `, ` ```ts `) treated the same as bare fence
  - issue with no fences → behavior unchanged
- [ ] `lyt close ISS-0059` (or any issue with example checkboxes in a fence) reports the correct unchecked count

## Relevant files

- `src/lib/issue-ops.ts:298-310` — `countChecklist` implementation
- `tests/lib/issue-ops.test.ts` — extend with fence cases (or create the file if it doesn't exist)
- Indirect verification: `src/commands/close.ts` consumes `countChecklist` — no change needed there

## Notes

- Same regex powers any other place that counts checklist items (e.g. `src/lib/show.ts:180`). Audit those callers and apply the same fence-skipping helper or share a new `countChecklistInProse(content)` utility.
- This is a quality bug, not a data bug — no historical issue file is wrong. Once fixed, every issue that previously needed `--force` because of in-fence examples will close cleanly.
- Out of scope: indented code blocks, HTML-style `<code>` blocks, frontmatter quirks. Fenced is 99% of the real-world case.
