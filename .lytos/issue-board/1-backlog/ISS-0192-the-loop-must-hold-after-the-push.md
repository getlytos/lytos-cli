---
id: ISS-0192
title: "The loop must hold after the push: CI guidance, the watch frame and the skill checks"
type: fix
priority: P2-normal
effort: M
complexity: standard
domain: [method, cli, ci]
skill: ""
skills_aux: []
status: 1-backlog
branch: ""
depends: [ISS-0191]
related: [ISS-0148, ISS-0135, ISS-0186]
created: 2026-11-27
updated: 2026-11-27
schema_version: 2
risk: medium
---

# ISS-0192 — The loop must hold after the push

## Context

Parts B, C and D of ISS-0191, moved here when part A (the skills must be read)
was submitted for review on its own. The text below and the Definition of done
items are copied from that card. Line numbers refer to `origin/main` at 1.7.0.

### B. Three holes in the CI cost guidance (`method/skills/git-workflow/SKILL.md`)

ISS-0148 added the invariant "CI runs = code iterations". Elsewhere in the file:

1. The standard cycle (lines 142-143) pushes, then opens the pull request and
   moves the card to `4-review/`. If that move is committed and pushed after the
   pull request opens, it can trigger another run, against the "one push" ordering
   further down.
2. The pull request checklist (line 212) asks for a branch up to date with `dev`,
   which can cause base merges and pushes that change nothing under test.
3. A search of the file found nothing against re-running a failed check with no
   fix.

### C. Nothing frames `/ship` and `/steward`

Source: [Get a pull request ready with /ship and /steward](https://code.claude.com/docs/en/ship-command).

- A watch lasts up to seven days. It pushes fixes, merges the base branch to
  resolve conflicts **or to bring the branch up to date**, and re-runs failed
  checks. The last two cut against part B.
- `/ship` reviews from the session that did the work, with `/code-review`. That
  is not the Lytos audit of the card against its Definition of done.
- When the watch acts without a user message, its fetches, merges, commits and
  pushes skip the repository's git hooks, so the hook `lyt init` installs does
  not run for them.
- "Claude never merges" has limits: auto-merge on the pull request can merge
  after a watch push; in a terminal session, the watch limits are off while Claude
  answers a message typed while it was idle; branch rules that need no approval
  leave the merge open to the signed-in account.
- `/ship` can commit **all** uncommitted files, new ones included (not in a public
  repository), which can mix several cards in one commit.
- The supported hook-in point is `.claude/skills/steward/SKILL.md`, which a watch
  reads and follows as instructions. These are instructions, not a lock.

### D. `lyt lint` does not see task skills

`src/lib/linter.ts:211-224` counts only the flat `*.md` files in `skills/`. Task
skills are folders, so `session-start.md` alone satisfies the check: a project
with no task skill passes.

## Proposed solution

### B. Fix the three holes

- Commit the move to `4-review` **before** the single push.
- Merge the base branch for a conflict, or when branch protection requires an
  up-to-date branch. Not otherwise.
- A failed check is not re-run without a fix.

### C. Frame the watch

- Ship `.claude/skills/steward/SKILL.md` with `--tool claude`. **Add-only:** an
  existing file belongs to the project and is never overwritten. It says:
  - the three rules of part B;
  - `Refs: ISS-XXXX` on every commit;
  - a skip marker only on intermediate card-only commits: the head that gets
    merged has run CI;
  - never `lyt close`, never `lyt review --verdict`, `--accept` or
    `--countersign`, never `--force` or `--discovery-override`;
  - never tick a `verify: human` or `verify: reviewer` item;
  - a finding that needs code sends the card back to `3-in-progress` with a fix
    list;
  - the five stop cases of the reference loop apply, two failures in a row
    included.
- In `reference-loop` Part 2: the loop stops at `4-review`; the human types
  `/ship`, which is their go for the push; the loop never starts it; its review is
  a first filter and never a Lytos verdict.
- In `git-workflow`: the limits listed in part C of the context, with what to do
  about each (clean the tree before `/ship`, turn auto-merge off, require an
  approval on the base branch).

### D. Make the checks see the skills

- `lyt lint` counts `skills/*/SKILL.md` and warns when there is none.
- With a Claude bridge in place, `lyt doctor` reports a task skill with no
  pointer, a pointer with no source and a description that drifted.

Also from the review of part A: the "Task skills" section `lyt upgrade` prints
has no line about the `lytos-<name>` pointers, unlike the `CLAUDE.md` template.

### Solution study (the watch frame)

| Option | Build cost | Run and maintenance cost at 10 / 100 / 500 projects | Robustness floor |
|---|---|---|---|
| 1. Documentation only | low | none | Nothing reaches the watch itself |
| 2. Documentation + add-only steward file | medium | no run cost; claims about Claude Code have to be rechecked when it changes | Passes: visible in the repository, never overwritten, deleted to revert. Instructions, not a lock |
| 3. Hooks or permission rules that block the watch | high | breaks as the tool changes | Writes into settings the project owns |

**Decision:** option 2.

## Ready

- **Scope** — close the three CI holes, frame `/ship` and `/steward`, and make `lint` and `doctor` see the task skills.
- **Constraints** — never overwrite a file the project owns, never write through a link; the CLI calls no AI and no forge; zero new dependency; the method stays usable with other agents.
- **Out of scope** — scaffolding a CI workflow; running `/ship` or `/steward` from the CLI or the loop; the `lytos-method` repository and the website.
- **Solution** — the study above is written; option 2 is chosen. Parts B and D are small fixes with one obvious form.

## Definition of done

### B. CI guidance

- [ ] The standard cycle commits the move to `4-review` before the single push, and agrees with the ordering table of the same file — verify: reviewer
- [ ] The checklist no longer asks for an up-to-date branch without a conflict or a protection rule, and a rule forbids re-running a failed check with no fix — verify: reviewer

### C. `/ship` and `/steward`

- [ ] `lyt init --tool claude` and `lyt upgrade` add the steward file when absent and leave an existing one untouched (tests) — verify: auto
- [ ] The steward file, the `reference-loop` paragraph and the `git-workflow` limits say what the proposed solution lists, and each claim about Claude Code is checked against its documentation on the day of writing — verify: reviewer
- [ ] One real pull request of this repository goes through `/ship`, typed by the owner, with the steward file in place; this card records CI runs against code iterations, and the owner decides whether the file ships as is — verify: human:product-intent

### D. Checks

- [ ] `lyt lint` warns on a project with `session-start.md` and no task skill (test) — verify: auto
- [ ] `lyt doctor` reports a missing pointer, an orphan pointer and a drifted description (tests) — verify: auto

## Notes

- B and D can ship together. C needs the owner to type `/ship`, on a Claude Code
  version that has it.
- The `/ship` facts come from documentation read on 2026-11-27. None of the three
  commands had been run when this card was written.
