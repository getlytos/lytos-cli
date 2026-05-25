---
id: ISS-XXXX
title: "[Issue Title]"
type: feat | fix | refactor | chore
priority: P0-critical | P1-high | P2-normal | P3-low
effort: XS | S | M | L | XL
complexity: light | standard | heavy
domain: []
# `skill` is optional — modern AI tools discover task skills natively via
# agentskills.io progressive disclosure. Set it only as an explicit hint
# for borderline tasks. Leave empty otherwise.
skill: ""
skills_aux: []
status: 0-icebox
branch: "type/ISS-XXXX-slug-title"
depends: []
created: YYYY-MM-DD
updated: YYYY-MM-DD

# === Schema v2 (ADR-0001) — optional, backward-compatible ===
# Marks this issue as written under the v2 schema. Absence implies v1.
schema_version: 2

# --- Optional hand-written v2 fields ---
# surface: app | cli | both          # which Lytos surface this issue targets
# risk: low | medium | high          # blast radius (≠ complexity which is cognitive)

# --- Auto-populated v2 fields — DO NOT EDIT BY HAND ---
# Tooling owns these. Hand-editing breaks the audit trail.
#
# Human accountability (set by `lyt start` / `lyt review`):
# assignee: "@handle"
# reviewer: "@handle"
#
# AI traceability (set by the AI wrapper at work time):
# ai_implementer:
#   model: "claude-opus-4-7"
#   session: "abc123"
#   prompt_ref: "skills/code-structure/SKILL.md"
# ai_reviewer:
#   model: "gpt-5"
#   session: "rev-456"
#   prompt_ref: "skills/code-review/SKILL.md"
#
# Lifecycle (set by `lyt start` / `lyt review` / `lyt close`):
# started_at: YYYY-MM-DD
# review_at: YYYY-MM-DD
# completed_at: YYYY-MM-DD
#
# Audit & cost (accumulated by the AI wrapper):
# tokens_in: 124500
# tokens_out: 32100
# cost_usd: 1.84
# skills_used: [code-structure, testing]
# validation:
#   tests: pass | fail | skip
#   build: pass | fail | skip
#   lint:  pass | fail | skip
#
# Decision (set by `lyt review --verdict ...` and the AI implementer):
# review: go | no-go | pending | none
# confidence: 0-100                  # self-reported by the AI implementer
#
# Git artifacts (auto from `git log` at close time):
# pr_url: "https://github.com/.../pull/123"
# commits: [abc123, def456]
---

# ISS-XXXX — [Issue Title]

## Context

*Why this issue exists. What problem it solves. What the current situation is.*

## Proposed solution

*What we'll concretely do to solve the problem.*

## Definition of done

*How we know this issue is finished. The bigger the issue, the more precise the done criteria should be.*

- [ ] Verifiable criterion 1
- [ ] Verifiable criterion 2
- [ ] Tests written and passing
- [ ] Documentation up to date

## Checklist

### [Domain 1]
- [ ] Specific task with relevant file
- [ ] Specific task with relevant file

### [Domain 2]
- [ ] Specific task with relevant file
- [ ] Specific task with relevant file

## Relevant files

- `path/to/file`
- `path/to/file`

## Notes

*References, links, documented dependencies, implementation decisions.*
