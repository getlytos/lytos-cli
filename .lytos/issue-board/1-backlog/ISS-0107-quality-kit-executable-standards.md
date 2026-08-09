---
id: ISS-0107
title: "Quality kit versionné — Pilier Standards exécutable"
type: feat
priority: P1-high
effort: L
complexity: heavy
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
# ISS-0107 — Rendre le Pilier 3 (Standards) exécutable

## Contexte

ADR-0004 dit qu'il faut *gater* la qualité, pas la demander. ADR-0005 dit *avec quoi*.
Aujourd'hui `rules/` est de la prose : « préfère KISS » ne fait rien. Il faut **lier
chaque règle à un vérificateur**, et regrouper ça dans un kit versionné qui voyage avec
le repo (multi-projet → on ne mémorise pas quelle config).

## Le geste

Un kit `.lytos/quality/` par projet : **contrat de stack** (versions épinglées + deps
allow-listées + `no-new-dependency-without-ADR` + source des docs), **configs de gates**
(lint/type/format/archi/complexité + les dimensions repliées d'ADR-0007 : secrets,
reproductibilité du build, audit de deps, budget perf/taille en régression, observabilité
/« fail with context », compat/migrations, doc L0/L3), **rubrique du relecteur** (prompt
versionné). Chaque dimension est **sélectionnée par la matrice risque** (ISS-0114), pas
appliquée uniformément. Les items `verify: auto` de la DoD (ISS-0101) **pointent** vers
une entrée du kit. Les règles
non gatables sont marquées `reviewer-judged` ou `human-checked` — jamais « appliquée » en
silence. Signaux anti-sur-ingénierie inclus : taille de diff vs `effort`, complexité,
nb de nouvelles abstractions.

## Definition of done

- [ ] Structure `.lytos/quality/` + schéma du contrat de stack — *verify: auto*
- [ ] Dimensions repliées d'ADR-0007 présentes comme checkers (secrets, repro, audit deps, perf, observabilité, compat, doc L0/L3) — *verify: auto*
- [ ] `lyt doctor` vérifie la présence/cohérence du kit — *verify: auto*
- [ ] Convention : un item `verify: auto` référence une entrée de kit résoluble — *verify: auto*
- [ ] Règles non gatables explicitement classées reviewer/human — *verify: human*
- [ ] Doc : comment ajouter une règle exécutable au kit — *verify: human*

## Notes

- Réf : ADR-0005 §1-2. Consommé par les gates d'ADR-0004, ne les pilote pas.
- Propagation méthode suivie par ISS-0106.
