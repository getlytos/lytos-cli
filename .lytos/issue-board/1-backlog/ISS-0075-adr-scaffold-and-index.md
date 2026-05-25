---
id: ISS-0075
title: "Scaffolder `adr/` dans `lyt init` avec INDEX.md et template"
type: feat
priority: P2-normal
effort: S
complexity: standard
domain: [scaffold, method, audit]
skill: ""
skills_aux: []
status: 1-backlog
branch: "feat/ISS-0075-adr-scaffold-and-index"
depends: []
created: 2026-05-25
updated: 2026-05-25
schema_version: 2
---

# ISS-0075 — Scaffolder `adr/` dans `lyt init` avec INDEX.md et template

## Context

Le dossier `.lytos/adr/` est devenu un artefact first-class de la méthode (cf. [`ADR-0001`](../../adr/ADR-0001-frontmatter-schema-v2.md) — frontmatter schema v2). Pourtant `lyt init` n'en crée aucune trace : un utilisateur qui adopte Lytos aujourd'hui ne récupère ni le dossier, ni un template, ni un index, et doit réinventer la convention. C'est une dérive entre la méthode pratiquée et la méthode scaffoldée.

À ça s'ajoute un problème de chargement contextuel : sans index, un agent doit soit tout lire à chaque session (coûteux, noyé dans le bruit), soit ignorer les ADRs (perdant la mémoire des décisions). Le pattern `memory/MEMORY.md` qui indexe `cortex/*` existe déjà — on l'applique aux ADRs.

## Proposed solution

Ajouter au scaffold `method/adr/` trois fichiers :

- **`README.md`** — 1 page : "qu'est-ce qu'un ADR, quand en écrire un, comment l'indexer". Court, opinionated.
- **`ADR-template.md`** — structure standard : Context / Decision / Backward compatibility / Consequences / Status. Aligne avec `ADR-0001` existant.
- **`INDEX.md`** — table `Code | Title | Status | When to load`. Chargée systématiquement par les agents au démarrage. Un ADR individuel n'est lu que si son scope matche le task courant.

Mettre à jour `method/skills/session-start.md` pour préciser : "lire `adr/INDEX.md` au démarrage ; charger un ADR individuel uniquement si son `When to load` matche le task".

## Definition of done

- [ ] `method/adr/` existe avec `README.md` + `ADR-template.md` + `INDEX.md`
- [ ] `lyt init` crée `.lytos/adr/` avec ces 3 fichiers
- [ ] Test d'intégration `tests/commands/init.test.ts` vérifie la présence des 3 fichiers post-init
- [ ] `method/skills/session-start.md` documente la règle "lire INDEX, charger ADRs à la demande"
- [ ] `lyt lint` n'émet aucune erreur si `adr/` est absent (rétrocompat — projets v1 pas cassés)
- [ ] Documentation à jour dans `method/` (référence à la convention ADR)

## Checklist

### Scaffold (method/)
- [ ] Créer `method/adr/README.md`
- [ ] Créer `method/adr/ADR-template.md`
- [ ] Créer `method/adr/INDEX.md` (table vide + en-tête)

### CLI (init logic)
- [ ] Vérifier `src/lib/scaffold.ts` : les nouveaux fichiers doivent être copiés par `lyt init`
- [ ] Étendre `tests/commands/init.test.ts` : assert sur la présence post-init

### Session-start skill
- [ ] Ajouter une sous-section "ADRs : index obligatoire, lecture sélective" dans `method/skills/session-start.md`

### Linter — rétrocompat
- [ ] Vérifier que `lyt lint` reste silencieux si `adr/` est absent (pas de warning soft pour les projets v1)

## Relevant files

- `method/adr/` (nouveau)
- `src/lib/scaffold.ts` (logique de copie init)
- `tests/commands/init.test.ts`
- `method/skills/session-start.md`

## Notes

- **Cohérence pattern** : mêmes principes que `memory/MEMORY.md` qui indexe `cortex/*` — l'agent lit l'index toujours, le contenu à la demande.
- **Rétrocompatibilité** : projets existants sans `adr/` ne doivent rien casser. C'est purement additif.
- **Hors scope** : commande `lyt adr new <slug>` qui crée un ADR + met à jour l'index automatiquement. Peut faire l'objet d'une issue future si la discipline manuelle de l'index s'avère insuffisante (signal : ADRs apparaissent sans entrée d'index).
- **Cross-repo** : `lytos-app` n'a pas besoin de bouger. Le `.lytos/adr/` est consommé par les agents (Claude Code, Cursor, ...), pas par l'App qui ne projette que le board.
