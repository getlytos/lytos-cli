---
id: ISS-0121
title: "Loop-C — ingestion d'incident prod→issue + champ MTTR"
type: feat
priority: P2-normal
effort: L
complexity: heavy
domain: [cli, app, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0114]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0121 — Fermer le cycle : spec → deploy → incident → spec

## Contexte

Le trou factuel confirmé par les deux panels : il n'existe aucun état après `5-done`, la
boucle feedback prod→issue est en icebox (ISS-0078), aucun MTTR. La réponse IA-native n'est
pas de re-taper le code à la main pour « le comprendre » — c'est d'appliquer à l'incident
les mêmes mécanismes qui tiennent l'amont (ADR-0008 §3).

## Le geste

Un **loop-C** symétrique du loop-B, mais entrant : un signal prod (alerte/SLO/erreur
structurée) est trié par un agent en **issue candidate** — blast radius → `risk`, hypothèse
de cause reliée au commit fautif via `Refs`, DoD de correction avec ≥1 item
machine-vérifiable. L'humain garde le gate amont (accepter dans le sprint). Plus un **champ
MTTR agrégé** (`incident_detected → fix_merged → deployed`), suivi par sprint comme le coût.

## Definition of done

- [ ] Triage d'un signal prod en issue candidate (risk, Refs, DoD) — *verify: auto*
- [ ] Gate humain amont conservé (pas d'auto-acceptation) — *verify: auto*
- [ ] Champ MTTR horodaté + agrégé au sprint — *verify: auto*
- [ ] Tests du triage et de l'agrégation MTTR — *verify: auto*
- [ ] Runbook L4 (opérer le loop-C) rejoué en CI — *verify: doc L4*
- [ ] Le triage produit-il des issues réellement actionnables — *verify: human*

## Notes

- Réf : ADR-0008 §3 ; sort ISS-0078 de l'icebox. Côté surface, recoupe l'App (direction 2).
- Permet la condition de falsifiabilité MTTR A/B (auteur humain vs agent chargé du contexte).
