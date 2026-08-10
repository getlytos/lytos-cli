---
id: ISS-XXXX
title: "[Task Title]"
type: task
priority: P1-high | P2-normal | P3-low
effort: XS | S
complexity: light | standard | heavy
skill: "[skill to invoke]"
status: 0-icebox
depends: []
created: YYYY-MM-DD
# risk: low | medium | high   # blast radius — selects which gates are mandatory (ADR-0007)
---

# ISS-XXXX — [Task Title]

## What to do

*One or two sentences max. If it's longer, use issue-feature.md.*

## Relevant files

- `path/to/file`

## Ready

*Definition of Ready (ADR-0007 §3) — the entry gate. A task is small, so its Ready is
small: two lines, not a form. If you cannot write the out-of-scope line, the task is not
ready — and an agent working it in a loop will park it as `ambiguous-spec` anyway.*

- **Out of scope** — what this task explicitly does NOT touch.
- `risk:` set in the frontmatter, and the DoD below has ≥1 machine-verifiable item.

## Definition of done

*How we know it's finished.*

*Declare how each item is verified (ADR-0004 §4): `— verify: auto` for a machine gate (test,
typecheck, lint, build) or `— verify: human` for an item only a human can rule on (taste,
wording, product intent). Unmarked items default to auto and are flagged by `lyt lint`.*

*This matters most in a loop: an auditing model may tick an `auto` item, never a `human` one.
An issue whose DoD is all-`human` is not loop work. An issue with at least one `auto` item is
loop-eligible, and its human items come back to you as a `GO_PENDING_HUMAN` verdict.*

- [ ] Verifiable criterion — verify: auto
- [ ] Tests written and passing — verify: auto
