---
id: ISS-0125
title: "Mode elearning — le compagnonnage interactif (icebox)"
type: feat
priority: P3-low
effort: L
complexity: heavy
domain: [app, method]
skill: ""
skills_aux: []
status: 0-icebox
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0124]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0125 — Le prof qui s'appuie sur le journal (gelé pour l'instant)

## Contexte

Idée de réflexion, **gardée en icebox**. Le journal de bord (ISS-0124) est le *manuel*
passif ; l'elearning serait le *prof* actif, posé au-dessus. À la fin d'un sprint (ou à la
demande), l'IA propose un débrief : ce qui a été fait, comment, et l'humain interroge pour
comprendre la technique. C'est la face « compétence » d'ADR-0008 en forme *active*.

## Pistes (non tranchées)

- **Niveau du dev demandé à `lyt init`** (`dev_level: junior|confirmé|senior`) → module la
  précision des questions ; pourrait aussi moduler la verbosité du journal (ISS-0124).
- **Socratique > passif** : l'IA *interroge aussi* avant d'expliquer (rappel actif), et
  propose le curriculum (surface les points non-évidents que l'humain ne saurait pas demander).
- **La session produit du durable** : son transcript alimente le journal-récit (pas de déchet).
- **Signal doux** vers la métrique d'exposition au jugement (ISS-0118) — jamais une note.
- Cadence : rituel de fin de sprint (recoupe la rétro, ISS-0071) + toujours dispo à la demande.

## Garde-fou à ne pas oublier au dégel

**Prof ≠ implémenteur** (autre modèle/provider) et **ancré dans les tests/le comportement**,
pas dans l'auto-récit : sinon l'IA transmet un *faux* modèle mental avec aplomb. L'elearning
*transmet* la compréhension ; il ne *garantit pas* la justesse (ça reste le job des gates).

## Sortie d'icebox

À sortir post-MVP, une fois le journal (ISS-0124) livré et le contrat de capacité humaine
(ADR-0008) stabilisé. Dépend d'ISS-0124 (le support de lecture).
