# Design exchanges

*What the design tool and the code say to each other about an epic, one small file per turn. Read it
before you write or resolve an entry. Entries hold card references, numbers and links: no customer
data, no secret.*

## Where and how

One file per entry, in the folder of its epic:

```
.lytos/design/exchanges/<epic>/NNN-<slug>.md
```

`<epic>` is the id of the epic card (`ISS-0163`), `NNN` counts the entries of that epic from `001`, and
`<slug>` is a few lowercase words joined by hyphens. A new turn is a new entry: the only edit an old
entry takes is its `status`.

## Format

```markdown
---
id: ISS-0163/001
epic: ISS-0163
milestone: v1.7
from: design
type: gap
status: open
refs: [ISS-0170]
---

The mock-up shows an empty state for the list, but the data never returns an empty list: the first row
is always the account itself. Which one is right?
```

| Field | Value |
|---|---|
| `id` | `<epic>/NNN`: the folder and the number of the file |
| `epic` | The epic card, the same as the folder |
| `milestone` | Optional: the milestone of the epic |
| `from` | Who wrote it: `design` (the design side) or `code` (the code side) |
| `type` | `gap` (the mock-up and the product's data or rules disagree), `prompt` (a ready-to-paste request to the other side), `response` (the answer to a gap or a prompt), `decision` (a choice both sides accept, with its reason) |
| `status` | `open` until it is answered, then `resolved` |
| `refs` | Optional list of the cards and entries it points to: `[ISS-0170, ISS-0163/002]` |

The body is at most 150 words: one subject, said plainly. A longer body is two subjects: split it and
link the other with `refs`.

## Rules

1. **Resolve by status, never by deleting.** When a gap is answered, set `status: resolved` on it. It
   leaves the index and stays in the folder as history. Distill it into one "Decision" line in the epic.
2. **Read selectively.** Read the card, then the index, then only the entries you need. Never read the
   whole folder.
3. **The index is derived.** `npx lyt exchanges` lists the open entries, one line each, from the files
   themselves (`--json` for a machine). No index file exists: do not write one by hand and do not
   commit one, it would only go stale.
4. **A malformed entry is reported, never dropped.** The command names the file and the fault and exits
   with 1, so a typo in `status` cannot hide an open gap.
5. **Nothing leaves the repository.** The command reads files only: no network, no design tool.
