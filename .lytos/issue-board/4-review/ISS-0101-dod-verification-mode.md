---
id: ISS-0101
title: "DoD à mode de vérification — `verify: auto | human` par item"
type: feat
priority: P1-high
effort: M
complexity: standard
domain: [cli, method]
skill: 
skills_aux: []
status: 4-review
branch: claude/claude-loops-lytos-wtkc94
depends: []
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
assignee: Claude
started_at: 2026-08-09
---
# ISS-0101 — Chaque item de DoD déclare comment on le vérifie

## Contexte

En boucle autonome, une case de DoD cochée par l'agent lui-même vaut zéro : « la
confiance de l'implémenteur remplace l'état réel » (session-start). Il faut savoir, par
item, s'il est vérifiable par une machine (gate) ou seulement par un humain (checklist).
C'est la source unique qui découpe le review packet (ADR-0004 §4).

## Le geste

Convention dans le corps d'issue : un item de DoD peut porter un suffixe `— verify: auto`
ou `— verify: human`. Le CLM de comptage (cf ISS-0069) reconnaît le marqueur et classe
chaque item en `auto-✓ / auto-✗ / human-only`. Un item sans marqueur = `auto` par défaut
mais **signalé** par `lyt lint`/`doctor` (« item non qualifié »). Une issue dont *tous*
les items sont `verify: human` est marquée **non éligible au loop**.

## Definition of done

- [x] Parsing du marqueur `verify:` sur les items de DoD, tolérant à la casse/espaces — *verify: auto*
- [x] `lyt show ISS-X` affiche le décompte auto/human et le flag « loop-inéligible » — *verify: auto*
- [x] `lyt lint` avertit sur tout item de DoD non qualifié — *verify: auto*
- [ ] Doc de la convention dans le template d'issue + rules — *verify: human*

## Notes

- Fondation de l'épic — `lyt next` (ISS-0099) et le review packet (ISS-0103) en dépendent.
- Réutilise le comptage de checklist existant ; attention aux blocs de code (cf ISS-0069).
- Réf : ADR-0004 §4.
