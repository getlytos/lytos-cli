---
id: ISS-0120
title: "Gate d'opérabilité — runbook L4 exécutable + observabilité (risk: high)"
type: feat
priority: P1-high
effort: M
complexity: standard
domain: [cli, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0114]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0120 — Débuggable par qui ne l'a pas écrit

## Contexte

Les deux panels sont d'accord : le cycle Lytos s'arrête à `deploy`, le runbook L4 est
« optionnel » (ADR-0007 §2), il n'y a aucune notion d'opérabilité. Gouverner l'entrée ≠
pouvoir opérer la sortie. Et un runbook en prose vaut zéro (principe d'ADR-0005) — il faut
le rendre exécutable (ADR-0008 §3).

## Le geste

Ajouter à la matrice risque (ISS-0114) : **doc L4 (runbook) obligatoire sur `risk: high`**,
et le runbook porte des commandes que le quality kit **rejoue en CI** (`gate:
runbook-smoke`) — un runbook qui rate son propre smoke échoue le gate. Plus un item
`verify: observability` (erreur structurée « fail with context » + log corrélable) exigé
sur `risk: high`.

## Definition of done

- [ ] Ligne « doc L4 runbook » ajoutée à la matrice pour `risk: high` — *verify: auto*
- [ ] `gate: runbook-smoke` rejoue les commandes du runbook en CI — *verify: auto*
- [ ] Mode `verify: observability` reconnu et exigé sur `risk: high` — *verify: auto*
- [ ] Tests : runbook qui passe/échoue son smoke ; observabilité présente/absente — *verify: auto*
- [ ] Runbook L4 de cette issue, rejoué en CI — *verify: doc L4*

## Notes

- Réf : ADR-0008 §3. Étend la matrice (ISS-0114). L'opérabilité se teste, ne se documente pas.
