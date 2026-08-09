---
id: ISS-0122
title: "Décorrélation mesurée + juges non-LLM + filets comportementaux"
type: feat
priority: P1-high
effort: L
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
# ISS-0122 — Faire de la décorrélation un instrument, pas un axiome

## Contexte

Coup le plus juste du sceptique « gates » : la décorrélation cross-modèle (ADR-0004 §5) est
**postulée, pas mesurée** — Claude et GPT partagent corpus/priors, le bug dur est celui
qu'ils ratent *ensemble*. Et le park n'attrape que le doute *avoué*, jamais le doute
*ignoré*. La défense l'a accepté : il faut mesurer et ajouter des juges structurellement
décorrélés.

## Le geste

Trois briques dans le quality kit (ISS-0107) : (1) **kill-rate mesuré** — semer des bugs
durs (mutation testing + injections sémantiques) dans des modules verts et mesurer le taux
de capture du jury ; §5 devient un chiffre. (2) **Juges non-LLM** au jury (fuzz, property,
mutation) — un fuzzer ne partage aucun prior avec le modèle, il ne peut pas rater le bug
*avec* lui. (3) **Filets comportementaux en aval** (property/fuzz/canary/observabilité)
exigés par la matrice risque pour rattraper le doute ignoré — pas par la bonne volonté de
l'agent.

## Definition of done

- [ ] Kill-rate mesuré (mutation/injections) exposé par `lyt` — *verify: auto*
- [ ] Juges non-LLM branchés au jury (fuzz/property/mutation) — *verify: auto*
- [ ] Filets aval exigés par la matrice risque selon `risk` — *verify: auto*
- [ ] Tests : un bug que les LLM ratent ensemble est attrapé par un juge non-LLM — *verify: auto*
- [ ] Reviewer adverse : exiger une sortie **falsifiante** (contre-exemple), pas une note — *verify: human*

## Notes

- Affine ADR-0004 §5 / ADR-0005 / ADR-0007. Réf : ADR-0008 (Consequences).
