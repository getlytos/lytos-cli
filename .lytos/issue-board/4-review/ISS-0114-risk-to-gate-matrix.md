---
id: ISS-0114
title: Matrice risque → gates — la rigueur proportionnelle
type: feat
priority: P1-high
effort: M
complexity: heavy
domain: [cli, method]
skill: 
skills_aux: []
status: 4-review
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0107]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
assignee: Claude
started_at: 2026-08-09
---
# ISS-0114 — La rigueur suit le rayon de souffle, pas l'inverse

## Contexte

Appliquer tous les gates à tout, c'est la sur-ingénierie qu'on prétend éviter (audit
sécu sur une typo). On a déjà le champ `risk: low|medium|high` (ADR-0001) et on l'ignore.
Le chaînon manquant : une matrice **risque → gates obligatoires** (ADR-0007 §1).

## Le geste

Le kit (ISS-0107) porte une matrice qui, pour un `risk` donné, dit quels gates sont
**obligatoires**. Défauts conservateurs (ADR-0007) : `low` = tests+type+lint+secrets+repro+doc L0 ;
`medium` ajoute audit deps + perf + chemins négatifs + DS/a11y + doc L1/L3 ; `high` ajoute
E2E + compat/migrations + revue sécu/archi + doc L2. `risk` absent → traité `medium`. Un
projet peut **resserrer**, jamais desserrer sous `low`. `lyt` résout, pour une issue, la
liste des gates dus et signale ceux manquants.

## Definition of done

- [x] Matrice risque→gates dans le kit, format documenté — *verify: auto*
- [x] Résolution : pour une issue, la liste des gates obligatoires selon `risk` — *verify: auto*
- [x] `risk` absent = `medium` ; un projet ne peut que resserrer — *verify: auto*
- [x] Tests par niveau de risque — *verify: auto*
- [ ] Doc L1 du mécanisme — *verify: doc L1*
- [ ] Le tiering par défaut est-il sain pour de vrais projets — *verify: human*

## Notes

- Cœur d'ADR-0007. Rien n'est « toujours on » : c'est l'anti-sur-ingénierie. Dépend du kit (ISS-0107).
