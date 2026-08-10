---
id: ISS-0087
title: "Support `--no-color` on every command (cli-rules.md)"
type: feat
priority: P3-low
effort: S
complexity: light
domain: [cli, dx]
skill: ""
skills_aux: []
status: 1-backlog
branch: "feat/ISS-0087-global-no-color-flag"
depends: []
created: 2026-06-14
updated: 2026-06-14
schema_version: 2
---

# ISS-0087 — Global `--no-color` support

## Context

Sprint #03 review (ISS-0076). `cli-rules.md` lists `--no-color` next to `NO_COLOR`, but the flag is not accepted by the commands (`--no-color` → unknown option, exit 1); only the `NO_COLOR` environment variable is honoured. A cross-cutting gap, not specific to `absorb`.

## Proposed solution

Add a global `--no-color` option (commander `.option`) that forces colors off, aligned with the existing `NO_COLOR` handling.

## Definition of done

- [ ] `lyt <cmd> --no-color` disables colors on every command.
- [ ] Behaviour consistent with `NO_COLOR`.
- [ ] Test.
