---
id: ISS-0177
title: "The wrapper contract names the flags that are a person's decision: --countersign and --discovery-override"
type: fix
priority: P1-high
effort: S
complexity: standard
skill: ""
skills_aux: []
status: 5-done
branch: fix/ISS-0177-wrapper-never-passes-bypass-flags
depends: []
related: [ISS-0165, ISS-0166, ISS-0168]
created: 2026-11-20
schema_version: 2
risk: medium
updated: 2026-11-20
completed_at: 2026-11-20
commits: [7193c61, 323050d, 5ff5be1, ab448e7, e27e974, f3cae8f, 4629f73, 1c6e272, 889b647, 0aaa03d, ba6e11a, 27d1fd2, b5e8493, 3fd4185, a54e2a5, 957f8b6]
---
# ISS-0177 — The wrapper contract names the flags that are a person's decision: --countersign and --discovery-override

## Context

Finding F5 of the independent review of 1.7. The reference-loop skill (ISS-0168) says "it never forces" and names only `start --force` and `claim --force`. Two later refusals of the CLI suggest another flag to their caller: a review whose independence is below the minimum for the card's risk suggests `--countersign` (ISS-0166), and a leaf of an epic still in discovery suggests `--discovery-override` (ISS-0165). Both flags record a person's decision. An agent outside the strict loop steps, or a sub-agent told to "record the verdict", that follows the printed advice records its own decision as the owner's.

## Proposed solution

State in the wrapper contract (Part 1, "the lines that do not bend") that both flags are a person's decision and that the wrapper never passes them, and that a refusal suggesting one stops the wrapper and calls the human. That is the first stop case (an action only a person may take), not a sixth. Hold it to the CLI by test.

| Option | Build cost | Cost at 10, 100, 500 cards | Robustness |
|---|---|---|---|
| A. Name the flags in the contract, and test it against the CLI and its real refusals | low: one section, one test file | none: text and a test | the test fails if the skill drops a flag, names one the CLI lacks, or a refusal starts suggesting a flag the skill does not name |
| B. Only reword the CLI refusals | low | none | does not bind a wrapper that never reads the refusal wording; the other agents already own that text |
| C. Make the CLI tell a human from an agent | high | none | cannot be done reliably: the CLI has no way to know who runs it |

Kept A: the cheapest option that stays robust (fails visibly, reversible, isolated). The wording of the refusals is left to the other change; the test reads the flags a refusal suggests, not its sentences.

## Ready

- **Scope** — Part 1 of `method/skills/reference-loop/SKILL.md`, the first stop case of `method/rules/team-and-loop.md`, their `.lytos/` copies, and the drift test.
- **Constraints** — the five stop cases stay exactly five, with the same labels in the skill and in `rules/team-and-loop.md`; English only; no new dependency.
- **Out of scope** — the text of the refusals (`independence-plan.ts`, `discovery-gate.ts`), any change to what the flags do, the README, the ADRs.
- **Solution** — name both flags in the contract and test it against the CLI.
- `risk: medium`.

## Definition of done

- [x] Part 1 of the skill names `--countersign` and `--discovery-override` as a person's decision the wrapper never passes, and says a refusal that suggests one stops the wrapper and calls the human (case 1) — verify: auto
- [x] A test fails if the skill stops naming either flag, or if a flag it forbids does not exist in the CLI — verify: auto:tests-negative
- [x] A test runs the two real refusals and fails if one suggests a flag the skill does not name — verify: auto
- [x] The five stop cases are unchanged, and the skill, `rules/team-and-loop.md` and the `.lytos/` copies agree — verify: auto

## Evidence

The new drift tests were red on the unchanged skill (8 failures) and are green with the change. Removing the `--discovery-override` line from the skill, or misspelling a cited flag, fails them.
