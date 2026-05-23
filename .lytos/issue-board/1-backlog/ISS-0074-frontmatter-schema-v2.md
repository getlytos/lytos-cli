---
id: ISS-0074
title: "Frontmatter schema v2 (auditabilité durable)"
type: feat
priority: P1-high
effort: L
complexity: heavy
domain: [schema, parser, template, audit]
skill: code-structure
skills_aux: [testing, documentation]
status: 1-backlog
branch: "feat/ISS-0074-frontmatter-schema-v2"
depends: []
created: 2026-05-23
updated: 2026-05-23
---

# ISS-0074 — Frontmatter schema v2 (auditabilité durable)

## Context

Le frontmatter actuel est calibré pour un workflow MVP écrit à la main. Il ne porte aucune information d'auditabilité : qui a implémenté (humain et IA), qui a reviewé, à quel coût en tokens et en argent, sur quels prompts/skills exactement, avec quel verdict, quel risque, quelle confiance.

C'est exactement ce qui sépare Lytos du vibecoding. Sans ces champs, on perd la trace dès que la session IA se ferme. Avec, on peut répondre dans deux ans : *quelle IA a fait ça, qui l'a managé, à quel coût ?*

Décision durable : voir [`ADR-0001-frontmatter-schema-v2`](../../adr/ADR-0001-frontmatter-schema-v2.md).

## Proposed solution

Étendre le frontmatter avec ~15 nouveaux champs **tous optionnels et rétrocompatibles**, organisés en 5 catégories : human accountability, AI traceability, lifecycle, audit & cost, decision & risk, Git artifacts.

L'implémentation se déroule en **5 phases indépendantes** (chacune shippable) :

1. **Spec + parser** — accepter les nouveaux champs sans les utiliser
2. **Read support** — afficher les nouveaux champs dans `lyt board`, `lyt doctor`
3. **Write support automatique** — `lyt start` / `lyt review` / `lyt close` écrivent lifecycle + verdict
4. **AI wrapper integration** — issue séparée pour chaque cible (Claude Code, Cursor, ...)
5. **Migration helper** — `lyt migrate-frontmatter` pour backfill sur repos existants

## Definition of done

- [ ] L'ADR-0001 est mergée et référencée dans `manifest.md`.
- [ ] Le template `issue-feature.md` est mis à jour (champs v2 commentés "auto" vs "manuel").
- [ ] Le validateur accepte tous les nouveaux champs avec leur domaine de valeur.
- [ ] Le parser ignore poliment les champs inconnus (forward-compat).
- [ ] Aucune issue v1 existante ne casse — tests de régression sur tout le board actuel.
- [ ] `lyt doctor` signale les issues v1 en warning soft, pas en erreur.
- [ ] `lyt start` / `lyt review` / `lyt close` écrivent les champs lifecycle automatiquement.
- [ ] `lyt review --verdict go|no-go|pending` écrit `review`.
- [ ] Documentation à jour dans `method/` et `docs/`.
- [ ] Tests : parsing, validation, write paths, migration.

## Checklist

### Phase 1 — Spec + parser
- [ ] Mettre à jour `issue-feature.md` (template) avec les champs v2 commentés.
- [ ] Étendre le parser pour accepter tous les champs optionnels v2.
- [ ] Étendre le validateur avec les domaines de valeurs (review, risk, validation.*).
- [ ] Tests parser : v1 valide, v2 valide, champs inconnus ignorés, valeurs hors domaine rejetées.

### Phase 2 — Read support
- [ ] `lyt board` affiche `review` / `assignee` quand présents.
- [ ] `lyt doctor` détecte les issues v1 et propose la migration.
- [ ] Tests E2E sur un repo mixte v1/v2.

### Phase 3 — Write support automatique
- [ ] `lyt start` écrit `started_at` + `assignee` (depuis git config).
- [ ] `lyt review` écrit `review_at`, `reviewer`, et `review` selon `--verdict`.
- [ ] `lyt close` écrit `completed_at` + `commits` (via git log).
- [ ] Tests : chaque commande modifie correctement le frontmatter et garde le YAML propre.

### Phase 4 — AI wrapper integration
- [ ] Créer une issue dédiée par cible (Claude Code, Cursor, Codex CLI).
- [ ] Documenter le contrat d'écriture (`ai_implementer`, tokens, cost).

### Phase 5 — Migration
- [ ] `lyt migrate-frontmatter` ajoute `schema_version: 2` sur tout repo.
- [ ] Backfill `started_at`/`completed_at` quand devinables depuis git log.
- [ ] Dry-run par défaut, `--apply` explicite.

## Relevant files

- `.lytos/adr/ADR-0001-frontmatter-schema-v2.md` (décision)
- `.lytos/issue-board/templates/issue-feature.md`
- `src/lib/parser.ts` (ou équivalent — le parser frontmatter)
- `src/lib/validator.ts`
- `src/commands/start.ts` / `review.ts` / `close.ts`
- `method/` (documentation utilisateur)

## Notes

- **Rétrocompatibilité absolue** : non négociable. Tout repo v1 doit continuer à fonctionner sans modification.
- **Auto-population** : les champs v2 ne doivent quasi jamais être écrits à la main — l'adoption échoue si on impose du remplissage manuel. Cf. table dans l'ADR.
- **Cross-repo** : la livraison de la phase 1 + phase 3 (au minimum `review`) débloque l'issue lytos-app **ISS-0018** (dot vert/rouge). Coordonner les deux côtés.
- **Hors scope** : système de commentaires, permissions par issue, sub-tasks. Lytos n'est pas Jira.
- **Évolutions futures** : v3 nécessitera un nouvel ADR. Cette issue ne fixe pas le futur, seulement le présent v2.
- Le manifest lytos-app a été mis à jour avec une ligne explicite « On préfère l'auditabilité durable plutôt que la vitesse jetable » qui justifie ce schéma — voir manifest lytos-app, section Principes.
