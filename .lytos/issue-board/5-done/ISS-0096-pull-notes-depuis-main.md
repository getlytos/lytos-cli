---
id: ISS-0096
title: `lyt pull-notes` — rapatrier les commits .lytos de main vers la branche courante
type: feat
priority: P2-medium
effort: S
complexity: light
domain: [cli, git, dx]
skill: 
skills_aux: []
status: 5-done
branch: feat/1.4.0-retour-terrain
depends: []
created: 2026-08-04
updated: 2026-08-10
schema_version: 2
completed_at: 2026-08-10
---
# ISS-0096 — Les notes mobiles atterrissent sur main, le travail vit sur des branches

## Retour terrain (immo, 03-04/08)

Deux fois en 24 h : une note déposée depuis mobile arrive sur main (NOTE-0002 tourisme, puis tout
un corpus de réflexion produit à 690 €) pendant que le travail vit sur une pile de branches — le
board de la branche ne voit pas les notes, et le rapatriement s'est fait par cherry-picks manuels
en repérant les SHA à l'œil.

## Le geste

`lyt pull-notes` : liste les commits de `origin/main` absents de HEAD qui ne touchent QUE
`.lytos/`, les cherry-picke (`-x`) dans l'ordre, régénère le board. Refuse (et liste) ceux qui
touchent aussi du code — ceux-là relèvent d'un merge, pas d'un rapatriement.

- [x] Détection .lytos-only, cherry-picks -x ordonnés, board régénéré
- [x] `--dry-run` qui liste sans agir ; refus motivé des commits mixtes
- [x] Tests : notes pures, commit mixte refusé, aucun commit à rapatrier

## Audit — 2026-08-10

**Verdict:** GO

### Checks
- [x] Tests pass (313)
- [x] Issue checklist complete
- [x] Rules respected
- [x] Documentation aligned

### Notes
`scanOriginNotes` classifies only `.lytos/` commits, preserves chronological cherry-pick order, refuses mixed changes, and aborts a failed cherry-pick instead of leaving a conflicted operation behind.
