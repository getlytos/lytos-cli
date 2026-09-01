---
id: ISS-0095
title: "`lyt review` audits the branch the fiche declares, not the current tree"
type: feat
priority: P1-high
effort: M
complexity: standard
domain: [cli, review]
skill: 
skills_aux: []
status: 5-done
branch: feat/1.4.0-retour-terrain
depends: []
created: 2026-08-04
updated: 2026-08-10
schema_version: 2
completed_at: 2026-08-10
---
# ISS-0095 — The false "no versioned fix"

## Field feedback (immo, 03/08)

A re-review returned THREE false "no versioned fix since the first audit" verdicts: the fixes had
been pushed — onto branches the fiches did not name — while the audit read the current tree.
Solved in the field by convention (the `branch:` frontmatter says where to audit, with a note in
each fiche); the convention has to become the tool's behaviour.

## The gesture

`lyt review ISS-X --export`: the audit prompt carries the declared branch and instructs the
auditor to verify there (checkout or temporary worktree); when `branch:` is empty, the audit
covers the current tree and SAYS SO. Bonus: warn at export time when the declared branch does not
exist on origin — that is a lying fiche, and it is detectable before the audit is spent.

- [x] The exported prompt carries the branch plus the instruction to move onto it
- [x] Warning when `branch:` is absent or not found on origin
- [x] Tests on the three cases (valid branch, empty, not found)

## Audit — 2026-08-10

**Verdict:** GO

### Checks
- [x] Tests pass (313)
- [x] Issue checklist complete
- [x] Rules respected
- [x] Documentation aligned

### Notes
The exported prompt now identifies the declared branch and gives a safe checkout/worktree instruction. `checkDeclaredBranch` also surfaces unavailable origin refs before an audit is wasted; the three required cases are covered.
