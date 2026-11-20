---
id: ISS-0183
title: "A discovery override records a real author, and the wrapper names every command that takes it"
type: fix
priority: P3-low
effort: XS
complexity: light
skill: ""
skills_aux: []
status: 1-backlog
branch: ""
depends: []
related: [ISS-0181]
parent: ISS-0181
created: 2026-11-20
schema_version: 2
risk: low
---

# ISS-0183 — A discovery override records a real author, and the wrapper names every command that takes it

## Context

Findings N3 and N4 of the second 1.7 review. With no git user set, `--discovery-override` records `by: unknown` and it counts, and `lint` stays silent, while a countersignature refuses "unknown" in the same situation. The reference-loop skill names only `move` and `start` for `--discovery-override`, not `close`, and the refusal for a card already in review says it "cannot leave the backlog".

## Proposed solution

Refuse an override with no resolvable author, as the countersignature does; name `close` in the skill and in its drift test; reword the refusal for a card already beyond the backlog. One line of study: the override and the countersignature are the same kind of record and should be checked the same way.

## Ready

- **Scope** — the author check, the skill wording and the refusal text.
- **Out of scope** — new flags.
- **Solution** — reuse the countersignature's author check.
- `risk: low`.

## Definition of done

- [ ] With no git user, an override is refused with a message naming `git config user.name` — verify: auto
- [ ] The skill and its drift test name `move`, `start` and `close` for `--discovery-override` — verify: auto
- [ ] The refusal for a card in review no longer says it cannot leave the backlog — verify: auto
