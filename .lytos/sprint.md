# Sprint #04 — Poser le rail : les primitives décidables du loop-B

> **Objective**: Livrer les briques d'ADR-0004 sans conception lourde — le périmètre décidable par machine (`lyt next`), la sortie sûre (`parked` + taxonomie), la classification des gates (DoD `verify:`), et la condition d'arrêt (`lyt budget`). À la fin du sprint, on peut faire tourner à blanc **la sélection + le park** d'un sprint. Le review packet et la checklist (design-lourds) viennent au #05.
> **Start**: 2026-08-09
> **Target end**: 2026-08-16

---

## Why this sprint

ADR-0004 pose le contrat de gouvernance de la boucle autonome. Ces quatre briques en sont la **colonne vertébrale** et débloquent tout l'aval (review packet, checklist). Elles sont volontairement les moins « design-lourdes » du lot, pour livrer vite un socle exécutable et démontrable.

- **ISS-0101** est la fondation : sans le mode de vérification par item de DoD, `lyt next` ne peut pas juger une issue « loop-éligible », et plus tard le packet/checklist ne peuvent pas se découper.
- **ISS-0100** (park) matérialise l'invariant « l'ambiguïté gare, elle ne devine pas » — indépendant, livrable en parallèle.
- **ISS-0099** (`lyt next`) est le périmètre décidable : la seule chose que le loop a le droit de prendre.
- **ISS-0102** (`lyt budget`) donne la condition d'arrêt chiffrée, en s'appuyant sur les champs coût du schema v2 déjà présents.

Rappel manifest : **le CLI n'exécute pas le loop**. Il expose ces primitives ; le wrapper/App orchestrent.

---

## Tasks

| Issue | Title | Effort | Depends | Status |
|-------|-------|--------|---------|--------|
| ISS-0101 | DoD à mode de vérification `verify: auto\|human` | M | — | sprint |
| ISS-0100 | Statut `parked` + `lyt park` + taxonomie de raisons | M | — | sprint |
| ISS-0099 | `lyt next` — sélecteur d'issue éligible au loop | M | ISS-0101 | sprint |
| ISS-0102 | `lyt budget` — garde-fou budget non-interactif | S | — | sprint |

---

## Suggested order

1. **ISS-0101** d'abord — fondation, débloque `lyt next` (et plus tard le packet/checklist).
2. **ISS-0100** en parallèle — indépendant, pas de dépendance.
3. **ISS-0099** après 0101 — a besoin du mode de vérification pour filtrer l'éligibilité.
4. **ISS-0102** à tout moment — S, indépendant.

## Dependency graph

```
ISS-0101 (verify mode) ── ISS-0099 (lyt next)
ISS-0100 (parked)      ── indépendant
ISS-0102 (budget)      ── indépendant
```

---

## Out of scope / notes

- **ISS-0067** est encore dans `2-sprint` : reliquat du sprint #03 (propagation implementer/auditor vers `lytos-method`), **non rattaché** à l'objectif #04. À fermer ou reverser au backlog au prochain point.
- Le **review packet (ISS-0103)**, la **checklist/sign-off (ISS-0104)** et le **quality kit (ISS-0107)** — plus design-lourds — sont pour le **sprint #05**.
- L'épic **ISS-0098** reste ouvert (multi-sprint) ; il se fermera au #06.
- ADR-0004 / ADR-0005 sont en `Proposed` — leur passage en `Accepted` par l'humain est un prérequis assumé avant d'exécuter ces issues.

---

## Roadmap vers le but (multi-sprint)

Le but complet (loop-B sous gouvernance + standards exécutables) tient en trois sprints :

- **#04 — Le rail** *(ce sprint)* : primitives décidables — ISS-0099, 0100, 0101, 0102.
- **#05 — Le gate humain** : quality kit (ISS-0107) + review packet (ISS-0103) + checklist/sign-off (ISS-0104).
- **#06 — Standards exécutables & fermeture** : injection vérité-terrain (ISS-0108), conformité DS (ISS-0109), rapport de sprint (ISS-0105), propagation `lytos-method` (ISS-0106), clôture de l'épic ISS-0098.

---

## Previous sprints

### Sprint #03 — Boucler le schema v2 (2026-06-13 → 2026-06-20) ⚠️ Partiel
ISS-0076 (AI wrapper) et ISS-0077 (migrate-frontmatter) livrés. ISS-0067 (propagation vers `lytos-method`) reste ouvert → reporté.

### Sprint #02 — Rename socle → lytos (2026-04-14 → 2026-04-20) ✅
ISS-0011 → ISS-0015 : rename de toutes les références « socle » → « lytos » dans les repos method / CLI / website, publication npm, configuration des domaines.

### Sprint #01 — CLI MVP (2026-04-13 → 2026-04-13) ✅
ISS-0001 → ISS-0007 : Setup, init, board, tests, CI, npm publish.
