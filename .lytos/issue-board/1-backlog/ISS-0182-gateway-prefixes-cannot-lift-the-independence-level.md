---
id: ISS-0182
title: "A gateway-prefixed provider id cannot lift the independence level at high risk"
type: fix
priority: P2-normal
effort: S
complexity: standard
skill: ""
skills_aux: []
status: 1-backlog
branch: ""
depends: []
related: [ISS-0181]
parent: ISS-0181
created: 2026-11-20
schema_version: 2
risk: high
---

# ISS-0182 — A gateway-prefixed provider id cannot lift the independence level at high risk

## Context

Review finding N2 of the second 1.7 review. In `.lytos/config.yml`, a provider rule such as `us.anthropic: bedrock` or `anthropic: openrouter` gives a reviewer id like `us.anthropic.claude-opus-4-v1:0` a different provider from a Claude implementer: level 1 at high risk, with no warning and no countersignature. The override check only catches prefixes the shipped table already maps.

## Proposed solution

Also look for a shipped model name inside the id after `.`, `/` or `:`, and treat a config rule that reassigns the provider of such an id as an override (reported, and not counted at high risk).

| Option | Build cost | Maintenance | Robustness |
|---|---|---|---|
| A. Detect a shipped model name inside the id | low | low | closes the gateway case |
| B. Only document the limit in ADR-0010 | lowest | lowest | leaves a silent path to level 1 |

Decision: **A**, and the remaining limit goes in ADR-0010 "Known limits".

## Ready

- **Scope** — the detection, its tests and the ADR note.
- **Out of scope** — a new provider table.
- **Solution** — detect the shipped name inside a prefixed id.
- `risk: high`.

## Definition of done

- [ ] The two reproduction cases (`us.anthropic`, `anthropic: openrouter`) are no longer level 1 at high risk and are reported — verify: auto
- [ ] A new, unknown provider id with no shipped model name inside stays free — verify: auto
- [ ] Negative tests cover case, separators and an empty rule — verify: auto
- [ ] The rule cannot be bypassed by a spelling variant of the id — verify: reviewer:security-review
