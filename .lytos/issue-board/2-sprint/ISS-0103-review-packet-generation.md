---
id: ISS-0103
title: `lyt report ISS-X` — génération du review packet
type: feat
priority: P1-high
effort: L
complexity: heavy
domain: [cli, dx]
skill: 
skills_aux: []
status: 2-sprint
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0100, ISS-0101]
created: 2026-08-09
updated: 2026-08-10
schema_version: 2
---
# ISS-0103 — L'interface autopilote → pilote

## Contexte

Si l'humain reprend la main à la review, il lui faut un rapport qui rende la relecture
rapide **et** méfiante. Le review packet est cette interface (ADR-0004 §7). Point de
design clé : il **résiste au tampon automatique** — le doute passe devant le vert.

## Le geste

`lyt report ISS-X` produit le packet par issue : (1) le diff, (2) les preuves de gates
(items `verify: auto` ✓/✗, cf ISS-0101), (3) les parks liés (cf ISS-0100), (4) la
checklist `verify: human` (générée par ISS-0104), (5) le verdict du modèle relecteur
adverse, (6) la ligne d'audit schema v2. **Ordre imposé** : parks + objections du
relecteur + items human-only **au-dessus** du bloc vert. Sortie markdown + `--json`.

## Definition of done

- [ ] Packet complet : diff, gates, parks, checklist, verdict, audit — *verify: auto*
- [ ] Layout « doute d'abord » : vert relégué en fin de rapport — *verify: human*
- [ ] `--json` pour consommation App ; markdown pour lecture directe — *verify: auto*
- [ ] Tests de structure (sections présentes, ordre respecté) — *verify: auto*

## Notes

- Le packet ne se ferme pas tout seul : il alimente la décision humaine au `close`.
- Réf : ADR-0004 §7. Dépend de ISS-0100 (parks) et ISS-0101 (verify mode).
