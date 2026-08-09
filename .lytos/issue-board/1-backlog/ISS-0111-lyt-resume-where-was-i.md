---
id: ISS-0111
title: "`lyt resume` — « où j'en étais » à travers repos et surfaces"
type: feat
priority: P1-high
effort: M
complexity: standard
domain: [cli, dx]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0112]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0111 — Reprendre en une commande

## Contexte

En rouvrant VSCode ou l'App demain, il faut une réponse immédiate à « où j'en étais ». Le
board porte déjà l'issue active (via claim → in-progress) ; il manque la vue « la mienne »
qui rassemble état + note WIP + fraîcheur, à travers repos et surfaces (ADR-0006 §2).

## Le geste

`lyt resume` : mes issues in-progress (assignee = identité git) sur le repo courant (ou
`--all` multi-repo), avec branche, DoD cochée/restante, **note WIP** (ISS-0112) et
fraîcheur origin. Propose l'action de reprise (`git switch`, `lyt pull-notes` si des notes
traînent sur `main`). Lecture seule ; `--json`.

## Definition of done

- [ ] Liste mes in-progress + branche + DoD + note WIP + fraîcheur — *verify: auto*
- [ ] Détecte des notes non rapatriées et suggère `pull-notes` — *verify: auto*
- [ ] `--all` multi-repo ; `--json` — *verify: auto*
- [ ] Tests : in-progress simple, multi-repo, notes en attente, rien à reprendre — *verify: auto*

## Notes

- S'appuie sur l'existant : claim (assignee), pull-notes (ISS-0096), board --remote
  (ISS-0043). Ne duplique pas la vue lead. Réf : ADR-0006 §2. Dépend d'ISS-0112 (note WIP).
