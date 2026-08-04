---
id: ISS-0093
title: Merge driver « union de sections » pour les fiches d'issues
type: feat
priority: P1-high
effort: M
complexity: standard
domain: [cli, git, dx]
skill: 
skills_aux: []
status: 4-review
branch: feat/1.4.0-retour-terrain
depends: []
created: 2026-08-04
updated: 2026-08-04
schema_version: 2
---
# ISS-0093 — Les fiches d'issues ne doivent plus produire de conflits de merge

## Retour terrain (projet immo, nuit du 03 au 04/08)

Deux conflits de merge sur des fiches en une seule nuit, résolus à la main. Cause structurelle :
les fiches vivent en APPEND (réponses d'audit, tranches livrées, journaux) — deux branches qui
ajoutent chacune une section à la même fiche entrent en conflit alors que **l'union des deux est
toujours la bonne résolution**.

## Le geste

`lyt init` (et `lyt doctor` en contrôle) installe un merge driver git déclaré par `.gitattributes`
sur `.lytos/issue-board/**/*.md` : frontmatter fusionné champ à champ (conflit réel si le MÊME champ
diverge — c'est le seul cas qui mérite un humain), corps fusionné par union ordonnée des sections
`##` ajoutées. Implémentation : sous-commande cachée `lyt _merge-issue %O %A %B` + config git posée
par init.

- [x] Driver : union des sections de corps, fusion champ à champ du frontmatter
- [x] `lyt init` pose .gitattributes + git config ; `lyt doctor` vérifie leur présence
- [x] Tests : append//append (auto), même champ modifié (conflit maintenu), section réécrite des
      deux côtés (conflit maintenu — une réécriture n'est pas un append)
