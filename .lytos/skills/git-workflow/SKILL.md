---
name: git-workflow
description: Apply Lytos Git conventions — branch naming, commit message format, merge workflow, and collaboration rules. Use when creating a branch, committing changes, opening a PR, or resolving a workflow conflict or question.
---

# Skill — Git Workflow

*This skill defines the Git conventions to follow on a project using Lytos. It covers branch naming, commit format, merge workflow, and collaboration rules. An agent loaded with this skill applies these conventions without deviation.*

---

## When to invoke this skill

- At each branch creation
- At each commit
- When opening a PR
- In case of conflict or question about the workflow

---

## Workflow models — choose your fit

Lytos does not impose a single workflow. Choose the one that matches your project:

| Model | How it works | Best for |
|-------|-------------|----------|
| **GitHub Flow** | `main` + feature branches. Merge to main, deploy from main. | Most projects, small teams, continuous deployment |
| **Git Flow** | `main` + `dev` + feature branches. Release branches for staging. | Projects with scheduled releases, multiple environments |
| **Trunk-Based** | Everyone commits to `main` (or very short-lived branches). Feature flags for incomplete work. | High-velocity teams, strong CI, DORA top performers |

The rest of this skill uses **GitHub Flow** as the default (main + feature branches). If your project uses Git Flow, add a `dev` branch as the PR target. If trunk-based, skip branches entirely and commit to main behind feature flags.

**DORA research consistently shows**: shorter-lived branches and faster integration correlate with higher team performance. When in doubt, prefer simpler workflows.

---

## Branch naming convention

### Format

```
type/ISS-XXXX-descriptive-slug
```

### Branch types

| Type | Usage | Example |
|------|-------|---------|
| `feat` | New feature | `feat/ISS-0012-add-cart` |
| `fix` | Bug fix | `fix/ISS-0034-login-error` |
| `refactor` | Refactoring with no functional change | `refactor/ISS-0045-extract-auth-service` |
| `chore` | Technical task (config, deps, CI) | `chore/ISS-0050-update-dependencies` |
| `docs` | Documentation only | `docs/ISS-0022-readme-payment-module` |
| `test` | Adding or fixing tests | `test/ISS-0028-unit-tests-tax-calculation` |

### Rules

- Always link to an issue (ISS-XXXX)
- The slug is in kebab-case, in French or English depending on the project
- No branch without an issue — if the work isn't in an issue, create the issue first
- No long-lived branches — one branch = one issue = one defined scope

---

## Commit format

### Format

```
type(scope): short message

Optional body — explanation of the why if needed.

Refs: ISS-XXXX
```

### Examples

```
feat(cart): add tax calculation by country

The tax rate is now dynamically determined based on the
shipping country instead of using a fixed rate.

Refs: ISS-0012
```

```
fix(auth): fix redirect after OAuth login

The OAuth callback was redirecting to /home instead of the
original page stored in session.

Refs: ISS-0034
```

```
chore(deps): update Laravel 11.x to 11.5

Refs: ISS-0050
```

### Commit types

| Type | Description |
|------|-------------|
| `feat` | New user-facing feature |
| `fix` | Bug fix |
| `refactor` | Code change with no behavior modification |
| `chore` | Technical task with no functional impact |
| `docs` | Documentation change only |
| `test` | Adding or modifying tests |
| `style` | Formatting, whitespace, semicolons (no logic change) |
| `perf` | Performance improvement |

### Commit rules

- The short message is **max 72 characters**
- The message is in French or English — consistent with the project
- The verb is in the **infinitive** in French ("ajouter", "corriger") or **imperative** in English ("add", "fix")
- One commit = one logical change. No catch-all commits
- No `WIP` or `temp` in the final history (squash before merge if needed)
- Always reference the issue with `Refs: ISS-XXXX`

---

## Workflow

### The standard cycle

The issue folder represents its status. Move the `.md` file at each step change.

```
1. Create the issue        ->  issue-board/0-icebox/ISS-XXXX-title.md
2. Prioritize              ->  move to 1-backlog/
3. Plan in the sprint      ->  move to 2-sprint/
4. Start work              ->  create branch type/ISS-XXXX-slug
                               move to 3-in-progress/
                               update BOARD.md
5. Develop                 ->  atomic, well-named commits
6. Push                    ->  git push -u origin type/ISS-XXXX-slug
7. Open a PR               ->  target the dev branch (or main depending on the project)
                               move to 4-review/
                               update BOARD.md
8. Code review             ->  via the code-review skill
9. Corrections if needed   ->  additional commits on the branch
10. Merge                  ->  squash & merge, delete the branch
                               if validation is complete: run `lyt close` to promote from 4-review/ to 5-done/
                               update BOARD.md
11. Update the memory      -> if learning occurred
```

> **Rule**: the .md file MUST be moved at each status change.
> The BOARD.md MUST be updated at each move.

### Main branches

| Branch | Role | Who merges |
|--------|------|------------|
| `main` | Production — always stable | Human only |
| `dev` | Integration — default PR target | After approved review |
| `type/ISS-XXXX-*` | Work branch — ephemeral | The PR author |

> **Note**: the `dev` branch is optional. Many successful projects deploy directly from `main` using GitHub Flow. Use `dev` only if you need a staging integration branch.

### Merge rules

- **Never** push directly to `main` or `dev`
- Every change goes through a PR
- A PR must have at least one review (agent or human)
- Conflicts are resolved on the work branch, not on `dev`
- After merge, the branch is deleted

---

## Pull Requests

### PR title

```
[ISS-XXXX] Type: Short description
```

Examples:
- `[ISS-0012] feat: Add tax calculation by country`
- `[ISS-0034] fix: Fix OAuth redirect`

### PR body

```markdown
## Context
Why this PR exists — link to the issue.

## Changes
- List of main modifications
- Not every line changed — the important points

## Tests
- How to verify it works
- Tests added or modified

## Screenshots
(if visual change)
```

### PR checklist

- [ ] Tests pass
- [ ] Code follows the project rules
- [ ] Documentation is up to date
- [ ] Issue is linked
- [ ] Branch is up to date with `dev`

---

## Conflict resolution

1. Switch to the work branch
2. Pull the latest changes from `dev`: `git rebase dev` or `git merge dev`
3. Resolve conflicts file by file
4. Verify that tests pass after resolution
5. Push the updated branch

**Never** resolve a conflict by blindly overwriting changes from the other branch.

---

## Git hooks

Automate quality checks before they reach the PR:

| Hook | What it does | Example tools |
|------|-------------|---------------|
| `pre-commit` | Lint, format, check secrets | Husky, pre-commit (Python), lefthook |
| `commit-msg` | Validate commit message format | commitlint |
| `pre-push` | Run tests before pushing | Custom script |

A basic setup with Husky (JavaScript) or pre-commit (Python):

```bash
# JavaScript — Husky + lint-staged
npx husky init
echo "npx lint-staged" > .husky/pre-commit
```

```yaml
# Python — .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    hooks:
      - id: trailing-whitespace
      - id: check-added-large-files
      - id: detect-private-key
```

Hooks are recommended, not mandatory. But if the project has them, every contributor uses them — no `--no-verify`.

---

## CI checks — required before merge

No PR is merged without CI passing. At minimum:

- [ ] All tests pass (unit + integration + E2E)
- [ ] Linter passes with zero warnings
- [ ] Security audit passes (dependency scan)
- [ ] Build succeeds

Configure branch protection rules to enforce this. A green CI is not a suggestion — it is a gate.

---

## The review loop is not free

A gate you pass ten times costs ten times. Lytos iterates by design — every audit
verdict, every response to a NO_GO, every `lyt move` and `lyt close` writes to
`.lytos/**` — and each of those commits can trigger a full CI run on someone's
bill.

Measured on a real project: one pull request, **three of its five CI runs fired on
commits touching only `.lytos/**`**. At 32 billed minutes per run, that is roughly
96 minutes of CI for editing markdown. The same account exhausted its entire
monthly Actions allowance in five days.

### The invariant

> **The number of CI runs equals the number of code iterations, never the number
> of review rounds.**

A round that finds a code defect deserves a run. A round that finds a wording
problem, a stale frontmatter field or a missing verdict does not — none of them
can change what the CI tests.

### The ordering that holds it

| | step |
|---|---|
| 1 | work locally, and verify locally |
| 2 | **one push**; the PR opens, CI runs **once** |
| 3 | `lyt review` — the branch is on `origin` and green |
| 4 | GO → `lyt close` → fiche commit → merge |

Step 2 satisfies the traceability requirement **for free**: `lyt review`'s
portable prompt needs the branch on `origin` so an independent auditor — a fresh
session, possibly a fresh clone — can fetch it. Putting the push there costs
nothing, instead of fighting the constraint.

**Do not invert it.** Closing on local evidence and opening the PR afterwards is
tempting, and it is wrong wherever your local toolchain is narrower than CI. One
project's workstation ran PHP 8.4 while its matrix tested 7.4 and 8.3 — *neither*
supported version. `lyt close` sets `completed_at` and moves the file to
`5-done`; a red run afterwards leaves a closed fiche and a broken branch.

The review audits an **already-green** branch. It does not trigger CI.

### `paths-ignore` will not save you

The obvious defence does not work:

```yaml
pull_request:
  paths-ignore:
    - '.lytos/**'
```

On `pull_request`, GitHub evaluates path filters against the **whole PR diff**,
not the commit just pushed. A pull request that carries code re-runs everything
on every push, whatever that push touched. The filter only spares pull requests
that are documentation **in their entirety**.

### Skip markers, and what is actually verified

`[skip ci]` in a commit message is judged **per commit**, which is the case at
hand: every commit Lytos causes touches `.lytos/**` and nothing else, so none of
them can change what the CI tests.

Two things were tested rather than assumed, on a public repository whose CI runs
on `push` to `main` and on `pull_request`:

- **on `pull_request` / `synchronize`** — see the measured result recorded in
  ISS-0148 of the Lytos CLI repository;
- **under branch protection**, a required check that never ran can block a merge.
  Verify this against your own protection rules before adopting the marker.

Do not adopt a skip marker on the strength of this paragraph alone. Test it in
your repository, and write down what you saw.

### What not to do

**Do not scaffold a workflow from `lyt init`.** Every project's CI has its own
shape; a method that writes into `.github/workflows` becomes a third place that
diverges from the two you already maintain.

**Do not ask the CLI to warn you.** `lyt` talks to git, never to a forge — there
is no `gh`, no API call, no octokit anywhere in its source. Teaching it to say
"this will re-run CI on PR #12" would mean adding forge coupling, authentication
and network failure modes to a tool that has none. What it *could* tell you from
git alone is whether the current branch carries code at all — and that is the
question that matters.

---

## Semantic versioning

If the project publishes releases (library, API, CLI):

- **MAJOR** (v2.0.0) — breaking changes
- **MINOR** (v1.1.0) — new features, backward compatible
- **PATCH** (v1.0.1) — bug fixes, backward compatible

Tag releases in git: `git tag -a v1.2.0 -m "Release v1.2.0"`

Conventional commits enable automatic changelog generation from commit history (tools: standard-version, release-please, semantic-release).

---

## Checklist before considering the workflow complete

- [ ] The branch follows the naming convention
- [ ] Commits follow the `type(scope): message` format
- [ ] Each commit references the issue
- [ ] The PR is opened with correct title and body
- [ ] Review is requested

---

*This skill is immediately operational. An agent that loads it applies the project's Git conventions without further interpretation.*
