---
id: ISS-0116
title: "Niveaux de documentation L0–L4 — le bon niveau, décidé par le changement"
type: feat
priority: P2-normal
effort: M
complexity: standard
domain: [cli, method, docs]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0101, ISS-0107]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0116 — La doc a des niveaux, pas un « update docs » générique

## Contexte

« Documentez tout » = sur-ingénierie ; « pas de doc » = dette. Un senior décide le
**niveau** par le changement (ADR-0007 §2). Un item de DoD doit pouvoir nommer le niveau
requis plutôt qu'un flou.

## Le geste

Étendre la convention `verify:` (ISS-0101) avec `verify: doc <L>` où L ∈ L0..L4 :
- **L0** in-code (docstrings, types) → gate auto (API publique documentée, exemples compilent) ;
- **L1** module README, **L2** archi/ADR/diagrammes → humain (péremption détectable) ;
- **L3** contrat (schéma API, changelog) → gate auto (schéma ↔ implémentation) ;
- **L4** runbook → recoupe `skills/`.
Le parseur DoD classe `doc L0/L3` en auto, `doc L1/L2` en human. La matrice risque
(ISS-0114) décide quel niveau est dû.

## Definition of done

- [ ] `verify: doc <L>` parsé et classé auto (L0/L3) / human (L1/L2/L4) — *verify: auto*
- [ ] `lyt show` affiche le niveau de doc requis par item — *verify: auto*
- [ ] Convention documentée (template + rules) — *verify: doc L1*
- [ ] Tests de parsing par niveau — *verify: auto*

## Notes

- Étend le mode de vérification (ISS-0101). Réf : ADR-0007 §2. Dépend du kit (ISS-0107).
