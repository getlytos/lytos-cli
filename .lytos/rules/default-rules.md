# Rules — Default Rules

*These rules are the universal quality criteria applicable to any project using Lytos. They are read by agents before each task. They define what "well done" means.*

---

## Code Structure

| Rule | Threshold | Rationale |
|------|-----------|-----------|
| Maximum file size | 300 lines | Beyond that, the file has too many responsibilities |
| Maximum function size | 30 lines (50 max) | A long function does too many things |
| Maximum nesting | 3 levels | Beyond that, the code is unreadable — use early return |
| Parameters per function | 4 max | Beyond that, group them into an object |

---

## Documentation

| Rule | Detail |
|------|--------|
| Mandatory documentation (docstring, JSDoc, PHPDoc, GoDoc...) | On every public function and method |
| Inline comments | Only to explain the **why**, never the **what** |
| README per module | Each major module has a minimal README |

---

## Hardcoded Values — Forbidden

No magic values in production code.

| Forbidden | Replacement |
|-----------|-------------|
| Magic numbers (`1.20`, `86400`, `3`) | Named constant (`TVA_FRANCE`, `SECONDS_PER_DAY`, `MAX_RETRIES`) |
| Hardcoded colors (`#FF6B35`, `red`) | CSS variable (`var(--color-accent)`) or theme constant |
| Hardcoded URLs | Environment variable or configuration file |
| Configuration strings | Constant or `.env` file |

---

## Error Handling

| Rule | Detail |
|------|--------|
| No silent failures | Every error must be handled explicitly |
| No empty `catch` | A catch must at minimum log the error |
| Clear error messages | The error must state **what** failed and **why** |
| Input validation | All external data (user, API) is validated before processing |

---

## Production Code — Forbidden

| Forbidden | Why |
|-----------|-----|
| `console.log()`, `print()`, `var_dump()`, `fmt.Println()` | Use a structured logger — no debug in production |
| `// TODO` without reference | A TODO must point to an issue: `// TODO(ISS-XXXX)` |
| Commented-out code | If it's commented out, it's dead — delete it. Git is the history |
| `@ts-ignore` / `@phpstan-ignore` without justification | If ignoring a warning, explain why |

---

## Tests

| Rule | Threshold |
|------|-----------|
| Unit test coverage | 80% of public functions minimum |
| Tests for every new feature | Mandatory before merge |
| Tests for every fix | The test must prove the bug doesn't come back |
| E2E tests on critical paths | Mandatory (auth, payment, registration) |

---

## Security

| Rule | Detail |
|------|--------|
| No secrets in code | API keys, tokens, passwords → `.env` file only |
| User inputs escaped | Protection against SQL injection, XSS, command injection |
| Permissions verified | Before any sensitive action |
| Dependencies up to date | No known vulnerabilities in deps |

---

## Git

| Rule | Detail |
|------|--------|
| Commit format | `type(scope): message` |
| Branch per issue | `type/ISS-XXXX-slug` |
| No push to main/dev | Everything goes through PR |
| Mandatory review | At least one review before merge |

---

## Agent Behavior

| Rule | Detail |
|------|--------|
| No silent interpretation | If an instruction (skill, rule, issue) is ambiguous, the agent **flags the ambiguity to the human** instead of guessing. Filling a gap without saying so is worse than asking a question |
| No "if appropriate" | An agent does not decide on its own what is "appropriate". If a step in a skill is not applicable in the context, it flags it — it does not skip it |
| Decision traceability | When an agent makes a technical choice (between two approaches, one lib over another), it mentions it explicitly with the reason, so the human can validate or correct |
| No work without issue | Any work lasting more than 10 minutes or modifying more than 3 files **must** have an issue. The agent proposes creating one before starting untracked work |
| Mandatory start phase | Before writing any code, the agent **must** run `npx lyt start ISS-XXXX` — it moves the issue to `3-in-progress/`, regenerates BOARD.md, and creates the `type/ISS-XXXX-slug` git branch in one atomic command. **Never code on main.** If the agent starts coding without a branch, the human must stop it |
| Mandatory close phase | After completing a task, the agent **must**: (1) run `npx lyt move ISS-XXXX 4-review` — frontmatter, file move, and BOARD.md in one verb, (2) write to memory if learning occurred. Promotion to `5-done` happens only after explicit validation via `npx lyt close` |
| Incomplete items generate follow-ups | Before closing an issue, review all checklist items. Any unchecked item must either be completed now or generate a new follow-up issue. Never close an issue with silent gaps |
| No overlapping issues | Two issues must never cover the same scope. When a new issue makes an existing one obsolete, the old issue must be closed with `superseded_by: ISS-XXXX` in its frontmatter. When a new issue reduces the scope of an existing one, update the existing issue. Never leave ambiguity about which issue owns a piece of work |
| No reactive coding | When a new idea, constraint, or feedback arrives mid-session — **stop**. Do not start coding immediately. The agent must: (1) reformulate the idea clearly, (2) validate it with the human ("here's what I understood — is this what you want?"), (3) create an issue, (4) include it in the workflow (backlog or sprint depending on priority). Only then can work begin via the normal start phase. Impulse and urgency are not reasons to bypass the process |

---

## The CLI Is the Interface

**Every issue transition goes through the CLI — never through a hand edit.** Editing a `status:`
frontmatter, `git mv`-ing a fiche between columns, or rebuilding the board by hand bypasses the
tool that exists to make those gestures atomic — and produces boards that lie.

Always invoke it as **`npx lyt`** — the bare `lyt` binary is usually a devDependency and not on
the PATH. A "command not found" on `lyt` does **not** mean the tool is absent.

| Verb | When to use it |
|------|----------------|
| `npx lyt show [ISS-XXXX]` | First call of every session — the real board state (or one issue) in a single read |
| `npx lyt start ISS-XXXX` | Begin work: status → `3-in-progress`, git branch, board — one atomic command |
| `npx lyt move ISS-XXXX <stage>` | Any other transition (e.g. work done → `4-review`): status + file + board in one verb |
| `npx lyt close [ISS-XXXX]` | Promote to `5-done` after validation — `--dry-run` to preview, no argument to batch-close `4-review/` |
| `npx lyt review [ISS-XXXX]` | Export the cross-model audit prompt, or ingest the returned verdict (`--accept`, `--verdict`) |
| `npx lyt board` | Regenerate BOARD.md from the frontmatters |
| `npx lyt pull-notes` | Repatriate `.lytos/`-only commits from origin/main onto the current branch (`--dry-run` first) |
| `npx lyt lint` | Validate the `.lytos/` structure (usable in CI) |

The rule in the negative: **never edit a `status:` field or move an issue file by hand. If a
transition has no verb, flag it to the human instead of working around it.**

### Issues live where they will be closed

An issue belongs in the repo of the code that will close it — never in the repo that merely
discovered the need. A friction felt here but fixed upstream goes to the upstream repo's board,
with the field case quoted in the issue body. A subject touching two repos becomes two
cross-referenced issues, never one issue straddling both. The overview is the job of
`npx lyt board` (multi-repo mode) — not of centralizing issues in one place.

---

## An Issue Has Two Gates: Ready and Done

An issue is guarded on both ends. **Definition of Ready** is the entry gate — it stops
under-specified work from consuming tokens. **Definition of Done** is the exit gate — it says
what "finished" means, and *who is allowed to say so*.

### Ready — the entry gate

A `## Ready` section states four things: **scope** (one line), **constraints**, **out of scope**
(explicit — this is the one people skip and the one that saves the most), and a `risk:` value in
the frontmatter. `npx lyt lint` flags sprint issues that aren't ready, and `npx lyt next` refuses
to hand one to an agent (reason `not-ready`).

Keep it proportional: on an XS task, Ready is two lines, not a form. The point is to catch
ambiguity before it becomes a wasted session — not to add ceremony. An agent that hits ambiguity
mid-work will park the issue (`npx lyt park ISS-XXXX --reason ambiguous-spec`) rather than guess;
a high rate of `ambiguous-spec` parks is a signal that specification upstream is too thin, not
that the agent is weak.

### Done — the exit gate, and who verifies each item

Every Definition-of-Done item declares **how it is verified**:

| Marker | Meaning | Who can tick it |
|--------|---------|-----------------|
| `— verify: auto` | A machine gate: a test, a typecheck, a lint, a build, a behaviour visible in the diff | The implementer, and any auditor who can re-run it |
| `— verify: human` | A judgment: wording, taste, product intent, "is this readable by a non-technical reader?" | **Only the accountable human** |

An item with no marker defaults to `auto` and is flagged by `npx lyt lint` as unqualified —
write the marker rather than letting the default decide for you.

Three consequences that matter in practice:

1. **Tick as you go.** A cross-model audit reads the unchecked list as the truth. Batching ticks
   at end-of-task silently misses items and burns audit rounds.
2. **An all-`human` DoD is not agent work.** There is no machine gate to prove anything, so
   `npx lyt next` will not hand it to a loop. Do it by hand.
3. **An AI auditor may never tick a `verify: human` item, and must never return `NO_GO` because
   one is empty.** Doing so makes every such issue unpassable — no model may tick it, so it would
   bounce between `3-in-progress` and `4-review` forever. The correct verdict is
   `GO_PENDING_HUMAN`: machine gates green, human judgment handed back, issue stays in
   `4-review/`.

The one thing that marker does **not** do is excuse missing work. If a DoD item promises a
deliverable that simply does not exist — documentation never written, a test case never added —
that is a real defect and a real `NO_GO`, whichever marker it carries. The marker says *who
verifies* the work, not *whether it was done*.

---

## How to Apply These Rules

1. Agents load this file **before each task**
2. Each point is a verifiable criterion — not a vague recommendation
3. A rule violation is flagged as **WARNING** or **CRITICAL** according to the code-review skill
4. Project-specific rules (in a separate file) **complement** these rules, they do not replace them

---

*These rules are the minimum standard. A project can add its own specific rules by creating additional files in this folder.*
