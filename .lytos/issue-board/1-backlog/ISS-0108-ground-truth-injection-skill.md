---
id: ISS-0108
title: "Skill d'injection vérité-terrain (Context7-like) + vérification"
type: feat
priority: P1-high
effort: M
complexity: heavy
domain: [cli, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0107]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0108 — On ne demande pas la « dernière API », on la donne

## Contexte

Un agent hallucine ou déprécie une API depuis sa mémoire (cutoff). On ne corrige pas ça
par une consigne : on **met la vraie doc de la version épinglée dans le contexte** et on
exige la citation. C'est de la récupération, pas de la mémoire (ADR-0005 §3).

## Le geste

Un skill qui, au moment du travail, résout les versions depuis le lockfile (contrat de
stack, ISS-0107), injecte la doc **de ces versions** (source MCP type Context7 ou docs
vendorisées) et demande à l'agent de **citer** l'API utilisée. Couplage obligatoire :
injection **+** typecheck/tests (qui attrapent l'API inventée) **+** vérif des citations
par le relecteur. Sources **allow-listées et figées** — une doc live est un vecteur
d'injection de prompt.

## Definition of done

- [ ] Résolution des versions depuis le lockfile + sélection des docs — *verify: auto*
- [ ] Sources allow-listées/épinglées ; refus d'une source hors liste — *verify: auto*
- [ ] Exigence de citation d'API traçable dans le review packet — *verify: auto*
- [ ] Doc : brancher un provider de docs (Context7 / vendor) — *verify: human*

## Notes

- L'injection ne garantit rien seule — toujours + gate. Réf : ADR-0005 §3.
- Dépend du contrat de stack (ISS-0107).
