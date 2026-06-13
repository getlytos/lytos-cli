# Issue board

This folder is the Lytos issue board. Each issue lives in a markdown file whose
**YAML frontmatter is the source of truth** for its status, priority, effort and
dependencies. The folder an issue sits in mirrors its status:

| Folder | Meaning |
|--------|---------|
| `0-icebox/` | Ideas, not yet prioritized |
| `1-backlog/` | Prioritized, ready to pick up |
| `2-sprint/` | Committed to the current sprint |
| `3-in-progress/` | In development |
| `4-review/` | In review / test |
| `5-done/` | Recently completed |
| `archive/` | Older completed issues (indexed in `archive/INDEX.md`) |

## Where is BOARD.md?

`BOARD.md` is a **derived artifact** — a flat index regenerated from the issue
frontmatter. It is intentionally **not tracked in git** (it caused recurring
merge conflicts on multi-change PRs). See
[`../adr/ADR-0002-board-md-derived-artifact.md`](../adr/ADR-0002-board-md-derived-artifact.md).

To see the board:

```bash
lyt board        # regenerate and display the board locally
lyt board --check  # CI-friendly: exit 1 if the local board is stale
```

…or open the project in the Lytos App, which renders the board live from the
frontmatter.
