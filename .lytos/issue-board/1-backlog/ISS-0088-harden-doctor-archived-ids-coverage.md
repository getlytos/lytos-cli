---
id: ISS-0088
title: "doctor : durcir collectArchivedIssueIds + wirer @vitest/coverage-v8"
type: fix
priority: P3-low
effort: M
complexity: standard
domain: [cli, doctor, tests]
skill: ""
skills_aux: []
status: 1-backlog
branch: "fix/ISS-0088-harden-doctor-archived-ids-coverage"
depends: [ISS-0060]
created: 2026-06-14
updated: 2026-06-14
schema_version: 2
---

# ISS-0088 — doctor : durcir collectArchivedIssueIds + coverage

## Context

Review Sprint #03 (ISS-0060). `collectArchivedIssueIds` grep tout token `ISS-XXXX` dans `archive/INDEX.md`, donc un ID mentionné **uniquement en prose** (pas une vraie entrée archivée) est accepté comme cible de dépendance valide (vérifié : `depends:[ISS-7777]` passe si `ISS-7777` est cité dans une phrase de l'INDEX). Implémenté exactement comme spécifié dans ISS-0060, mais durcissable. Par ailleurs la couverture `>=80%` (DoD d'ISS-0060) est auto-affirmée : `@vitest/coverage-v8` n'est pas installé, donc non mesurable en CI.

## Proposed solution

Parser les lignes de tableau de l'INDEX (ou s'appuyer sur les noms de fichiers archivés, déjà collectés précisément) au lieu de tokens en texte libre. Installer + wirer `@vitest/coverage-v8`.

## Definition of done

- [ ] `collectArchivedIssueIds` n'accepte plus un ID cité seulement en prose.
- [ ] `@vitest/coverage-v8` installé et couverture mesurable (`vitest run --coverage`).
- [ ] (Optionnel, noté) doctor.ts découpé si la règle 300 lignes le justifie.
