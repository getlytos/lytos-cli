---
id: ISS-0109
title: "Conformité au design system déclaré du projet (gate DS-agnostique)"
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
# ISS-0109 — Le design se compose selon le DS choisi, il ne se réécrit pas

## Contexte

« Du CSS sans fin à chaque ajout » n'est pas un problème moral, c'est structurel : sans
DS, chaque ajout écrit du nouveau CSS ad-hoc. Avec un DS, ajouter de l'UI *se conforme à
ses guidelines*. **La méthode ne prescrit aucun DS** — Tailwind, Material, un set de tokens
custom (ex. rampe oklch) sont des exemples. Le kit enregistre celui que le projet a
**déclaré** et le gate vérifie la conformité à *ce* DS (ADR-0005 §4-5).

## Le geste

Trois briques dans le quality kit (ISS-0107) : (1) **DS déclaré** — le projet dit lequel
(Tailwind / Material / tokens custom / …) + la source de ses guidelines ; (2) **gate de
conformité paramétré par le DS** — Tailwind → tokens-only, ban des valeurs arbitraires
`[...]`, thème unique en config ; Material/MUI → theme tokens + API composant, pas de
valeurs codées en dur ; tokens custom → seulement `var(--token)` ; (3) **gate de
contraste DS-agnostique** — le ratio WCAG/APCA se calcule quelle que soit la
représentation couleur (oklch le rend commode, pas obligatoire) et **refuse une paire**
sous seuil. Guidelines du DS **injectées** comme les docs d'API code (ISS-0108). Le
résiduel a11y/rendu → checklist humaine (ISS-0104).

## Definition of done

- [ ] Le kit déclare le DS du projet + sa source de guidelines — *verify: auto*
- [ ] Gate de conformité paramétré par le DS déclaré (Tailwind/Material/custom) — *verify: auto*
- [ ] Gate contraste DS-agnostique : paire sous seuil = échec, avec le ratio — *verify: auto*
- [ ] Le rendu réel est-il correct visuellement / au lecteur d'écran — *verify: human*
- [ ] Doc : déclarer un DS et brancher son gate de conformité — *verify: human*

## Notes

- Sur `lytos-app` (Tailwind), le gate force Tailwind à être utilisé *comme* un système de
  tokens. oklch n'est qu'un exemple de DS custom, pas la règle. Réf : ADR-0005 §4-5.
  Dépend du kit (ISS-0107), nourrit la checklist (ISS-0104).
