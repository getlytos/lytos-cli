---
id: ISS-0191
title: The skills in .lytos/skills/ must be read
type: fix
priority: P1-high
effort: L
complexity: standard
domain: [method, cli, ci]
skill: ""
skills_aux: []
status: 3-in-progress
branch: fix/ISS-0191-lytos-skills-must-be-read
depends: []
related: [ISS-0046, ISS-0135, ISS-0148, ISS-0186]
created: 2026-11-27
updated: 2026-11-28
schema_version: 2
risk: medium
assignee: fredericgalline
started_at: 2026-11-27
ai_implementer:
  model: claude-sonnet-5-5
skills_used: [testing]
ai_reviewer:
  model: gpt-6.1-terra
  session: 01a21dd8-ff26-74f1-bdeb-f314576a24a0
review: no-go
review_at: 2026-11-27
reviewer: fredericgalline
---
# ISS-0191 — The skills in `.lytos/skills/` must be read

## Context

Found on 2026-11-27 while checking whether the Claude Code commands `/ship`,
`/steward` and `/code-review` fit into Lytos. Code and method findings below were
checked against `origin/main` (1.7.0). Line numbers refer to that state.

**Part A is the blocker.** Parts B, C and D were found in the same pass.

### A. Claude Code does not discover the Lytos task skills

- `method/skills/session-start.md:130` says that Claude Code, Cursor, Codex,
  Gemini CLI, Copilot and Goose discover `.lytos/skills/<name>/SKILL.md`
  natively. `method/LYTOS.md:41` and
  `method/issue-board/templates/issue-feature.md:9` say the same, and so does the
  comment at `src/lib/scaffold.ts:56`.
- The [Claude Code skills documentation](https://code.claude.com/docs/en/skills)
  lists the locations it loads: `.claude/skills/` (project, nested, added
  directories), `~/.claude/skills/`, managed settings, plugins and the claude.ai
  account. `.lytos/skills/` is not one of them.
- Observed in a Claude Code session on this repository: no Lytos skill such as
  `reference-loop` or `git-workflow` was in the skill list.
- A search of `src/` found no write to `.claude/skills/`. The `CLAUDE.md`
  template names no skill other than `session-start.md`.
- Effect: lightweight startup (`session-start.md:81`) relies on native
  discovery, so an XS / light card with no `skill` field can run with no task
  skill at all. On standard startup, the manual fallback (end of the "Task
  skills" section) is reserved for tools without discovery, and the text tells
  Claude Code that it has it.
- **Not verified:** what Cursor, Codex, Gemini CLI, Copilot and Goose load.

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

### A. Two layers: a floor for every tool, a bridge for Claude Code

1. **Floor — explicit reading.** `session-start.md` and the six bridge templates
   say that the agent reads `.lytos/skills/<name>/SKILL.md`: the one the card
   names, otherwise those whose `description` matches the task. This holds on
   lightweight startup too. The claim of native discovery goes, for every tool
   that has no documented proof of loading `.lytos/skills/`.
2. **Bridge — pointer skills.** For `--tool claude`, the CLI writes
   `.claude/skills/lytos-<name>/SKILL.md` for each `.lytos/skills/*/SKILL.md`:
   `name: lytos-<name>`, the same `description`, and a body that orders the agent
   to read the source file and follow it. `.lytos/` stays the only source of
   truth.

The list comes from the folders on disk, never from a hardcoded list, so
`reference-loop` and the skills a project adds are covered.

The `lytos-` prefix is required. A project skill replaces the bundled command of
the same name (documented example: `code-review` replaces `/code-review`).

`lyt upgrade` must bring both layers to projects that already exist: today it
writes method files under `.lytos/` and leaves the bridge files alone.

#### Solution study

| Option | Build cost | Run and maintenance cost at 10 / 100 / 500 projects | Robustness floor |
|---|---|---|---|
| 1. Text only (floor) | low | none at any size | Works in any tool, but nothing shows when the agent skips it |
| 2. Pointer skills + floor | medium | no run cost; descriptions can drift, caught by `lyt doctor` and rewritten by `lyt upgrade` | Passes: drift is visible, rewrite is idempotent, deleting the pointers reverts, no symlink |
| 3. Symlinks `.claude/skills/<name>` → `.lytos/skills/<name>` | low | no drift | Fails isolation: the linked file keeps `name: code-review`, which Claude Code can use as the command name, so renaming the link may not avoid the collision. Git symlinks on Windows need checking, and the CLI refuses to write through links |

**Decision:** option 2. It is the cheapest one that gives Claude Code native
discovery, keeps the bundled commands and does not depend on symlinks.

Parts B, C and D moved to ISS-0192, with their proposed solution.

## Ready

- **Scope** — make `.lytos/skills/` actually read, and have `lyt upgrade` name the
  bridge files that carry no order to read it.
- **Constraints** — `.lytos/skills/` stays the only source of truth; no symlink;
  never overwrite a file the project owns, and never write through a link; no
  bundled Claude Code command is replaced; the CLI calls no AI and no forge; zero
  new dependency; the method stays usable with other agents.
- **Out of scope** — parts B, C and D (ISS-0192); native bridges for tools other than Claude Code (one card
  each, once their discovery is verified); scaffolding a CI workflow; running
  `/ship` or `/steward` from the CLI or from the loop; the `lytos-method`
  repository (ISS-0092) and the website.
- **Solution** — the study above is written; option 2 is chosen.

## Delivery scope (2026-11-27)

This card delivers **part A**, plus the bridge warning in `lyt upgrade`. Parts B,
C and D moved to ISS-0192, with their proposed solution and their Definition of
done items. The Context section still describes the four parts, as found.

**Decided by the owner on 2026-11-27**, after the audit below returned NO_GO. The
card had planned for a part A delivery, and the owner had agreed to a pull request
for part A alone. The items were first kept here, unchecked, with a pointer, as
`skills/session-start.md` asks. The audit prompt of `lyt review` treats any
unchecked `auto` item as a defect and carries neither that rule nor a word on
deferral. The two disagree, so the loop stopped and the owner chose: **remove the
items from this card**. That departs from `session-start.md`, openly. Fixing the
disagreement is part E of ISS-0192.

Removed from the Definition of done, quoted as they stood:

> The standard cycle commits the move to `4-review` before the single push, and agrees with the ordering table of the same file — verify: reviewer
>
> The checklist no longer asks for an up-to-date branch without a conflict or a protection rule, and a rule forbids re-running a failed check with no fix — verify: reviewer
>
> `lyt init --tool claude` and `lyt upgrade` add the steward file when absent and leave an existing one untouched (tests) — verify: auto
>
> The steward file, the `reference-loop` paragraph and the `git-workflow` limits say what the proposed solution lists, and each claim about Claude Code is checked against its documentation on the day of writing — verify: reviewer
>
> One real pull request of this repository goes through `/ship`, typed by the owner, with the steward file in place; this card records CI runs against code iterations, and the owner decides whether the file ships as is — verify: human:product-intent
>
> `lyt lint` warns on a project with `session-start.md` and no task skill (test) — verify: auto
>
> `lyt doctor` reports a missing pointer, an orphan pointer and a drifted description (tests) — verify: auto

## Definition of done

### A. Skills are read

- [x] `lyt init --tool claude` writes one `lytos-<name>` pointer per task skill found on disk, `reference-loop` included, and a project-added skill gets one too (tests) — verify: auto
- [x] No exposed pointer name equals `code-review` or another bundled command name; every one starts with `lytos-` (test) — verify: auto
- [x] `lyt upgrade` on a project with a Claude bridge adds the missing pointers, refreshes a drifted description, is idempotent, overwrites no skill it did not generate and writes through no link (tests, forbidden cases included) — verify: auto
- [x] In a fresh Claude Code session on a scaffolded project, the `lytos-*` skills are listed and invoking one leads the agent to read the matching `.lytos/skills/` file; the output is recorded in this card — verify: auto:e2e
- [x] The six bridge templates and `session-start.md` order the explicit reading, lightweight startup included (tests) — verify: auto
- [ ] Each tool still said to discover `.lytos/skills/` natively has a documentation link that shows it; otherwise the claim is removed, in `method/` and in this repository's `.lytos/` — verify: reviewer

## Relevant files

- `method/skills/session-start.md`, `method/skills/git-workflow/SKILL.md`, `method/skills/reference-loop/SKILL.md`
- `method/LYTOS.md`, `method/issue-board/templates/issue-feature.md`
- `src/lib/scaffold.ts`, `src/lib/templates.ts`, `src/lib/method-files.ts`
- `src/commands/upgrade.ts`, `src/lib/linter.ts`, `src/lib/doctor.ts`
- This repository's own copies under `.lytos/`

## Notes

- ISS-0046 adopted the agentskills.io folder format and expected native discovery
  in every target tool. The format is in place; for Claude Code, the location is
  not one it loads.
- The open pull request #30 (ISS-0135) also edits `src/lib/templates.ts` and
  `method/skills/git-workflow/SKILL.md`. Settle it first, or expect conflicts.
- ISS-0186 fixes a stale skill path in `session-start.md`: same file.
- The `/ship` facts come from documentation read on 2026-11-27. None of the three
  commands had been run for this card.
- If the card proves too large for one pull request, ship part A alone first.

## Evidence — part A (2026-11-27)

Tests: now in `tests/commands/skill-pointers*.test.ts` and
`skill-reading-floor.test.ts`. Full suite at the first commit: 68 files, 1447 tests
green; `eslint src/` and `tsc --noEmit` clean. Each safeguard was removed in turn
to check that the tests see it: no link guard, 2 failures; no ownership guard,
1 failure; no `lytos-` prefix, 11 failures.

Fresh headless sessions (Claude Code 2.1.310, project settings only, `Skill` and
`Read` pre-approved; the agent also ran shell commands) on a project scaffolded with `lyt init --tool claude`, plus one
project-added skill, `billing-rules`, holding a code word found in no other file
of the method, its pointer included.

| Probe | Observed |
|---|---|
| "Invoke the skill lytos-billing-rules" (Haiku) | The 10 `lytos-*` skills are listed, the project-added one included, and `code-review` is still listed. Calls: `Skill lytos-billing-rules`, then `Read .lytos/skills/billing-rules/SKILL.md`. The answer holds the code word |
| Control: same project with `.claude/` moved away (Haiku) | No `lytos-*` skill is listed |
| A task about invoices that names no skill (Haiku, one run) | Read `.lytos/skills/billing-rules/SKILL.md` |
| The same task (Sonnet, one run) | Read `.lytos/skills/billing-rules/SKILL.md` |

In the last two runs the agent read the source file directly, as the floor
orders, without calling the pointer. One run per model: an observation, not a
guarantee. Nothing was run in Cursor, Codex, Gemini CLI, Copilot or Windsurf.

A first probe asking for the code word itself proved nothing: the agent searched
for it with a shell command, with and without the pointers.

For the reviewer item: every claim of native discovery was removed, so no tool
is left that needs a documentation link.

Also fixed here: `session-start.md` named two skills by paths that no longer
exist (`code-review.md`, `documentation.md`), so they could not be read. A test
now checks every skill path it names. This overlaps the first half of ISS-0186.

**Existing projects.** `lyt upgrade` adds the pointers without asking. The floor
reaches them through `session-start.md` when they accept the new version (`y` or
`--force`). `upgrade` rewrites no bridge file: it names each one that points at
`.lytos/` and carries no order to read the task skills, and prints the section to
add (`src/lib/bridge-check.ts`, `tests/commands/bridge-check.test.ts`). Adding it
stays a manual step. Since the audit, the order is recognized by a marker line,
see below.

## Independent review — part A (2026-11-27)

Reviewer: a sub-agent with a fresh context, read-only, on Claude Opus; the code
was written on Claude Sonnet. A different model from the same vendor, started by
the implementing session. This is not an `lyt review` verdict.

| Pass | Code read | Result |
|---|---|---|
| 1 | `fdd00a6` | No high finding. 1 medium: `upgrade` crashed on a bad file in a skill folder. 4 low: the ignore advice did not work as printed, a byte order mark hid the description, a `CLAUDE.md` that only imports the bridge got no pointer, and two texts disagreed (the reference-loop brief; one cosmetic point) |
| 2 | `984c4b8` | The pass 1 findings it re-ran are closed. 1 new medium: the new ignore lines, not anchored, would have exposed the personal files of nested `.claude/` folders in a monorepo |

Reproducing pass 1 also showed one more crash: a directory named `CLAUDE.md`.
All fixed, except the cosmetic point: the section `upgrade` prints has no line
about the `lytos-<name>` pointers.

The fix for pass 2 anchors every line. It came **after the reviewer's last read**:
its tests failed before it and pass after, and the reviewer had tried the anchored
form when reporting. The final diff has had no further read.

**Ruling on the `verify: reviewer` item: PASS** (pass 1, on `fdd00a6`: no text
left says a tool discovers `.lytos/skills/` on its own; the claim about Claude
Code is documented). The box stays unticked: the implementer does not tick a
reviewer item.

The suite is at 69 files and 1476 tests, and the CI gates run locally are green:
`format:check`, `lint`, `typecheck`, `secrets:scan`, build and tests.

## Audit — 2026-11-27

**Verdict:** NO_GO

### Checks
- [x] Tests pass: 69 files, 1,476 tests; build, lint, typecheck, format check, and secret scan passed.
- [ ] Machine-verifiable DoD items (`verify: auto`) complete.
- [ ] Rules respected (file/fn size, params, coverage as defined in default-rules.md).
- [ ] Documentation aligned.

### Notes
[WARNING] src/lib/bridge-check.ts:29
The bridge warning treats any occurrence of `.lytos/skills/<name>/SKILL.md` or `.lytos/skills/*/SKILL.md` as an instruction to read skills. For example, a bridge saying “Do not read `.lytos/skills/<name>/SKILL.md`” suppresses the warning. Existing projects can therefore be reported as having the floor while their bridge does not order it.

[WARNING] tests/commands/skill-pointers.test.ts:1
The new test file is 458 lines, exceeding the 300-line file limit.

The card explicitly defers parts B–D to ISS-0192, with owner agreement, but still contains unfinished auto gates and missing deliverables at lines 210 and 216–217. The requested audit criteria treat these as blocking while they remain in this card's DoD. This finding does not arise from the deferred human checkbox. The part A Claude Code session is recorded in the card; I did not independently rerun that external session. The part A reviewer item passes: I found no remaining active claim that a tool natively discovers `.lytos/skills/`.

### To fix before next review
- [ ] Make the bridge warning detect the actual order to read task skills, including a regression case for a path mention without that order.
- [ ] Reconcile this card's DoD with the approved delivery scope and ISS-0192 so its remaining machine gates and deliverables are complete for the issue being closed.
- [ ] Bring the new test file within the project's file-size rule.

## Response to the audit — 2026-11-27

| Audit point | Answer |
|---|---|
| Any mention of the skills' path silenced the bridge warning | Fixed. Reproduced with a sentence forbidding the reading and with a neutral mention. No wording is guessed at any more: the warning stops only for the `<!-- lytos:task-skills -->` line, alone on its line. The generated bridges and the printed section carry it; a bridge that words the order its own way adds the line. Five regression tests failed before the fix |
| The card still held unchecked `auto` items | The owner's decision, recorded under "Delivery scope" |
| The new test file was over 300 lines | Split in three, with shared helpers. The 47 earlier tests are all there, plus one marker test per bridge |

Found while answering, not in the audit: this branch had also pushed
`src/commands/upgrade.ts` from 296 to 363 lines. The skill steps moved to
`src/lib/upgrade-skills.ts` and the summary to `upgrade-library.ts`; it is at 295.
`scaffold.ts` and `templates.ts` were over 300 lines before this branch.

Suite: 71 files, 1488 tests; `format:check`, `lint`, `typecheck`, `secrets:scan`
and build green locally.

Fresh sessions replayed on the final build (same settings as above): invoking
`lytos-billing-rules` led to `Read .lytos/skills/billing-rules/SKILL.md`, all 10
`lytos-*` skills listed. On the task naming no skill, Haiku first tried
`.lytos/skills/lytos-billing-rules/SKILL.md`, which does not exist, then read the
right file with a shell command; Sonnet called the pointer, then read the source.
One run each.
## Audit — 2026-11-27

**Verdict:** NO_GO

### Checks
- [x] Tests pass: 71 files, 1,488 tests; build, lint, typecheck, format check and secret scan pass.
- [ ] Machine-verifiable DoD items (`verify: auto`) complete.
- [ ] Rules respected (file/fn size, params, coverage as defined in default-rules.md).
- [x] Documentation aligned.

### Notes
[CRITICAL] src/lib/skill-pointers.ts:205
The link guard detects symbolic links only. If a generated pointer has another hard link to a project-owned file, refreshing the pointer with `writeFileSync` truncates and overwrites that other file too. I reproduced this with a marked pointer hard-linked to a separate file: `lyt upgrade` exited successfully and destroyed the other file's contents. This violates the issue's no-write-through-links and ownership constraints. Reject multiply linked pointer files before writing, with a regression test.

The reviewer item passes for the active method and repository instructions: no unsupported claim remains that a tool discovers `.lytos/skills/` directly. The recorded fresh Claude Code session was not independently replayed. The offline dependency audit reported zero vulnerabilities using cached data; its freshness could not be verified.

### To fix before next review
- [ ] Prevent pointer refresh from changing other files through hard links, and test the forbidden case.
