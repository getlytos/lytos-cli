---
id: ISS-0126
title: Translate the live issue fiches to English
type: chore
priority: P2-normal
effort: M
complexity: light
domain: [method, docs]
skill: 
skills_aux: []
status: 4-review
branch: chore/ISS-0126-translate-live-fiches-to-english
depends: []
created: 2026-08-10
updated: 2026-08-10
schema_version: 2
risk: low
assignee: fredericgalline
started_at: 2026-08-10
---
# ISS-0126 — The fiches a stranger reads first are in the wrong language

## Context

lytos-cli is a public repository and its rules now state that every artifact in it is written in
English — code, commits, fiches, ADRs, CLI output. The rule was added after the fact, so it
inherits a bilingual board: 42 of 66 fiches carry French bodies.

The rule is not retroactive by default, but the live columns are a different case from the
archive. A contributor landing on this repo reads the backlog and what is in review — that is the
board they would have to work from. A French fiche there is a wall for every outside contributor,
and for every AI session that opens it cold, which is the audience this method exists for.

Closed and archived fiches are left alone: they are a record, not an invitation, and the marginal
value of translating them is low.

## Ready

- **Scope** — the 30 French fiches in `0-icebox/`, `1-backlog/` and `4-review/`, plus
  `sprint.md`, which is as live as any fiche and read immediately after the board.
- **Constraints** — translate, do not rewrite: the argument, the field anecdotes and the
  decisions stay exactly as they are. Frontmatter values other than `title` are data and are not
  touched. Cross-issue links keep resolving.
- **Out of scope** — `5-done/` and `archive/`. Past commit messages: rewriting the history of a
  public repo for a language question costs more than it returns. ADRs (2 are French) — separate
  issue if wanted.
- **Out of scope — `## Audit` blocks.** An auditor quoted the DoD items as they read at audit
  time. Translating those quotes would make the record say something the auditor did not write.
  The French left inside an audit block is dated, not live; it disappears on its own as fiches
  close.
- `risk: low` — documentation only, no code path involved.

## Definition of done

- [x] The 30 live French fiches are in English, bodies and `title` frontmatter — verify: auto
- [x] `sprint.md` is in English — verify: auto
- [x] `ISS-0098-epic-loop-b-gouvernance.md` is renamed to an English slug — verify: auto
- [x] `lyt doctor` reports no new broken link after the rename — verify: auto
- [x] `lyt lint` stays clean on the translated fiches — verify: auto
- [ ] The translations preserve the original argument rather than smoothing it — verify: human

## Notes

- Follows the language rule added to `rules/cli-rules.md`.
- The seven fiches in `4-review/` are translated before their re-audit, so the auditor reads an
  English fiche rather than a French one with an English audit block stapled to it.
