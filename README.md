# Lytos CLI

[![npm](https://img.shields.io/npm/v/lytos-cli)](https://www.npmjs.com/package/lytos-cli)
[![CI](https://github.com/getlytos/lytos-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/getlytos/lytos-cli/actions/workflows/ci.yml)

> The command-line tool for [Lytos](https://lytos.org) — a human-first method for working with AI coding agents.

**[Documentation — lytos.org](https://lytos.org)** · **[The method](https://github.com/getlytos/lytos-method)** · **[Lire en français](./docs/fr/README.md)**

---

## Do you develop with AI?

You switch models. You open a new session. You go from Claude to Codex.
And each time, the same ritual: re-supply the context, repeat the conventions, correct the same drifts.

Meanwhile, the debt sets in. Today's generated code no longer matches yesterday's. Conventions slip. The project grows faster than the AI's ability to find its way in it.

Many have come to accept this friction as normal. It isn't.

**Lytos addresses this by anchoring the context where it belongs: in the repo.**

---

## Who it's for

| Profile | Typical setup | What Lytos brings |
|---|---|---|
| **Vibe-coder / maker** | Claude Code, Codex, AI apps + GitHub | A manifest the AI reads every session. Less re-explaining, a context that compounds. |
| **Developer** | IDE + Git (GitHub / GitLab) + AI as a tool | Versioned rules, a memory that builds, a board that traces the work — in the repo, not in a SaaS. |
| **Team** | IDE + Git + CI + reviews + product ticketing | Shared manifest, skills, rules. The AI produces in the project's style. Technical specs for the AI live in the repo, next to the code. |

---

## Install

```bash
npm install -g lytos-cli
lyt init
```

Or without installing:

```bash
npx lytos-cli init
```

In 2 minutes, your repo has its manifest, rules, and board. From there, the AI knows your project.

### Mixed-team setup: one repo, several AI tools

On a repo where some developers use Claude Code, others Cursor, others Codex, `lyt init` can scaffold every bridge file in one shot:

```bash
lyt init --tool claude,cursor,copilot       # CSV: only what the team uses
lyt init --all-tools                        # every shipping adapter at once
```

Every bridge points at the same `.lytos/` directory, so switching tools does not require reconfiguring the project. `none` is accepted in the list as a no-op, so scripts can pass `"none,claude"` without a special case. Unknown values exit with an error before any file is written.

![Lytos demo](docs/screenshots/lytos.gif)

![lyt board](docs/screenshots/lyt-board.png)

---

## Commands

| Command | What it does |
|---------|-------------|
| `lyt init` | Scaffold `.lytos/` in a project (interactive, detects the stack). On an interactive terminal it asks one optional question — whether you use Claude Design — answered up front with `--design <claude-design\|other\|none>`; see [Optional: a Claude Design register](#optional-a-claude-design-register). Also installs the `lytos-issue` git merge driver (`.gitattributes` + git config): issue fiches merge structurally — frontmatter field by field, body as the ordered union of `##` sections — so two branches appending to the same fiche no longer conflict |
| `lyt board` | Regenerate BOARD.md from issue YAML frontmatter. When the board has epics, an Epics section (each epic, its leaves and their progress, derived from `parent`) joins the terminal view and BOARD.md, and `--json` carries an `epics` key — see [The intent layer](#the-intent-layer) |
| `lyt archive` | Move completed issues from `5-done/` to `archive/<quarter>/` (default: older than 7 days). `--all`, `--older-than <Nd>`, `--dry-run` |
| `lyt lint` | Validate `.lytos/` structure and content — including the `verify:` marker of every Definition-of-Done item (see [Definition-of-Done markers](#definition-of-done-markers)) and the four intent-layer rules, which only warn (see [The intent layer](#the-intent-layer)) |
| `lyt doctor` | Full diagnostic — broken links, stale memory, missing skills, health score. Also flags whatever it could not use of the `independence:` section of `.lytos/config.yml` (see [Reviewer independence](#reviewer-independence)) |
| `lyt show [ISS-XXXX]` | Display issue detail with progress bar, or all in-progress issues. A leaf shows its epic, an epic its leaves and their progress; `--json` adds an `intent` key to a card that takes part in the intent layer |
| `lyt milestone [id]` | Read-only. One milestone, or every milestone, from `.lytos/milestones/<id>.md`: its exit criteria and its epics and leaves, with a progress counted from the cards that name it on every call. `--json` for scripts. See [The intent layer](#the-intent-layer) |
| `lyt start ISS-XXXX` | Start an issue — move to in-progress, create branch, update board. A leaf of an epic still in discovery is refused, unless it is a `spike` or `--discovery-override "<reason>"` is given (see [The intent layer](#the-intent-layer)) |
| `lyt move ISS-XXXX <stage>` | Any other transition (e.g. work done → `4-review`) — status, file move, and board in one atomic verb. Stages owned by a richer verb are refused (`3-in-progress` → `lyt start`, `5-done` → `lyt close`). Entering `2-sprint` is refused for a leaf of an epic still in discovery, unless it is a `spike` or `--discovery-override "<reason>"` is given |
| `lyt claim ISS-XXXX` | Assign an issue to yourself and move it to in-progress (multi-user). `lyt unclaim` releases it back to the sprint. Refuses a leaf of an epic still in discovery |
| `lyt journal` | Derived logbook — the *why* of closed issues, chronological, grouped by month, linked back to each fiche. `--write` regenerates `.lytos/JOURNAL.md`, gitignored like BOARD.md. `--json` for the App |
| `lyt exchanges` | Read-only. The open design exchanges between design and code, one line per entry, derived from `.lytos/design/exchanges/` on every call (`--json` for scripts). For `design: claude-design` projects; see [Optional: a Claude Design register](#optional-a-claude-design-register) |
| `lyt pull-notes` | Cherry-pick (`-x`) the `.lytos/`-only commits of `origin/main` missing from HEAD onto the current branch — notes captured on main rejoin the branch board. Mixed commits (code + `.lytos/`) are refused and listed. `--dry-run` previews |
| `lyt close ISS-XXXX` | Close one issue — promote to `5-done` from `4-review` (or explicitly from in-progress), warns about unchecked items |
| `lyt close` | Batch-close every issue in 4-review/ → 5-done/ (asks to confirm; `--yes` skips the prompt; `--dry-run` previews) |
| `lyt review [ISS-XXXX]` | Cross-model audit for issues in `4-review/` — prints a self-contained prompt or ingests a returned audit block (`--accept`). The prompt targets the branch declared by the issue's `branch:` field (and instructs the auditor to check it out); the export warns when `branch:` is empty or missing on origin. Run from a **fresh AI session**, ideally a different vendor than the implementer. Three verdicts: `GO`, `NO_GO`, and `GO_PENDING_HUMAN` — the last one for when every machine gate is green but `verify: human` items remain, which no model may tick. `--verdict` is refused when the review is less independent than the card's `risk` requires, and `--countersign` records the owner's countersignature (see [Reviewer independence](#reviewer-independence)) |
| `lyt migrate-frontmatter` | Backfill schema v2 fields (`schema_version`, lifecycle dates) on existing issues. Dry-run by default |
| `lyt absorb` | Merge the AI-wrapper session journal into an issue's audit fields (cost, model, tokens). Dry-run by default |
| `lyt upgrade` | Pull the latest method files into `.lytos/`. What is yours is never written: `quality/kit.md` and `stack.md` (linked to your stack — it only names the bundled gates your kit lacks), the design register, the config, the manifest. New rubrics and checklists are added but a modified one is never overwritten, even with `--force`. The design exchanges guide is added to a `design: claude-design` project and, once written, is yours too. With the Claude Code bridge, it also adds the missing skill pointers in `.claude/skills/` and rewrites the ones that drifted. It never rewrites a bridge file. It names each one that has no `<!-- lytos:task-skills -->` line, which the generated "Task skills" section carries, and prints that section. A bridge that already gives the order in its own words only needs the line, alone on its line. `--migrate-cursor` converts a legacy `.cursorrules` to `.cursor/rules/lytos.mdc`. |
| `lyt update` | Update lytos-cli to the latest version |

### Loop primitives

The CLI exposes decidable primitives; the wrapper or the App orchestrates them. Each is read-only unless stated.

| Command | What it does |
|---------|-------------|
| `lyt next` | The next loop-eligible issue in the sprint — status workable, dependencies satisfied, Definition of Ready met, and a DoD carrying at least one machine-verifiable item (`verify: auto` — a `reviewer` ruling is a model's judgment, not a gate). Refuses **and explains** when nothing qualifies; `--json` gives each blocked issue a `reason`: `deps-pending`, `no-dod`, `all-human-dod`, `no-machine-dod` (no `auto` item but `reviewer` items present), `not-ready`, `epic-in-discovery` (the parent epic is not frozen yet) |
| `lyt park ISS-XXXX --reason <code>` | Halt instead of guessing: park an issue out of the flow with a reason from a closed taxonomy (`ambiguous-spec`, `missing-dependency`, `gate-failed`, `budget-exhausted`, `human-judgment-required`, `external-blocker`). `lyt unpark` resumes it (refused for a leaf of an epic still in discovery) |
| `lyt budget` | Aggregate pipeline cost against a ceiling (`--max-usd`, `--max-issues`, or `budget:` in `sprint.md`). Exits non-zero when breached — a stop condition a `while` loop or CI can read |
| `lyt gates [ISS-XXXX]` | The gates mandatory at an issue's `risk` level, resolved from the project's quality kit. Rigor follows blast radius: `low` gets the floor plus `cost-review` (the one deliberate exception, see ADR-0007), `high` gets everything. It also shows the minimum reviewer independence of the risk and, for one issue, the level of its review (see [Reviewer independence](#reviewer-independence)) |
| `lyt report ISS-XXXX` | The review packet for one issue — diff, gate evidence, parks, pending reviewer rulings, human checklist, auditor verdict, audit trail. Laid out **doubt-first**: what needs deciding sits above what is already green. `--sprint` aggregates the whole sprint. The packet shows how independent the review was, and flags what is below the minimum for the card's `risk` |

The `reference-loop` skill (`.lytos/skills/reference-loop/SKILL.md`, installed like the other task skills) chains these primitives for an agent: select with `lyt next`, start the card, build, prove with `lyt gates`, hand over with `lyt report`, park instead of guessing, and stop to call the human in five cases. It never closes a card, and the CLI itself runs no loop and calls no AI.

![lyt show](docs/screenshots/lyt-show.png)

---

## What `lyt init` generates

```
project/
└── .lytos/
    ├── manifest.md              # Intent — project identity and constraints
    ├── LYTOS.md                 # Method reference
    ├── config.yml               # Language, profile and design preferences
    ├── skills/                  # Design — Lytos protocol + agentskills.io task skills
    │   ├── session-start.md     # Lytos bootstrap protocol (flat)
    │   ├── code-structure/SKILL.md
    │   ├── code-review/SKILL.md
    │   ├── testing/SKILL.md
    │   ├── documentation/SKILL.md
    │   ├── git-workflow/SKILL.md
    │   ├── deployment/SKILL.md
    │   ├── security/SKILL.md
    │   ├── api-design/SKILL.md
    │   └── reference-loop/SKILL.md  # 9 task skills (agentskills.io format)
    ├── rules/                   # Standards — quality criteria
    │   ├── default-rules.md
    │   └── team-and-loop.md     # The roles of a team and the loop between the owner's two gates
    ├── quality/                 # Standards made executable
    │   ├── kit.md               # Gate catalog: machine gates, model reviews, human calls — by risk
    │   ├── stack.md             # Stack contract
    │   ├── rubrics/             # The grids a reviewer follows (FORMAT.md + 8 grids)
    │   └── checklists/          # The lists a person works through (4)
    ├── issue-board/             # Progress — kanban board
    │   ├── BOARD.md
    │   ├── 0-icebox/
    │   ├── 1-backlog/
    │   ├── 2-sprint/
    │   ├── 3-in-progress/
    │   ├── 4-review/
    │   ├── 5-done/
    │   └── templates/           # Task, feature and epic card templates
    ├── memory/                  # Memory — accumulated knowledge
    │   ├── MEMORY.md
    │   └── cortex/
    └── templates/               # Sprint and milestone templates
```

`lyt init` also detects the project's stack (language, framework, test runner, package manager) and pre-fills the manifest. It generates the appropriate adapter file for the chosen AI tool — `CLAUDE.md`, `.cursor/rules/lytos.mdc`, `AGENTS.md`, `.github/copilot-instructions.md`, `GEMINI.md`, or `.windsurfrules`.

Task skills live in `.lytos/skills/<name>/SKILL.md`. No tool is assumed to load that folder on its own, so every adapter file orders the agent to read the skills that apply. Claude Code loads project skills from `.claude/skills/`: with `--tool claude`, `lyt init` also writes one pointer per task skill, `.claude/skills/lytos-<name>/SKILL.md`, including the skills you add yourself (run `lyt upgrade` after adding one). A pointer holds the description and sends the agent to the source file, which stays the only place a skill is written. The `lytos-` prefix keeps Claude Code's own commands, such as `/code-review`, in place. Commit the pointers: if git ignores them, a fresh clone, a worktree or a cloud session will not have them, and the CLI warns you.

A pre-commit hook is installed to enforce branch naming conventions (`type/ISS-XXXX-slug`). This prevents untracked work on `main` — regardless of which AI tool or model is used.

### Startup depth — lightweight vs standard

The `session-start` skill reads the current issue's frontmatter to decide how much context the AI loads before starting.

- **Lightweight startup** is allowed only when the issue is explicitly `effort: XS` **and** `complexity: light`. The AI still loads the mandatory safety baseline (manifest, MEMORY, default rules, BOARD, the issue itself), but defers cortex notes, project-specific rule files, and broad codebase exploration until the issue clearly needs them.
- **Standard startup** remains mandatory for every other combination. If either field is missing, the AI defaults to standard. If the task grows mid-session, it immediately upgrades from lightweight to standard.

This is how small issues stay fast without burning the context window, and why `effort` and `complexity` in issue frontmatter are load-bearing — they are not just prioritization hints.

### Customized bridge files are preserved

Running `lyt init --force` on an existing project re-scaffolds `.lytos/` without overwriting any local customization you added to your AI bridge file (`CLAUDE.md`, `.cursor/rules/lytos.mdc`, `AGENTS.md`, `.github/copilot-instructions.md`, `GEMINI.md`, `.windsurfrules`). If the bridge already exists, it is kept as-is and the CLI prints a warning so you know it was skipped.

To explicitly replace a bridge with the bundled template — useful when upstreaming a new default or when your local copy has drifted — pass `--overwrite-bridges`:

```bash
lyt init --force                          # re-scaffold, preserve bridges (default)
lyt init --force --overwrite-bridges      # re-scaffold, replace bridges too
```

### Optional: a Claude Design register

`lyt init` asks **one** optional question, only on an interactive terminal outside CI: *Do you use Claude Design for design?* — `yes`, `no` or `other tool`; Enter means no. `--design <claude-design|other|none>` answers it up front. With no terminal (a pipe, CI, `--yes`) there is no prompt and the answer is `none`.

The answer is recorded in `.lytos/config.yml` as `design:`. Only `claude-design` creates anything: `.lytos/design/registry.md`, a register of your Claude Design artifacts — links, current version, which cards cover which version, the gaps handed back to the design tool — and `.lytos/design/exchanges/README.md`, the guide to the design exchanges. An existing register or guide is never overwritten, not even by `init --force`.

A design exchange is one small file per turn between design and code, `.lytos/design/exchanges/<epic>/NNN-<slug>.md`: a `from` (`design` or `code`), a `type` (`gap`, `prompt`, `response` or `decision`) and a `status` (`open` or `resolved`), in at most 150 words. `lyt exchanges` lists the open ones, derived on every call: no index file exists, and an entry leaves the list when you set `status: resolved`. A malformed entry is reported, never dropped, and the command exits 1. `lyt upgrade` adds the guide to a `claude-design` project that lacks it.

It is never a brake: `none` and `other` generate nothing, `lyt doctor` and `lyt lint` say nothing about design, no gate depends on it, and `lyt exchanges` only says that exchanges are not in use.

### Definition-of-Done markers

Every Definition-of-Done item says **who verifies it** with a trailing marker, and `lyt lint` flags the items that do not:

| Marker | Verified by | Counts as machine-verifiable (loop-eligible)? |
|--------|-------------|----------------------------------------------|
| `— verify: auto` | A command that exits non-zero (test, typecheck, lint, build) | Yes |
| `— verify: reviewer` | The auditing model, against a written rubric | No |
| `— verify: human` | A person, because nothing else can | No |

Each marker may pin the quality-kit line that carries it: `verify: auto:tests-unit`, `verify: reviewer:over-engineering`, `verify: human:product-intent`. A pin is the id of a kit line (first column of `quality/kit.md`), not the name of a rubric or a checklist file; `lyt doctor` flags a pin the kit does not have. An unmarked item counts as `auto` and is flagged by `lyt lint`. A DoD with no `auto` (or unmarked) item is not loop work.

`verify: human` is the last resort: legitimate only when an end-to-end tester could not check the item itself, in a browser or with Playwright — otherwise it is `verify: auto:e2e`. A human item always carries a pin naming a `human` line of the kit, and `lyt lint` **warns** (never errors) on one that does not.

### The intent layer

A card says what to build; the level above says why. Three levels, never more: a **milestone** (a version, with exit criteria), an **epic** (the intent card, `type: epic`) and a **leaf** (a card the size of one loop iteration). Every field is optional and `schema_version` stays 2: a project that adopts none of it changes nothing.

| Field | Goes on | Meaning |
|-------|---------|---------|
| `parent: ISS-XXXX` | a leaf | The epic it belongs to |
| `milestone: <id>` | an epic or a leaf | A file `.lytos/milestones/<id>.md`: `id`, `title`, `status: open\|closed`, and an `## Exit criteria` checklist |
| `phase: discovery\|frozen` | an epic | `discovery`: the intent is still being settled |

Children and progress are **derived** from the `parent` fields on every call, never written by hand: `lyt board` (an Epics section), `lyt show` and `lyt milestone`. `lyt lint` warns (never errors) when a `parent` is not one card id pointing at an existing epic, when the depth would exceed two (an epic has no parent), when a `phase` sits on a card that is not an epic or is not `discovery` or `frozen`, and when a `milestone` has no file under `.lytos/milestones/`.

**The discovery gate.** While an epic is in `phase: discovery`, its leaves cannot enter the sprint: `lyt move … 2-sprint`, `lyt start`, `lyt claim` and `lyt unpark` refuse them and name the epic, and `lyt next` skips them (reason `epic-in-discovery` in `--json`). Two exemptions: a leaf of `type: spike` (a feasibility study or a measurement), and `--discovery-override "<reason>"` on `lyt move` or `lyt start`, which lets one leaf through on the accountable human's word and records the reason in the card as `discovery_override`. A card with no parent epic is not concerned. A human freezes the epic by setting `phase: frozen`; the freeze checklist is in `rules/default-rules.md`, and the templates are `issue-board/templates/issue-epic.md` and `templates/milestone.md`.

### Reviewer independence

A review by the model that wrote the work shares its blind spots, so Lytos measures how independent each review was and asks for more where the risk is higher. The level is **computed** from `ai_implementer` and `ai_reviewer` (a model and a session each; `lyt review --ai-model` and `--ai-session` record the reviewer), never declared:

| Level | The reviewer is |
|-------|-----------------|
| 1 | A different provider |
| 2 | The same provider, with a model the configured ranking puts above the implementer's |
| 3 | The same model: "weak independence" |

Whatever cannot be established counts as level 3 and is said so: a missing model, a model whose provider is unknown, a model absent from the ranking (it is never treated as stronger). The minimum depends on the card's `risk`: `low` any reviewer, `medium` a different model or a fresh session, `high` level 1 or 2. `lyt report` and `lyt gates` show the level and the minimum, and `lyt review` announces the level when it records a verdict. Below the minimum, `lyt review --verdict go` (or `go-pending-human`) is recorded and flagged at `medium`, and **refused at `high` until the owner adds `--countersign`**, which records who, when and "weak independence" in the card's `review_independence` block. A `no-go` is always recordable.

The defaults are a floor you can tighten, never loosen, under `independence:` in `.lytos/config.yml` (a looser value is ignored and reported by `lyt doctor`):

```yaml
independence:
  ranking: [model-a, model-b]   # exact model ids, weakest first
  providers:                    # model-id prefix: provider, added to the built-in table
    acme: acme-ai
  minimum:                      # per risk: any | fresh-session | level-2 | level-1
    high: level-1
  below_minimum:                # per risk: warn | countersign | refuse
    medium: countersign
    high: refuse
```

Defaults: `minimum` is `any`, `fresh-session` and `level-2`, and `below_minimum` is `warn`, `warn` and `countersign`, for `low`, `medium` and `high`. Lytos ships **no model ranking**: ranking models is a claim about quality only the project can make, so without one two models of the same provider are level 3.

---

## Works with any AI tool

| Tool | What `lyt init` generates |
|------|--------------------------|
| **Claude Code** | `CLAUDE.md` at project root, plus `.claude/skills/lytos-*/` pointers |
| **Cursor** | `.cursor/rules/lytos.mdc` (modern Cursor rule with YAML front-matter) |
| **Codex (OpenAI)** | `AGENTS.md` at project root |
| **GitHub Copilot** | `.github/copilot-instructions.md` |
| **Gemini CLI** | `GEMINI.md` at project root |
| **Windsurf** | `.windsurfrules` at project root |
| **Others** | The `.lytos/` directory is plain Markdown — any LLM can read it |

> *"Choose your AI. Don't belong to it."*

---

## Design principles

- **Offline-first** — `lyt lint`, `lyt doctor`, `lyt board`, `lyt show`, `lyt start`, `lyt move`, `lyt close` never need network
- **Zero lock-in** — plain Markdown files, portable across any AI tool
- **No telemetry** — no tracking, no analytics, ever. Opt-out for update check: `LYT_NO_UPDATE_CHECK=1`
- **Human-first** — the human defines the method, the AI follows it
- **Fail with context** — when something is wrong, the CLI says what, where, and how to fix it

![lyt lint](docs/screenshots/lyt-lint.png)
![lyt doctor](docs/screenshots/lyt-doctor.png)

---

## Built with Lytos

This CLI is developed using Lytos itself. The `.lytos/` directory in this repository contains the real manifest, sprint, issues, and memory — not templates. Every feature was tracked as an issue, started with `lyt start`, and closed with `lyt close`.

[Browse the issue board →](.lytos/issue-board/BOARD.md)

---

## Links

- **Documentation** — [lytos.org](https://lytos.org)
- **Tutorial** — [lytos-learn](https://github.com/getlytos/lytos-learn) — learn by doing in 7 steps
- **The method** — [github.com/getlytos/lytos-method](https://github.com/getlytos/lytos-method)
- **npm** — [npmjs.com/package/lytos-cli](https://www.npmjs.com/package/lytos-cli)

---

## Author

Created by **Frederic Galliné**

- GitHub: [@FredericGalline](https://github.com/FredericGalline)
- X: [@fred](https://x.com/fred)

---

## License

MIT — see [LICENSE](./LICENSE)

---

## Star history

[![Star History Chart](https://api.star-history.com/svg?repos=getlytos/lytos-cli,getlytos/lytos-method&type=Date)](https://www.star-history.com/#getlytos/lytos-cli&getlytos/lytos-method&Date)
