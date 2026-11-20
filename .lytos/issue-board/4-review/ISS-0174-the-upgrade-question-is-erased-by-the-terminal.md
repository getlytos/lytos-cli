---
id: ISS-0174
title: "The lyt upgrade question is erased by the terminal, so the command looks stuck"
type: fix
priority: P1-high
effort: XS
complexity: light
skill: ""
skills_aux: []
status: 4-review
branch: "fix/ISS-0174-lyt-upgrade-question-is-erased-by-the-terminal"
depends: []
related: []
created: 2026-11-20
schema_version: 2
risk: low
---

# ISS-0174 — The lyt upgrade question is erased by the terminal, so the command looks stuck

## Context

Reported by the owner on 2026-11-20 after running `lyt upgrade` on 1.6.0: the command printed the list of new files and the kit message, then seemed to hang. It was waiting for a yes or no on a modified file, but the question was invisible.

`upgrade` wrote the question to stderr (`~ rules/default-rules.md differs — update? [y/N] `) and then called `askConfirm("")`. `readline` owns the prompt line: when the interface is created it moves the cursor to column 1 and clears the line, which erased the text just written. The raw output in a pseudo-terminal ends with `ESC[1G ESC[0J` and nothing else.

## Proposed solution

Hand the question text to `askConfirm`, so readline draws it itself, and never write a question separately. Solution study: one line. This is the simplest option that is robust: the owner of the prompt line is the only thing that may draw on it.

## Ready

- **Scope** — the one call site in `lyt upgrade`, and a guard against the pattern.
- **Out of scope** — redesigning the prompts of the CLI.
- **Solution** — pass the text to `askConfirm`.
- `risk: low`.

## Definition of done

- [x] `askConfirm` hands the exact question text to readline (unit test with a mocked interface) — verify: auto
- [x] No command calls `askConfirm("")`, so no question can be written and then erased (static guard in the tests) — verify: auto
- [x] The `lyt upgrade` call site passes its question and the whole suite stays green — verify: auto

## Evidence

In a pseudo-terminal (`script`) the compiled binary now ends with the redrawn prompt, `ESC[1G ESC[0J  ~ rules/default-rules.md differs — update? [y/N] `. 827 tests pass.
