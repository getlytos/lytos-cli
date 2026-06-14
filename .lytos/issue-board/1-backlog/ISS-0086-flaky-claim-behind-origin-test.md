---
id: ISS-0086
title: "Flaky : claim.test.ts 'aborts when local main is behind origin' (timeout 5s)"
type: fix
priority: P2-normal
effort: S
complexity: standard
domain: [tests, cli, git]
skill: ""
skills_aux: []
status: 1-backlog
branch: "fix/ISS-0086-flaky-claim-behind-origin-test"
depends: []
created: 2026-06-14
updated: 2026-06-14
schema_version: 2
---

# ISS-0086 — Flaky : claim.test.ts 'aborts when local main is behind origin'

## Context

Review Sprint #03 : seule défaillance de la suite complète, intermittente. `tests/commands/claim.test.ts > 'aborts when local main is behind origin'` dépasse le timeout 5 s ; passe en isolation (~1.7 s). Test git/réseau non déterministe, sans rapport avec le code de la branche cloud. Un test flaky qui prouve un comportement ne doit pas dépendre du réseau (cf. default-rules : « the test must prove the bug doesn't come back »).

## Proposed solution

Rendre le test déterministe : mocker l'accès git/réseau (état behind-origin) plutôt que de dépendre d'un appel réel ; ajuster/contrôler le timeout si nécessaire.

## Definition of done

- [ ] Le test ne dépend plus d'un appel réseau réel (dépendance git injectée/mockée).
- [ ] Stable sur 10 runs consécutifs de la suite complète.
