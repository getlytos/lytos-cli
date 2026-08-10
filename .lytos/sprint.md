# Sprint #06 — Les surfaces de lecture dérivées (le gate humain)

> **Objective**: Donner à l'humain de quoi *gouverner* ce que le loop produit. Trois vues **dérivées** des issues, même famille (elles lisent le frontmatter + assemblent un récit) : le **review packet** par issue (ISS-0103), le **rapport de sprint** agrégé (ISS-0105), le **journal de bord** du projet (ISS-0124). Le socle (#04 rail + #05 standards) produit la matière ; ce sprint la rend lisible et gouvernable.
> **Start**: 2026-08-09
> **Target end**: 2026-08-20

---

## Why this sprint

Le loop sait sélectionner, garer, gater, s'arrêter — mais l'humain au gate ne peut gouverner que ce qu'il *voit*. Ces trois surfaces sont l'interface autopilote→pilote.

- **ISS-0103** (review packet) est le cœur : diff + preuves de gates + parks + checklist human + verdict + audit, en layout **doute-first** (le vert relégué en fin). Consomme tout ce qu'on a bâti (DoD `verify:`, `park`, `gates`).
- **ISS-0105** (rapport de sprint) agrège les packets : done/parked, budget, couverture — la vue d'ensemble.
- **ISS-0124** (`lyt journal`) est le récit du *pourquoi*, dérivé et chronologique — trois lecteurs (stakeholder, onboarding, apprenant).

Elles partagent une base commune (lecture de frontmatter + assemblage) — d'où le regroupement.

---

## Tasks

| Issue | Title | Effort | Depends | Status |
|-------|-------|--------|---------|--------|
| ISS-0103 | `lyt report ISS-X` — review packet (doute-first) | L | ISS-0100, ISS-0101 | 4-review ✅ |
| ISS-0105 | `lyt report --sprint` — agrégat des packets | M | ISS-0103 | 4-review ✅ |
| ISS-0124 | `lyt journal` — journal de bord dérivé | M | — | 4-review ✅ |

> **État au 2026-08-09** : les 3 vues dérivées sont livrées (code + tests), 313 tests verts, en `4-review`. `lyt report ISS-X` (packet doute-first), `lyt report --sprint` (agrégat), `lyt journal` (récit du pourquoi) — toutes dogfoodées sur ce repo.

## Suggested order

1. **ISS-0103** d'abord — le cœur ; 0105 en dépend, et il pose la base de lecture partagée.
2. **ISS-0105** après 0103 — agrège les packets.
3. **ISS-0124** en parallèle — indépendant.

## Dependency graph

```
ISS-0103 (review packet) ── ISS-0105 (sprint report)
ISS-0124 (journal) ── indépendant
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

### Sprint #05 — Standards & proportionnalité (2026-08-09) ✅ Livré (en review)
ISS-0107 (quality kit dogfoodé), ISS-0114 (`lyt gates`, matrice risque→gates), ISS-0115 (Definition of Ready via `lyt next`/`lyt lint`). 303 tests verts, en `4-review`.

### Sprint #04 — Poser le rail (2026-08-09) ✅ Livré (en review)
ISS-0099 (`lyt next`), ISS-0100 (`parked` + `lyt park`), ISS-0101 (DoD `verify:`), ISS-0102 (`lyt budget`). Code + tests (282 verts), en `4-review` en attente de `close`.

### Sprint #03 — Boucler le schema v2 (2026-06-13 → 2026-06-20) ⚠️ Partiel
ISS-0076 (AI wrapper) et ISS-0077 (migrate-frontmatter) livrés. ISS-0067 (propagation vers `lytos-method`) reste ouvert → reporté.

### Sprint #02 — Rename socle → lytos (2026-04-14 → 2026-04-20) ✅
ISS-0011 → ISS-0015 : rename de toutes les références « socle » → « lytos » dans les repos method / CLI / website, publication npm, configuration des domaines.

### Sprint #01 — CLI MVP (2026-04-13 → 2026-04-13) ✅
ISS-0001 → ISS-0007 : Setup, init, board, tests, CI, npm publish.
