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
status: 5-done
branch: chore/ISS-0126-translate-live-fiches-to-english
depends: []
created: 2026-08-10
updated: 2026-08-12
schema_version: 2
risk: low
assignee: fredericgalline
started_at: 2026-08-10
review: go-pending-human
review_at: 2026-08-10
reviewer: fredericgalline
completed_at: 2026-08-12
commits: [21ea10c, 5aced53, d984b02, d7149c5, c60e9d1, 3fa59b9, 5ae3e05, 4dba6cc, 883a452, cfbc955, 16f484b, d339db7, f2a0c1d, a01a12f, 4a1af88, 89b5157, 4e68b3c, 070d2f5, b81d23f, 349cd9e, 881e87a, d5cf5cb, afae795, ed37ccf, 80d658a, ce6f91d, 230ad0d, 8e0e745, c23fcf6, 76035ed, c34c9cb, a39e1e9, 8665d38, 71e4bfa, 873931c, 31a9a8c, bb502e8, 09f2c4d, 15ba056, 5d3d472, 08d295d, 7aaa7c5, 96fad9d, 24230a0, a8483f3, 7c16fd8, 3c16cd8, a6fac6a, 71ded27, 8b89911, cb17e83, 0933900, c7e454b, f492a0e, 2be7413, f4a5405, d0f5e77, 6a3e84e, 0c86b6c, bce1a82, 35c0d61, 638fc40, a70f8cf, 07e23ed, fa18610, ab68138, 23d0673, 4318a7f, 5740116]
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
- [x] The translations preserve the original argument rather than smoothing it — verify: human

## Notes

- Follows the language rule added to `rules/cli-rules.md`.
- The seven fiches in `4-review/` are translated before their re-audit, so the auditor reads an
  English fiche rather than a French one with an English audit block stapled to it.

## Audit — 2026-08-10

**Verdict:** GO_PENDING_HUMAN

### Checks
- [x] Tests pass (326)
- [x] Machine-verifiable DoD items (`verify: auto`) complete
- [x] Rules respected
- [x] Documentation aligned

### Notes
The change is limited to the live issue columns and sprint document, preserves frontmatter data other than titles, keeps the audit blocks intact, and retains the renamed epic's cross-references. `lyt lint` passes; the doctor findings are pre-existing stale review-prompt links outside this change.

### Awaiting human judgment
- [ ] The translations preserve the original argument rather than smoothing it

## Audit — 2026-08-12

**Verdict:** GO_PENDING_HUMAN

### Checks
- [x] Tests pass (338)
- [x] Machine-verifiable DoD items (`verify: auto`) complete
- [x] Rules respected
- [x] Documentation aligned

### Notes
The translation commit is constrained to the live board columns and `sprint.md`; it keeps audit blocks intact and preserves the renamed ISS-0098 references. No machine-verifiable defect was found.

### Awaiting human judgment
- [ ] The translations preserve the original argument rather than smoothing it
