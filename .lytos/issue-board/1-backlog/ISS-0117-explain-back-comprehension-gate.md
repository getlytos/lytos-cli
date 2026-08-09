---
id: ISS-0117
title: "Explain-back — preuve de transfert avant close (verify: human-comprehension)"
type: feat
priority: P1-high
effort: M
complexity: heavy
domain: [cli, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0101]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0117 — Un tampon prouve un clic ; un explain-back prouve un modèle mental

## Contexte

La critique la plus forte des deux panels : la review « au gate » se dégrade en tampon, et
rien ne garantit qu'un humain *tient* le système. La parade validée par l'attaque ET la
défense : sur `risk: high`/core, l'humain reconstitue **de mémoire, sans le diff**,
l'invariant central et le mode de défaillance principal (ADR-0008 §1).

## Le geste

Nouveau mode `verify: human-comprehension` (étend ISS-0101). Sur `risk: high`, `lyt close`
exige un explain-back enregistré dans le sign-off (invariant + failure mode, dérivés des
artefacts). Barre de récupérabilité falsifiable : un agent **frais, zéro contexte**, avec
seulement les artefacts in-repo, peut faire un changement comportemental correct, gates
verts, sans lire la session d'origine.

## Definition of done

- [ ] Mode `verify: human-comprehension` parsé et classé (ISS-0101) — *verify: auto*
- [ ] `lyt close` exige l'explain-back sur `risk: high`, refuse sinon — *verify: auto*
- [ ] Sign-off enregistre invariant + failure mode + auteur + date — *verify: auto*
- [ ] Tests : présence/absence sur high vs low — *verify: auto*
- [ ] L'explain-back demandé est-il réellement une preuve de compréhension — *verify: human-comprehension*
- [ ] Doc de la convention — *verify: doc L1*

## Notes

- Réf : ADR-0008 §1. N'est pas de l'authorship manuel (les deux panels l'ont rejeté).
