---
id: ISS-0158
title: lyt init asks, once and optionally, whether you use Claude Design
type: feat
priority: P2-normal
effort: M
complexity: standard
domain: [cli, init]
skill: ""
skills_aux: []
status: 4-review
branch: "feat/ISS-0158-lyt-init-asks-once-and-optionally-whether-you-use-claude-design"
depends: []
created: 2026-11-20
updated: 2026-11-20
schema_version: 2
risk: medium
assignee: fredericgalline
started_at: 2026-11-20
---
# ISS-0158 — lyt init asks, once and optionally, whether you use Claude Design

## Context

A project that designs with Claude Design accumulates artifacts (boards, versions, share links)
that the code follows more or less closely. Without a register nobody can say which version the
code reflects, which versions have no card, or which gaps went back to the design tool. A
private project keeps such a register in `.lytos/design/` and it paid for itself.

A project that does not use Claude Design must feel nothing: no question it cannot answer, no
file, no warning, no gate.

## Proposed solution

- `lyt init` asks ONE question, only on an interactive terminal outside CI and without `--yes`:
  "Do you use Claude Design for design?" — yes / no / other tool; Enter means no.
- `--design <claude-design|other|none>` answers it up front. With no terminal (pipe, CI) there is
  no prompt and the answer is `none`; an unclear reply is asked once more, then falls back to `none`.
- The answer is recorded in `.lytos/config.yml` as `design:` (written only: nothing reads it back). Only `claude-design` creates a
  file: `.lytos/design/registry.md`, from a generic template (links, nature, current version,
  versions-to-cards table, the register's rules). An existing register is never overwritten, not
  even by `init --force`: it is the project's own record.
- `none` and `other` generate nothing, `lyt doctor` and `lyt lint` say nothing about design, and
  no gate depends on it.
- Cost study (`cost-review`): one prompt, one optional file, one config line. Constant per
  project, no dependency. Rejected: a `design` command family and a doctor check for stale
  versions (a feature nobody asked for; the register is a document).

## Ready

- **Scope** — the option, the one question, the `design:` config key, the register template, the
  pure functions behind them and their tests.
- **Constraints** — never a brake: no prompt without a terminal or in CI, no file for `none`, no
  warning from `doctor`, no gate; the existing prompts and `--force` behave as before; zero new
  dependency; the template names no project, client or link.
- **Out of scope** — reading the register from other commands, validating its content, a doctor
  check for it, prompts for any other design tool.

## Definition of done

- [x] `--design claude-design|other|none` is accepted, an unknown value exits 2 with the valid values, and the answer lands in `.lytos/config.yml` as `design:` — verify: auto
- [x] With no terminal, or in CI, or with `--yes`, there is no prompt and the answer is `none`; the answer parser maps yes / no / other tool and Enter to claude-design / none / other / none — verify: auto
- [x] `claude-design` creates `.lytos/design/registry.md` from the generic template; `none` and `other` create no file — verify: auto
- [x] `doctor`, `lint` and `gates` report exactly the same on a project initialised with `none` as on one with `claude-design` — verify: auto:tests-negative
- [x] A re-init (`--force`) never overwrites an existing register, even when the answer is given again — verify: auto
- [x] A lone `o` and any other unclear reply are asked once more, then fall back to `none`: no guess, no file — verify: auto
- [x] The register is never written through a symbolic link, dangling or not (the shared helper `safe-write.ts`) — verify: auto:tests-negative
- [x] The register is named in English, `design/registry.md`, in the template, the code, the docs and the tests — verify: auto
- [x] The register template and its shipped copy carry no project, client or link — verify: auto
- [x] Nothing in the change makes `init` slower or noisier for a project that does not use Claude Design — ruled by the independent review of 2026-11-20 (Claude Opus 5.5 reviewing Claude Sonnet 5.5 work, verdict GO with reserves, every finding addressed) — verify: reviewer:over-engineering
