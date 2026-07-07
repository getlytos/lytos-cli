---
id: ISS-0090
title: Method — subagent orchestration by complexity (release 1.3.0)
type: docs
priority: P1-high
effort: XS
complexity: light
domain: [method, release, npm]
skill: documentation
status: 4-review
branch: main
depends: []
created: 2026-07-07
updated: 2026-07-07
schema_version: 2
assignee: fredericgalline
ai_implementer:
  model: claude-fable-5
  session: claude-code-vscode-2026-07-07
  prompt_ref: method/skills/session-start.md
skills_used: [documentation]
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
- [x] All copies in sync: `lytos-cli/.lytos/`, `lytos-method` repo (skills/ + dogfood), downstream project `life-memory-app/.lytos/`
- [x] `package.json` + `package-lock.json` version is `1.3.0`
- [x] `npm run build` passes
- [x] `npm test` green
- [x] `npm pack --dry-run` clean (method files shipped in `dist/method/`)
- [ ] `git tag v1.3.0` + `npm publish` (human — npm session not authenticated on this machine)

## Notes

Follow-up idea captured separately: [[ISS-0091]] — cost feedback loop to validate the manifest model table with real session-journal data.
