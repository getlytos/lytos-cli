---
id: ISS-0123
title: "Journaliser le raisonnement rejeté — la mini-ADR de tranchée"
type: feat
priority: P2-normal
effort: S
complexity: standard
domain: [cli, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0112]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0123 — Le « milieu » formateur ne doit pas partir à la poubelle

## Contexte

Deux panels convergent : le modèle mental vit dans les **branches non prises** (les
approches essayées et rejetées, et pourquoi), et Lytos les jette avec la session
(`session.jsonl`, « never read back » ; ADR-0006 §2 : « the chat is disposable »). On perd
le raisonnement *rejeté*, qui est justement ce qui forme et ce qui manque à 3h du matin.

## Le geste

Un artefact « approches considérées / rejetées + raison » attaché au diff (niveau L1),
écrit avant `close` — une mini-ADR de tranchée. Étend la note de handoff WIP (ISS-0112) et
la taxonomie de park (ADR-0004 §3, déjà une raison structurée quand l'agent refuse de
deviner). Le raisonnement mort devient versionné, pas jeté.

## Definition of done

- [ ] Section « rejected approaches » normée, écrite avant `close` — *verify: auto*
- [ ] `lyt show` la remonte ; liée au diff/issue — *verify: auto*
- [ ] Tests de présence/format — *verify: auto*
- [ ] La trace rejetée est-elle réellement réutilisable comme matériau — *verify: human*

## Notes

- Affine ADR-0006. Réf : ADR-0008 (Consequences). Matériau de formation, pas déchet.
