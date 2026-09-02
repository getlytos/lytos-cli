---
id: ISS-0086
title: "Flaky: claim.test.ts 'aborts when local main is behind origin' (5s timeout)"
type: fix
priority: P2-normal
effort: S
complexity: standard
domain: [tests, cli, git]
skill: ""
skills_aux: []
status: 1-backlog
branch: "fix/ISS-0086-flaky-claim-behind-origin-test"
depends: []
created: 2026-06-14
updated: 2026-06-14
schema_version: 2
---

# ISS-0086 — Flaky: claim.test.ts 'aborts when local main is behind origin'

## Context

Sprint #03 review: the only failure in the full suite, and it is intermittent. `tests/commands/claim.test.ts > 'aborts when local main is behind origin'` exceeds the 5s timeout; it passes in isolation (~1.7s). A non-deterministic git/network test, unrelated to the cloud branch's code. A flaky test that is supposed to prove a behaviour must not depend on the network (cf. default-rules: "the test must prove the bug doesn't come back").

## Proposed solution

Make the test deterministic: mock the git/network access (the behind-origin state) rather than depending on a real call; adjust or control the timeout if needed.

## Definition of done

- [ ] The test no longer depends on a real network call (git dependency injected or mocked).
- [ ] Stable across 10 consecutive runs of the full suite.

## Second instance — 2026-09-02

The flakiness is broader than the one test this fiche names. On `main` after the sprint's five
merges, three consecutive full runs of `npm test` gave **1, then 3, then 2 failures out of 393** —
and the failures were in `tests/commands/pull-notes.test.ts`, not in `claim.test.ts`:

```
run 1 : 1 failed | 392 passed
run 2 : 3 failed | 390 passed
run 3 : 2 failed | 391 passed
```

`npx vitest run tests/commands/pull-notes.test.ts` in isolation: **8 passed**, every time. CI was
green on Node 20 and 22 for all five pull requests.

So the shared cause is not one test's 5-second timeout: it is that several suites drive real `git`
in temporary directories, under vitest's parallelism, on a machine where those operations are
slower or contended. The fiche's scope should widen from "fix this timeout" to "make the
git-driving suites deterministic under parallel load" — serialise them, or give the git fixtures a
budget that does not depend on machine load.

Worth flagging for what it costs: a suite that fails differently on each run teaches the reader to
re-run rather than to read, which is exactly how a real regression gets waved through.
