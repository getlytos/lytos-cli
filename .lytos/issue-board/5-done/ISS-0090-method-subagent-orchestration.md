---
id: ISS-0090
title: Method — subagent orchestration by complexity (release 1.3.0)
type: docs
priority: P1-high
effort: XS
complexity: light
domain: [method, release, npm]
skill: documentation
status: 5-done
branch: main
depends: []
created: 2026-07-07
updated: 2026-07-08
schema_version: 2
assignee: fredericgalline
ai_implementer:
  model: claude-fable-5
  session: claude-code-vscode-2026-07-07
  prompt_ref: method/skills/session-start.md
skills_used: [documentation]
completed_at: 2026-07-08
---
# ISS-0090 — Method: subagent orchestration by complexity

## Context

`skills/session-start.md` ("The appropriate model") stated that *"most tools today don't let the agent switch models on its own"* and promised that the step would become automatic *"when orchestration tools support automatic model switching"*. That future arrived: Claude Code's `Agent` tool accepts a per-subagent `model` parameter. The skill was outdated on this exact point.

## Proposed solution

Rewrite the section as two distinct cases, keeping the human in control of the session model and making the manifest table the driver for delegation:

1. **Main session model** — unchanged: the agent recommends, the human decides (`/model`).
2. **Delegated subagents** — the agent applies the manifest "AI models by complexity" table automatically: complexity rated **per delegated subtask** (not per issue), mapped to the tool's model aliases, with three guard rails:
   - *when in doubt, inherit* the session model — never force a smaller model on quality-critical work;
   - *the prompt compensates for the power gap* — tight brief (scope, files, output format, what NOT to do); delegate the execution, never the decision;
   - *escalate on failure, don't patch* — re-run one level up (`light` → `standard` → `heavy`) instead of repairing a cheap subagent's output.

Also mention the behavior in `LYTOS.md` ("AI models by complexity") so it is discoverable at project setup.

Ship as `lytos-cli` **1.3.0** (minor: behavior change in the method, backward-compatible).

## Definition of done

- [x] `method/skills/session-start.md` — "The appropriate model" rewritten (two cases + guard rails)
- [x] `method/LYTOS.md` — setup section mentions automatic subagent model selection
- [x] **Model-guidance section** in sync across all copies: `lytos-cli` (method/ + .lytos/ + dist via build), `lytos-method` (skills/ + dogfood + starter session-start model section + 3× `LYTOS.md`, completed after audit #1 caught the gap), `life-memory-app/.lytos/`. The broader pre-existing `starter/` divergence (mid-session section, completion wording — predates this issue) is out of scope here and tracked in [[ISS-0092]].
- [x] `package.json` + `package-lock.json` version is `1.3.0`
- [x] `npm run build` passes
- [x] `npm test` green (205/206 — single failure = pre-existing flaky `claim.test.ts` git-timeout, [[ISS-0086]], passes in isolation 9/9; same acceptance criterion as release 1.2.0, [[ISS-0089]]. Note for sandboxed auditors: the git-fixture tests may time out in a restricted sandbox — weigh against the evidence above rather than re-running blind.)
- [x] `npm pack --dry-run` clean (method files shipped in `dist/method/`)
- [x] `git tag v1.3.0` + `npm publish` (human) — *published 2026-07-08, npm registry at 1.3.0*

## Notes

Follow-up idea captured separately: [[ISS-0091]] — cost feedback loop to validate the manifest model table with real session-journal data.

**Human waiver — `branch: main`** (Fred, 2026-07-07): the direct-`main` docs/release commits are explicitly accepted for this issue, same precedent as the [[ISS-0089]] release commits. Waiver recorded in response to audits #1 and #2; future method changes go through a dedicated issue branch.

## Audit #1 — 2026-07-07 (Codex gpt-5.5, `codex exec`, workspace-write)

**Verdict:** NO_GO

### Notes
Reviewed `origin/main...HEAD` because the issue frontmatter declares `branch: main` and `main...main` is empty. The local method files and `dist/method/` contain the requested session-start and LYTOS text, and `package.json`/`package-lock.json` are at `1.3.0`. `npm run build` passed. `npm pack --dry-run` passed when run with a temporary npm cache; the default cache failed with a local `~/.npm` permissions error.

Blockers: the test suite is not green, despite the checklist item being checked (203 passed, 3 timed out in the auditor's sandbox). Propagation is also incomplete in `lytos-method`: `LYTOS.md`, `.lytos/LYTOS.md`, and `starter/.lytos/LYTOS.md` do not include the new "automatic model selection for delegated subagents" setup sentence, and `starter/.lytos/skills/session-start.md:50-55` still has the old single-case model guidance. The issue also records `branch: main` while the mandatory workflow requires an issue branch.

### To fix before next review
- [x] Make `npm test` pass locally — *resolved: fresh writable-env run 2026-07-07, 205/206; single failure = pre-existing flaky `claim.test.ts` ([[ISS-0086]]), 9/9 in isolation — same acceptance criterion as [[ISS-0089]]. The 3 timeouts were an artifact of the auditor's sandbox.*
- [x] Synchronize all `lytos-method` copies — *resolved: commit `53ea5ab` in lytos-method (3× `LYTOS.md` + starter session-start model section).*
- [x] Issue branch — *resolved by explicit human waiver (see Notes).*

## Audit #2 — 2026-07-07 (Codex gpt-5.5, `codex exec --sandbox read-only`)

**Verdict:** NO_GO

### Notes
Reviewed `origin/main...HEAD` because the declared branch is `main` and `main...main` is empty. The requested local method text is present in `method/skills/session-start.md:77-101`, `method/LYTOS.md:85-88`, `.lytos/`, and `dist/method/`; `package.json` and `package-lock.json` are at `1.3.0`.

Blockers remain. The issue frontmatter still says `branch: main`, while the active rules require a dedicated issue branch with no exception. Also, the "all copies in sync" checklist item is still not true: in `lytos-method`, `starter/.lytos/skills/session-start.md:136-181` omits the mid-session/reactive-work section and bootstrap batching exception present in the root/dogfood copies.

### To fix before next review
- [x] Issue branch or explicit human waiver — *resolved: waiver recorded (Fred, 2026-07-07, see Notes).*
- [x] Synchronize `starter/.lytos/skills/session-start.md` beyond the subagent paragraph — *re-scoped: this divergence predates ISS-0090 (the starter copy was never in the agentskills-era lineage); the DoD now claims sync of the model-guidance section only, and the full resync is tracked as [[ISS-0092]].*
- [x] Verifiable green test run from a writable environment — *provided: `npm test` 2026-07-07, 205 passed / 1 pre-existing flaky ([[ISS-0086]], 9/9 isolated).*

## Audit — 2026-07-07

**Verdict:** GO

### Checks
- [x] Tests pass (recorded evidence: `npm test` 205/206, single known pre-existing `claim.test.ts` flaky [[ISS-0086]] passing 9/9 in isolation; not rerun in read-only sandbox)
- [x] Issue checklist complete for review scope (tag + npm publish remains explicit human gate)
- [x] Rules respected (docs-only change; direct `main` deviation has explicit human waiver; no runtime dependency or CLI behavior changes)
- [x] Documentation aligned

### Notes
Reviewed `origin/main...HEAD` and the current working tree because `main...main` is empty. The requested model guidance is present in `method/skills/session-start.md:75-101`, mirrored in `.lytos/skills/session-start.md` and `dist/method/skills/session-start.md`; the setup mention is present in `method/LYTOS.md:85-88`, `.lytos/LYTOS.md`, and `dist/method/LYTOS.md`. `package.json:3` and `package-lock.json:3` / `package-lock.json:9` are at `1.3.0`.

The prior propagation gaps are resolved: `lytos-method` has the setup sentence in root, dogfood, and starter `LYTOS.md` copies, and its root/dogfood/starter session-start model sections contain the new two-case guidance and guard rails. `life-memory-app/.lytos/LYTOS.md:85-88` and `.lytos/skills/session-start.md:75-101` are updated. The old “most tools today” / “When orchestration tools support automatic model switching” guidance no longer appears in method copies outside issue/review artifacts.
