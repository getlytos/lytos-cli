---
id: ISS-0106
title: "Propager la décision loop-B (ADR-0004) dans lytos-method"
type: chore
priority: P2-normal
effort: S
complexity: standard
domain: [method, docs]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0098]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0106 — Faire redescendre la méthode dans le repo méthode

## Contexte

ADR-0004 est une décision de *méthode*, mais elle a été enregistrée dans `lytos-cli`
(là où vivent déjà ADR-0001→0003, et parce que `lytos-method` est un stub sans
convention ADR). Elle doit redescendre dans `lytos-method`, comme le font déjà ISS-0067
et ISS-0092 pour d'autres décisions.

## Le geste

Porter dans `lytos-method` : le principe des deux gates réels + interdiction de
self-close, le park-on-ambiguity, la DoD à mode de vérification, la checklist de review
comme objet de première classe. Décider au passage si `lytos-method` se dote enfin d'un
dossier `adr/` (et alors y copier ADR-0004) ou si LYTOS.md/rules suffisent.

## Definition of done

- [ ] Contrat loop-B reflété dans LYTOS.md / rules de `lytos-method` — *verify: human*
- [ ] Décision « adr/ dans method ? » tranchée et appliquée — *verify: human*
- [ ] Cohérence croisée cli ↔ method vérifiée (pas de contradiction) — *verify: human*

## Notes

- Ne pas dupliquer aveuglément : `lytos-method` est encore un stub (manifest vide).
- Réf : ADR-0004 (section Consequences → Propagation). Suit le pattern ISS-0067/0092.
