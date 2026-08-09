---
id: ISS-0109
title: "Design system exécutable — tokens oklch + gate tokens-only + gate contraste"
type: feat
priority: P1-high
effort: L
complexity: heavy
domain: [cli, design, a11y]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0107]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0109 — Le design se compose, il ne se réécrit pas

## Contexte

« Du CSS sans fin à chaque ajout » n'est pas un problème moral, c'est structurel : sans
tokens, chaque ajout écrit du nouveau CSS. Avec des tokens, ajouter de l'UI *compose
l'existant*. Et le contraste, calculable depuis oklch, rend l'accessibilité **gatable**
plutôt qu'espérée (ADR-0005 §4-5).

## Le geste

Trois briques dans le quality kit (ISS-0107) : (1) **source unique de tokens** — rampe
oklch, échelle d'espacement sur une unité de base, type scale, radii ; (2) **gate
tokens-only** — Stylelint bannit les littéraux bruts (hex/px) et les valeurs arbitraires
Tailwind `[...]`, thème oklch unique en config ; (3) **gate de contraste** — calcule le
ratio WCAG/APCA depuis les tokens et **refuse une paire** qui échoue. Le résiduel a11y
(lecteur d'écran, ordre logique) part en checklist humaine (ISS-0104).

## Definition of done

- [ ] Source de tokens oklch + échelles, format documenté — *verify: auto*
- [ ] Gate tokens-only : littéraux bruts et `[...]` échouent le lint — *verify: auto*
- [ ] Gate contraste : paire de tokens sous seuil = échec, avec le ratio — *verify: auto*
- [ ] Le rendu réel est-il correct visuellement / au lecteur d'écran — *verify: human*
- [ ] Doc : ajouter un token / ajuster une rampe — *verify: human*

## Notes

- Sur `lytos-app` (Tailwind), le gate force Tailwind à être utilisé *comme* un système de
  tokens. Réf : ADR-0005 §4-5. Dépend du kit (ISS-0107), nourrit la checklist (ISS-0104).
