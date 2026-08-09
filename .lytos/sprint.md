# Sprint #05 — Standards exécutables & proportionnalité (ADR-0005 + ADR-0007)

> **Objective**: Intégrer **en priorité** le socle standards. Le quality kit (ISS-0107) rend les gates réels ; la matrice risque→gates (ISS-0114) les rend proportionnels (rien n'est « toujours on ») ; la Definition of Ready (ISS-0115) déplace l'ambiguïté à gauche. C'est le cœur d'ADR-0005/0007 — la rigueur qui assure du bon code quelle que soit la stack, sans sur-ingénierie.
> **Start**: 2026-08-09
> **Target end**: 2026-08-20 *(sprint un peu plus large : deux issues heavy)*

---

## Why this sprint

Après le rail (#04), le loop peut sélectionner, garer et s'arrêter — mais rien ne garantit encore que le code rendu est **bon**. Ce sprint pose les gates et leur proportionnalité.

- **ISS-0107** (quality kit) est la **fondation** : le kit versionné qui héberge le contrat de stack, les configs de gates (+ dimensions repliées d'ADR-0007 : secrets, repro, audit deps, perf, observabilité, compat, doc L0/L3) et la rubrique du relecteur. Tout le reste en dépend.
- **ISS-0114** (matrice risque→gates) est le **keystone anti-sur-ingénierie** : le champ `risk` sélectionne les gates dus — audit sécu sur `high`, pas sur une typo.
- **ISS-0115** (Definition of Ready) est le **jumeau amont de la DoD** : une issue non-ready n'entre pas dans le loop. Prévention, pas post-mortem.

Rappel : le kit est **stack-agnostique** — chaque dimension est universelle, branchée sur un outil par-stack (comme la conformité DS). C'est ça, « bon quelle que soit la stack ».

---

## Tasks

| Issue | Title | Effort | Depends | Status |
|-------|-------|--------|---------|--------|
| ISS-0107 | Quality kit versionné — Pilier Standards exécutable | L | — | sprint |
| ISS-0114 | Matrice risque → gates (proportionnalité) | M | ISS-0107 | sprint |
| ISS-0115 | Definition of Ready — le gate d'entrée | M | — | sprint |

---

## Suggested order

1. **ISS-0107** d'abord — fondation ; les gates n'existent nulle part ailleurs.
2. **ISS-0114** après le kit — la matrice sélectionne dans les configs du kit.
3. **ISS-0115** en parallèle — indépendant ; étend `lyt next` (livré au #04).

## Dependency graph

```
ISS-0107 (quality kit) ── ISS-0114 (risk → gate matrix)
ISS-0115 (Definition of Ready) ── indépendant
```

---

## Out of scope / notes

- **ISS-0116** (niveaux de doc L0–L4) suit immédiatement au #06 — P2, dépend du kit.
- Le **review packet (ISS-0103)** et la **checklist/sign-off (ISS-0104)** glissent au **#06** : on priorise les standards, comme demandé.
- **ISS-0067** traîne encore dans `2-sprint` (reliquat #03) — non rattaché à #05. À fermer ou reverser au backlog.
- **Sprint #04** : ses 4 issues sont en `4-review`, en attente de `lyt close`. Elles finissent leur review pendant #05.
- ADR-0005 / ADR-0007 sont en `Proposed` — passage en `Accepted` par l'humain, prérequis assumé.

---

## Roadmap vers le but (multi-sprint)

- **#04 — Le rail** ✅ *(livré, en review)* : primitives décidables — ISS-0099, 0100, 0101, 0102.
- **#05 — Standards & proportionnalité** *(ce sprint)* : quality kit (0107) + matrice risque→gates (0114) + Definition of Ready (0115).
- **#06 — Le gate humain & fermeture** : review packet (0103), checklist/sign-off (0104), niveaux de doc (0116), injection vérité-terrain (0108), conformité DS (0109), rapport de sprint (0105), propagation `lytos-method` (0106), clôture de l'épic ISS-0098.

> **ADR-0007** affine ADR-0005 : la rigueur suit le risque. Les dimensions oubliées (observabilité, sécu, perf, compat, reproductibilité) sont **repliées dans le quality kit (ISS-0107)** comme checkers sélectionnés par la matrice — pas 8 issues de plus.

### Track — Le contrat de capacité humaine (ADR-0008)

Issu d'un red-team/blue-team (deux panels adverses) : le côté *humain* de « human-governed » était présumé, jamais outillé. Attaque et défense ont convergé sur les mêmes ajouts — trois faces, toutes risk-tiered :

- **Compréhension** : **ISS-0117** — explain-back de mémoire avant `close` (`verify: human-comprehension`).
- **Compétence** : **ISS-0118** — métrique d'exposition au jugement (la dette au bilan) ; **ISS-0119** — mode `learning` (inverser le routage) + rotation + diffs-pièges relecteur.
- **Opérabilité** : **ISS-0120** — runbook L4 exécutable + observabilité (risk: high) ; **ISS-0121** — loop-C (prod→issue) + MTTR.

Answer-issues transverses (affinent des ADR antérieurs) : **ISS-0122** — décorrélation mesurée + juges non-LLM + filets aval (ADR-0004 §5/0005/0007) ; **ISS-0123** — journaliser le raisonnement rejeté (ADR-0006). ADR-0008 inscrit ses **conditions de falsifiabilité** (cohorte C≥A, MTTR A/B, kill-rate) — la méthode s'engage à être réfutable.

**Transmission (face compétence, forme lisible)** : **ISS-0124** — `lyt journal`, le journal de bord dérivé (changelog du *pourquoi* + sommaire cliquable + carnet de compagnonnage), rendu dans l'App. **ISS-0125** *(icebox)* — mode elearning : le prof interactif posé au-dessus du journal, avec `dev_level` à l'init.

### Track parallèle — Continuité multi-surface & multi-user (ADR-0006)

Déjà en grande partie construite — `claim`/`unclaim` (ISS-0041/0042), `pull-notes` (ISS-0096), union-merge (ISS-0093), `board --remote` (ISS-0043), compat surfaces (ISS-0040). ADR-0006 ne laisse que **trois trous**, insérables dans n'importe quel sprint (indépendants du loop) :

- **ISS-0110** — `lyt checkpoint` (filet : commit WIP + push au changement de surface).
- **ISS-0112** — convention de note de handoff WIP (le contexte portable est l'issue, pas le chat).
- **ISS-0111** — `lyt resume` (« où j'en étais » à travers repos/surfaces) — dépend d'ISS-0112.

Côté surface-handoff UX (VSCode, App « continue where you left off ») : direction 2, repo `lytos-app`.

---

## Previous sprints

### Sprint #04 — Poser le rail (2026-08-09) ✅ Livré (en review)
ISS-0099 (`lyt next`), ISS-0100 (`parked` + `lyt park`), ISS-0101 (DoD `verify:`), ISS-0102 (`lyt budget`). Code + tests (282 verts), en `4-review` en attente de `close`.

### Sprint #03 — Boucler le schema v2 (2026-06-13 → 2026-06-20) ⚠️ Partiel
ISS-0076 (AI wrapper) et ISS-0077 (migrate-frontmatter) livrés. ISS-0067 (propagation vers `lytos-method`) reste ouvert → reporté.

### Sprint #02 — Rename socle → lytos (2026-04-14 → 2026-04-20) ✅
ISS-0011 → ISS-0015 : rename de toutes les références « socle » → « lytos » dans les repos method / CLI / website, publication npm, configuration des domaines.

### Sprint #01 — CLI MVP (2026-04-13 → 2026-04-13) ✅
ISS-0001 → ISS-0007 : Setup, init, board, tests, CI, npm publish.
