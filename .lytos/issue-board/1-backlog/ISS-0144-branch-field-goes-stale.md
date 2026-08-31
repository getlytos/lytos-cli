---
id: ISS-0144
title: The audit stops on a metadata field, not on the work — `branch:` goes stale by design
type: fix
priority: P1-high
effort: S
complexity: standard
domain: [cli, method]
skill: 
skills_aux: []
status: 1-backlog
branch: ""
depends: []
created: 2026-08-31
schema_version: 2
risk: low
---

# ISS-0144 — Five fiches returned in one round for a field, not for a defect

## Context — measured, five times on the same day

On 2026-08-31, five issues were returned by the audit because the branch their fiche declared did
not contain the commits being audited:

| Issue | Declared | Missing there | Verdict |
|---|---|---|---|
| ISS-0107 | `claude/claude-loops-lytos-wtkc94` | `4dba6cc` | NO_GO [CRITICAL] |
| ISS-0114 | idem | `4dba6cc` | NO_GO [CRITICAL] |
| ISS-0115 | idem | `5ae3e05` | NO_GO [CRITICAL] |
| ISS-0124 | idem | `c60e9d1` | NO_GO [CRITICAL] |
| ISS-0141 | `fix/ISS-0141-npm-trusted-publishing` | `c1409d8` | NO_GO |

Every one of these was a correct call: an auditor sent to a tree missing part of the work will
either miss a defect or report one that is already fixed. The verdicts are not the problem.

**The problem is that all five were metadata, and four of the five cost a full audit round each.**
An audit round is not cheap — it is a cross-model pass over a whole packet — and spending one to
learn that a string in the frontmatter is out of date is the most expensive way possible to
discover it.

## Why the field cannot stay accurate

`branch:` holds one value for work that legitimately spans several: the original delivery, then
the audit response, then — as ISS-0141 demonstrated — the fix to the metadata itself. Each lands
on its own branch, because that is what the project's own git-workflow rule asks for. The field is
correct when written and wrong two commits later, and nothing updates it.

`src/lib/review.ts` already knows this. Its own doc comment says *"a fiche routinely declares one
branch while its fixes land on another"*, and ISS-0133 already fixed the **diff** side: the packet
is scoped by `--grep=Refs: ISS-XXXX` across all refs, so the right patches are exported no matter
what the fiche declares.

What was not fixed is the **target** side. `auditTarget()` still checks the exported commits
against the declared branch and blocks when they are missing — while `refsContainingAll()`, three
functions above it, already computes every ref that does contain them all. The answer is sitting in
the same file as the question.

## Ready

- **Scope** — when the declared branch does not contain every `Refs: ISS-XXXX` commit, resolve the
  audit target from `refsContainingAll()` instead of blocking: send the auditor to a ref that
  holds the whole issue, and say in the packet which ref was used and why it differs from the
  fiche.
- **Constraints** — a fiche that declares a branch nobody can fetch must still be reported; the
  goal is to stop wasting audit rounds on a stale string, not to stop noticing a lying fiche.
  Deterministic choice when several refs qualify — prefer the declared one, then `main`, then the
  narrowest — because an audit target that changes between runs is worse than a stale one.
- **Out of scope** — changing the meaning of `branch:` for `lyt start` / `lyt claim`, and
  auto-writing the field (that is a separate call: a field the tool rewrites is a field nobody
  reads).
- `risk: low` — affects packet generation only; no published artifact, no board mutation.

## Definition of done

- [ ] `lyt review` resolves a usable audit ref when the declared branch lacks some `Refs:` commits, instead of blocking — verify: auto
- [ ] The packet states which ref it sent the auditor to, and names the divergence from the fiche — verify: auto
- [ ] Ref selection is deterministic and covered by a regression built on the ISS-0141 case (three commits, two branches, both merged) — verify: auto
- [ ] A declared branch that exists nowhere is still reported as a lying fiche — verify: auto
- [ ] Does the packet make the substitution obvious enough that a reviewer notices it — verify: human

## Notes

- ISS-0141's own resolution was to declare `branch: main`, the only ref containing all three of
  its commits. That works and is honest once everything is merged, but it is a workaround applied
  by hand, per issue, after an audit round has already been spent.
- Related: ISS-0133 (diff scoped to the issue) fixed the sibling half of this problem. This issue
  is the target half, and it is the same join key — `Refs: ISS-XXXX`.
