---
id: ISS-0084
title: "Aligner ADR-0003 sur l'implémentation de `lyt absorb` (merge vs overwrite, --apply, active-issue)"
type: docs
priority: P2-normal
effort: S
complexity: light
domain: [audit, adr, cli]
skill: ""
skills_aux: []
status: 1-backlog
branch: "docs/ISS-0084-align-adr-0003-absorb"
depends: [ISS-0076]
created: 2026-06-14
updated: 2026-06-14
schema_version: 2
---

# ISS-0084 — Aligner ADR-0003 sur l'implémentation de `lyt absorb`

## Context

Découvert lors de la review de Sprint #03 (ISS-0076). ADR-0003 §2 décrit une sémantique « overwrite / SET » et affirme que `lyt absorb` réécrit les champs dérivés du journal, mais le code ne *merge* que les clés **présentes** du delta (`updatedFm[key] = value`) — il ne nettoie jamais les champs que le journal courant cesse de produire. Vérifié : réduire le journal à une seule ligne implementer laisse `ai_reviewer` / `cost_usd` / `skills_used` périmés dans le frontmatter. Inoffensif dans le workflow append-only / per-session documenté, mais l'ADR (le **contrat d'audit**) affirme littéralement « overwrite ».

Deux dérives connexes :
- L'ADR documente `lyt absorb [issue-id] [--dry-run] [--json]`, mais le flag livré est `--apply` (dry-run par défaut, plus sûr) — `--dry-run` est rejeté (exit 1).
- La résolution active-issue §2 conflate l'attribution par-ligne du journal et la résolution au niveau commande (arg explicite → `ISS-####` dans la branche → unique `3-in-progress/` → erreur).

## Proposed solution

- **Option A** (si on garde le wording) : nettoyer l'ensemble des champs « command-owned » avant d'appliquer le delta → vrai overwrite.
- **Option B** : assouplir le wording ADR en « merges present fields ».
- Dans les deux cas : corriger la signature documentée (`--apply`), préciser la résolution active-issue.

## Definition of done

- [ ] ADR-0003 §2 et le code de `lyt absorb` sont cohérents sur la sémantique (décision tranchée + implémentée).
- [ ] Signature documentée = signature livrée (`--apply`, dry-run par défaut).
- [ ] Wording de la résolution active-issue précisé.
- [ ] Test couvrant la sémantique retenue (champ périmé nettoyé OU explicitement conservé).
