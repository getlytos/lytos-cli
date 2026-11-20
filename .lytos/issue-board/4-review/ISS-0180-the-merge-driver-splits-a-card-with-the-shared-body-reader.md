---
id: ISS-0180
title: "The merge driver splits a card with the shared body reader"
type: fix
priority: P1-high
effort: XS
complexity: light
skill: ""
skills_aux: []
status: 4-review
branch: "fix/ISS-0180-merge-driver-body-split"
depends: []
related: [ISS-0093, ISS-0175]
created: 2026-11-20
schema_version: 2
risk: medium
---

# ISS-0180 — The merge driver splits a card with the shared body reader

## Context

Finding N1 of the second independent review of 1.7. ISS-0175 gave every writer of a card one reader, `bodyOf`, built on the parser's own closing line. The git merge driver (`lyt _merge-issue`, installed by `lyt init`) was missed: it kept its own copy of the cutting expression, looser than the one ISS-0175 removed, which closed the frontmatter at the first `---` before a line end, wherever it was. A card whose title contains `---`, merged from two branches, exited 0 and left part of its frontmatter in the body; when both sides changed the frontmatter it reported a conflict that was not there. It reproduces on 1.6.0 and on 1.7.0, so it is not a regression.

The sweep of `src/` for any other private copy found two more, both anchored but each with its own rules: `exchanges.ts` (a closing line followed by words was not a closing line, so frontmatter words counted as body) and `migrate.ts` (an opening line with spaces after the dashes, which the parser reads, was silently not migrated).

## Proposed solution

The merge driver, the exchanges reader and the migration use the helpers of `frontmatter.ts`: `bodyOf`, and a new `splitFrontmatter` (head and rest around the closing fence) for the one writer that must put fields in front of it. A guard test fails if another module declares an expression that starts at the opening fence.

Solution study: one line. Kept the single shared reader: the simplest option that closes the whole family, and it removes code instead of adding a fifth variant.

## Ready

- **Scope** — `merge-issue.ts`, `exchanges.ts`, `migrate.ts` and the guard.
- **Out of scope** — the raw NUL bytes of `merge-issue.ts` (ISS-0138): git still shows that file as binary, review it with `git diff --text`.
- **Solution** — one shared reader, a guard against private copies.
- `risk: medium`.

## Definition of done

- [x] A card whose title contains `---`, or ends in it, merged by the driver from two branches in a real git repository, comes out with the frontmatter and the body byte-correct, and no conflict that is not real — verify: auto
- [x] A card whose body has a `---` line, a Windows-line-ending card, a card with no trailing newline, a card with no body and a file added on both branches are merged without corruption (unit and real git) — verify: auto
- [x] A genuine conflict on the same field is still left for the human, with the title intact — verify: auto
- [x] `exchanges` and `migrate` close the frontmatter where the parser does, and no module other than `frontmatter.ts` declares an expression starting at the opening fence (static guard) — verify: auto
- [x] The whole suite stays green, and a card with no `---` in its frontmatter merges exactly as before — verify: auto

## Evidence

A repository with `title: "Split the --- separator"`, branch `a` setting `status: 4-review`, branch `b` appending a `## Delivery` section, driver `node dist/cli.js _merge-issue %O %A %B`, `git merge a` on `b`. Before: exit 0 and the merged card holds `separator"`, `type: feat`, `status: 4-review` and a third `---` line inside its body. After: exit 0 and the card is the frontmatter, one blank line, then the body with both sections, two `---` lines in all.
