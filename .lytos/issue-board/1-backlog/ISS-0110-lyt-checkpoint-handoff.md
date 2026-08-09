---
id: ISS-0110
title: "`lyt checkpoint` — filet de sécurité au changement de surface"
type: feat
priority: P1-high
effort: M
complexity: standard
domain: [cli, dx]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: []
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0110 — Rien de non-poussé n'est perdu

## Contexte

Le conteneur d'une surface (mobile/cloud) est éphémère : un push oublié perd le travail en
cours au changement de surface. Aujourd'hui la règle cloud/mobile demande « commit +
push » à la main — de la discipline, pas un filet. La continuité, c'est **le dernier état
poussé** (ADR-0006 §1/4) ; il faut un geste assisté pour le garantir.

## Le geste

`lyt checkpoint [-m msg]` : commit du WIP (`.lytos/` + code de la branche courante) sur un
ref durable et **push** avec retry/backoff. Respecte le git flow — jamais sur `main`,
toujours la branche de travail. Idempotent (rien à committer → no-op propre). Option d'un
**hook de fin de session** (SessionEnd) qui l'appelle automatiquement. `--json`.

## Definition of done

- [ ] Commit WIP + push branche avec retry, jamais sur `main` — *verify: auto*
- [ ] Idempotent : aucun changement = no-op sans erreur — *verify: auto*
- [ ] Hook de fin de session optionnel documenté + exemple — *verify: human*
- [ ] Tests : WIP présent/absent, échec réseau (retry), refus si branche = main — *verify: auto*

## Notes

- Le filet, pas la magie : pas de sync de FS live (ADR-0006 §1). Réf : ADR-0006 §4.
- Complète la règle cloud/mobile du CLAUDE.md (la rend assistée plutôt que manuelle).
