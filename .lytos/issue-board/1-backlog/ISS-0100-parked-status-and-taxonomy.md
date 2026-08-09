---
id: ISS-0100
title: "Statut `parked` + `lyt park` + taxonomie de raisons"
type: feat
priority: P1-high
effort: M
complexity: standard
domain: [cli, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: []
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0100 — Garer plutôt que deviner

## Contexte

« Don't interpret silently — ask if ambiguous » ne peut pas dire « demande » dans un
loop sans tour humain. La règle s'inverse : **halte, pas de devinette**. L'agent gare
l'issue avec une raison, et le loop passe à la suivante (ADR-0004 §3). Le park est une
sortie de première classe, pas un échec.

## Le geste

Nouveau statut `parked` (hors flux du board, à côté de `3-in-progress`) et verbe
`lyt park ISS-X --reason <code>` : met `status: parked`, écrit `park_reason` +
`parked_at` dans le frontmatter, déplace le fichier, régénère le board — atomique comme
`lyt move`. Taxonomie fermée : `ambiguous-spec`, `missing-dependency`, `gate-failed`,
`budget-exhausted`, `human-judgment-required`, `external-blocker`. `lyt unpark`
(ou `lyt start`) pour reprendre.

## Definition of done

- [ ] Statut `parked` + dossier + `lyt park`/`unpark` atomiques — *verify: auto*
- [ ] `--reason` validé contre la taxonomie fermée ; refus sinon — *verify: auto*
- [ ] `park_reason`/`parked_at` en frontmatter ; `lyt show` les affiche — *verify: auto*
- [ ] Tests par raison + reprise — *verify: auto*

## Notes

- La taxonomie alimente des métriques amont (% ambiguous-spec = sous-spécification).
- Réf : ADR-0004 §3. Le review packet (ISS-0103) liste les issues garées du sprint.
