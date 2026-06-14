---
id: ISS-0085
title: "lyt migrate-frontmatter : reporter le compte `written` réel + warn sur skip silencieux"
type: fix
priority: P3-low
effort: S
complexity: light
domain: [cli, audit]
skill: ""
skills_aux: []
status: 1-backlog
branch: "fix/ISS-0085-migrate-report-written-count"
depends: [ISS-0077]
created: 2026-06-14
updated: 2026-06-14
schema_version: 2
---

# ISS-0085 — migrate-frontmatter : rapport `written` réel + skip non silencieux

## Context

Review Sprint #03 (ISS-0077). `printReport()` affiche `Migrated ${plan.toMigrate}` au lieu du `written` réel. Si un fichier est compté dans le plan (`parseFrontmatter` l'accepte) mais que `insertFields()` renvoie `null`, `applyMigration` fait `continue` **sans log** → le rapport surévalue le nombre d'écritures et le skip est silencieux (viole « no silent failures »). Atteignable quand la fence ouvrante a un espace en fin (`--- \n`, accepté par `parseFrontmatter` `/^---\s*\n/` mais rejeté par `insertFields` `/^---\r?\n/`) ou une ligne vide en tête. Très faible probabilité sur les fichiers générés par Lytos (toujours `---\n`), mais réel.

## Proposed solution

Reporter `written` en mode `--apply`, et avertir explicitement quand `written < toMigrate` (lister les fichiers sautés + la raison).

## Definition of done

- [ ] Le rapport `--apply` affiche le nombre réellement écrit.
- [ ] Un skip (`insertFields` null) émet un warning explicite, jamais silencieux.
- [ ] Test : fichier avec fence à espace → skip rapporté.
