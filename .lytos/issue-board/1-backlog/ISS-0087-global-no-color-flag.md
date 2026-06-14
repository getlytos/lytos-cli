---
id: ISS-0087
title: "Support `--no-color` sur toutes les commandes (cli-rules.md)"
type: feat
priority: P3-low
effort: S
complexity: light
domain: [cli, dx]
skill: ""
skills_aux: []
status: 1-backlog
branch: "feat/ISS-0087-global-no-color-flag"
depends: []
created: 2026-06-14
updated: 2026-06-14
schema_version: 2
---

# ISS-0087 — Support `--no-color` global

## Context

Review Sprint #03 (ISS-0076). `cli-rules.md` liste `--no-color` à côté de `NO_COLOR`, mais le flag n'est pas accepté par les commandes (`--no-color` → unknown option, exit 1) ; seule la variable d'env `NO_COLOR` est respectée. Gap transverse, pas spécifique à `absorb`.

## Proposed solution

Ajouter une option globale `--no-color` (commander `.option`) qui force la désactivation des couleurs, alignée sur le respect existant de `NO_COLOR`.

## Definition of done

- [ ] `lyt <cmd> --no-color` désactive les couleurs sur toutes les commandes.
- [ ] Comportement cohérent avec `NO_COLOR`.
- [ ] Test.
