---
id: ISS-0144
title: "The audit stops on a metadata field, not on the work — `branch:` goes stale by design"
type: fix
priority: P1-high
effort: S
complexity: standard
domain: [cli, method]
skill: 
skills_aux: []
status: 4-review
branch: 
depends: []
created: 2026-08-31
schema_version: 2
risk: low
updated: 2026-08-31
assignee: fredericgalline
started_at: 2026-08-31
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

## Premise corrected — 2026-08-31

**This fiche was opened on a wrong diagnosis, and the investigation before writing code found it.**

It claimed `auditTarget()` blocks on the declared branch while `refsContainingAll()` — three
functions above it — already computes the answer unused. That is false. Commit `658ab48`
("the tree the auditor tests must contain the diff they read", merged 14:07 today) added exactly
that fallback: on divergence the packet already names the missing commits, offers a ref that holds
them all, and tells the auditor to audit there.

The chronology settles it:

| Time | Event |
|---|---|
| 12:37 | packets exported for ISS-0107/0114/0115/0124 — **before** `658ab48` reached `main` |
| 14:07 | `658ab48` merged: the diverged fallback exists |
| 19:33 | `c1409d8` lands on a second branch, making ISS-0141's fiche stale |
| ~21:00 | ISS-0141 audited — the packet **did** render the diverged block and point at `main` |

So the four `[CRITICAL]` verdicts of 12:37 were the tool genuinely lacking a fallback, and
`658ab48` fixed that. ISS-0141 at 21:00 is a different animal: the fallback worked, the auditor
was correctly redirected, **and the audit still came back NO_GO.**

## The actual defect — the packet grades a metadata wart as a defect of the work

The diverged block ends like this:

> Either way, **report the stale `branch:` field itself** — the fiche is lying about where its
> work lives.

That sentence orders a report, calls the fiche a liar, and says nothing about weight. An auditor
reading it has no basis for treating a board-hygiene wart differently from a defect in the code,
and the language pushes hard the other way. ISS-0141 came back NO_GO on a field, with every check
green on the substitute ref the packet itself had chosen.

The cost is the point. An audit round is a cross-model pass over a whole packet. Spending one to
learn that a string in the frontmatter is out of date — **after** the tool has already routed
around it and verified the work elsewhere — is the most expensive possible way to discover it. And
the implementer's response is to edit metadata, which produces a new commit, on a new branch,
which makes the field stale again. ISS-0141 went round that loop twice.

The asymmetry to encode: **the field is stale** is a board-hygiene observation when a substitute
ref holds every commit; **no ref holds them all** is a blocking defect, because then the work
genuinely cannot be audited as exported. The current wording collapses both into one instruction.

## Why the field goes stale in the first place

`branch:` holds one value for work that legitimately spans several: the delivery, then the audit
response, then the fix to the metadata itself. Each lands on its own branch, because the project's
git-workflow rule asks for that. The field is correct when written and wrong two commits later, and
nothing updates it. `review.ts` says so itself — *"a fiche routinely declares one branch while its
fixes land on another"* — and ISS-0133 already drew the right conclusion for the **diff** by
scoping on `Refs: ISS-XXXX` across all refs.

This issue does not try to keep the field accurate. It accepts that it cannot be, and fixes what
that costs.

## Ready

- **Scope** — in the diverged branch of `renderWhereToAudit()`, split the closing instruction in
  two: when a substitute ref contains every commit, the stale field is reported as board hygiene
  and **must not by itself produce NO_GO**; when no ref contains them, it stays blocking and says
  so.
- **Constraints** — a fiche declaring a branch that exists nowhere must still be reported as a
  defect; the redirection behaviour and the checkout fences of `658ab48` are untouched. No change
  to `auditTarget()`'s classification — this is what the packet *says* about it, not what it
  computes.
- **Out of scope** — auto-writing `branch:` (a field the tool rewrites is a field nobody reads),
  the verdict taxonomy itself, and the `--all` export freshness question.
- `risk: low` — packet wording only; no published artifact, no board mutation, no gate change.

## Definition of done

- [x] With a substitute ref available, the packet states the stale field is board hygiene and not on its own a NO_GO — verify: auto
- [x] With no ref containing every commit, the packet still states the case is blocking — verify: auto
- [x] The redirection, the candidate list and the checkout fences of `658ab48` are unchanged — verify: auto
- [x] A regression covers both branches, built on the ISS-0141 shape (commits split across two merged branches) — verify: auto
- [ ] Is the distinction phrased clearly enough that an auditor acts on it — verify: human

## Notes

- ISS-0141's own resolution was to declare `branch: main`, the only ref containing all of its
  commits. That works once everything is merged, and it is what a fiche should say at that point —
  but it was applied by hand, after a round had already been spent.
- Related: ISS-0133 fixed the diff half of this problem on the same join key, `Refs: ISS-XXXX`.
- Related: ISS-0137 — the waiver. Same family: what the board does with a red signal an issue does
  not own.

## Delivered — 2026-08-31

One sentence of packet wording, split in two by whether the work is reachable.

```
substitute ref found → "Weigh it as board hygiene, not as a defect in the work. […]
                        A stale `branch:` field is not on its own a reason to
                        return NO_GO — record it in your Notes, and rule on the code."
no ref holds them all → "This one is blocking: with no ref holding every commit, the
                        work cannot be audited as exported."
```

The redirection, the candidate list and the checkout fences from `658ab48` are untouched — the
diff is the closing paragraph and a new `weight` branch. `auditTarget()` is not modified at all:
this changes what the packet *says* about a divergence, never what it computes.

Two regressions in `tests/commands/review.test.ts`, built on the two real shapes:

- **ISS-0141's shape** — delivery on one branch, audit response on a second built from it, `branch:`
  still naming the first. Asserts the hygiene wording appears and the blocking wording does not.
- **The genuinely unauditable shape** — two commits on two branches that never meet, so no ref holds
  both. Asserts the blocking wording appears and the hygiene wording never leaks into it.

358 tests green; format, lint, typecheck and secrets scan clean.

The remaining item is human by design: whether the distinction is phrased clearly enough that an
auditor acts on it. The evidence for that arrives the next time a fiche goes stale — which, given
that this issue argues the field cannot stay accurate, will not take long.
