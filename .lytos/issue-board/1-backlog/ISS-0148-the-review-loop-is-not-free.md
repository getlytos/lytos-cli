---
id: ISS-0148
title: "The review loop is not free — every verdict is a CI run on someone's bill"
type: docs
priority: P1-high
effort: M
complexity: standard
domain: [method, ci]
skill: 
skills_aux: []
status: 1-backlog
branch: 
depends: []
created: 2026-09-05
schema_version: 2
risk: low
---

# ISS-0148 — Every verdict is a CI run

## Context — measured, on a real bill

A project using Lytos exhausted its **entire monthly GitHub Actions allowance in
five days**. 3 000 minutes, CI halted for the rest of the month.

Lytos is not the cause — that project's CI fans out to 26 jobs, and GitHub bills
each one rounded up to the minute. But Lytos is a **measurable share** of it, and
the share is structural rather than accidental.

On one pull request, **three of its five CI runs fired on commits touching only
`.lytos/**`** — audit verdicts, a NO_GO response, a status move. At 32 billed
minutes per run, that is roughly **96 minutes of CI for editing markdown**.

## Why it happens, and why it is not a misconfiguration

The project had done the obvious thing:

```yaml
pull_request:
  paths-ignore:
    - '.lytos/**'
```

It does not help. On `pull_request`, GitHub evaluates path filters against the
**whole PR diff**, not the commit just pushed. A PR that contains code re-runs
everything on every push, whatever that push touched. The filter only spares PRs
that are documentation *in their entirety*.

## The part that belongs to the method

Lytos **generates** documentation commits on code branches, by construction:

- an audit writes its verdict into the fiche;
- the response to a NO_GO is written into the same fiche;
- `lyt move` and `lyt close` rewrite the frontmatter and relocate the file.

All of it lands on the delivery branch, because that is where the fiche must
live. And the loop **iterates**: the issue behind this fiche went through four
NO_GO rounds. Each round is a verdict commit, a response commit and a status
move — up to three full CI runs for **zero lines of code changed**.

> The method's CI cost is proportional to the number of review rounds, and its
> value comes precisely from doing many of them.

### The tension is real, and it does not have a clean fix

Traceability requires the fiche and the code on the **same branch** — ISS-0147
documents three review cycles burned on exactly that requirement. And that is
what makes every fiche edit re-run the code CI.

**The two are the same coin.** Separate them and traceability breaks; keep them
together and every verdict is billed. This is arbitrated and documented, not
solved.

## What can actually be done

### 1. `[skip ci]` on fiche-only commits — the direct answer

GitHub natively skips a workflow run when the head commit message contains
`[skip ci]` (or `[ci skip]`, `[no ci]`, `[skip actions]`). Unlike `paths-ignore`,
this is judged **per commit**, not against the PR diff — which is exactly the
case at hand.

Every commit Lytos causes touches `.lytos/**` and nothing else, by construction.
A verdict, a response, a `lyt move`: none of them can change what the CI tests.

The PR keeps the check results of the last code push, which is correct — the code
did not change, so the verdict still holds.

**To settle before recommending it:** whether skip markers apply to the
`pull_request` event as reliably as to `push` (verify, do not assume); and what
happens under branch protection, where a required check that never ran may block
the merge. Both are testable in an afternoon, and neither is guessable.

### 2. Push once per round, not once per edit

The review loop is **local**. What forces a push is `lyt review`'s portable
prompt: an auditor that is a fresh session — possibly a fresh clone — must be
able to fetch the branch.

That justifies one push per review round. It does not justify one per fiche edit,
which is what the incident showed: three pushes where one would have done. If the
audit runs on the same machine and the same tree, even that is arguable — the
branch only has to reach `origin` before the audit that must be reproducible.

This is guidance, not tooling: the method should say it, since nothing in the
commands implies it.

### 3. Say it in `git-workflow`

`method/skills/git-workflow/SKILL.md:260-269` has a section *"CI checks —
required before merge"*, ending on *"A green CI is not a suggestion — it is a
gate."* True, and it says nothing about **when** CI should run, or what the
method's own loop costs.

That section is where this belongs: the mechanism, the per-round cost, and the
two remedies above.

## What this fiche does NOT propose

**Shipping a workflow from `lyt init`.** Every project's CI has its own shape;
a method that writes into `.github/workflows` becomes a third place that
diverges. Document the pattern, do not generate it.

## An open design question

`lyt` knows it is writing a fiche. It may or may not know that the branch also
carries code, and whether a pull request is open on it. If it does, one line at
`lyt move` / `lyt close` — *"this fiche edit will re-run CI on PR #N"* — would
teach the pattern at the moment it costs money, without imposing anything.

Worth checking before promising: it depends on context the commands may not have.

## Definition of done

- [ ] `git-workflow` states what the review loop costs, and when CI should run — verify: human
- [ ] The `paths-ignore` trap on `pull_request` is documented with its mechanism — verify: human
- [ ] Skip markers are **tested** on `push` and `pull_request`, and under branch protection, before being recommended — verify: auto
- [ ] The push-per-round guidance is written, with the portable-prompt reason that justifies it — verify: human
- [ ] Whether `lyt` can warn is answered from the code, not assumed — verify: human
- [ ] No workflow file is scaffolded by `lyt init` — verify: auto

## Notes

Filed from the same incident as [ISS-0147](ISS-0147-on-origin-is-read-from-the-local-cache.md).
Four expensive review rounds produced three documented defects — two here, one
there. That is a decent yield for the method, and an argument for making its
loop cheaper rather than shorter.
