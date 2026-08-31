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
