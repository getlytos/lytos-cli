# Sprint #03 — Boucler le schema v2 (auditabilité durable)

> **Objective**: Terminer l'épic du frontmatter schema v2 (ADR-0001) ouvert par ISS-0074. Les deux phases restantes (AI wrapper, migration) + la propagation manquante de la règle implementer/auditor à `lytos-method` ferment la boucle de l'auditabilité durable — le différenciateur cœur de Lytos.
> **Start**: 2026-06-13
> **Target end**: 2026-06-20

---

## Why this sprint

ISS-0074 a livré le spec + les phases 1–3 du schema v2 (lecture + write-paths de `lyt start` / `lyt review` / `lyt close`). Il reste deux trous concrets :

- **Phase 4 (ISS-0076)** — les champs les plus distinctifs (`ai_implementer`, `tokens`, `cost`, `skills_used`) ne peuvent être remplis que par le wrapper IA qui pilote la session. Sans eux, le schema v2 a un trou exactement là où Lytos prétend se distinguer du vibecoding.
- **Phase 5 (ISS-0077)** — les issues existantes (`5-done/`, archive, icebox) restent en v1 et `lyt doctor` émet une info par issue. Sur **ce repo même**, doctor signale encore 9 infos `schema-v1` qu'une migration one-shot efface.
- **Propagation (ISS-0067)** — la section « implementer ≠ auditor » introduite par ISS-0059 n'a jamais été propagée à `lytos-method`, en violation de la règle de propagation des cli-rules. Petit reliquat d'audit, cohérent avec le thème.

---

## Tasks

| Issue | Title | Effort | Depends | Status |
|-------|-------|--------|---------|--------|
| ISS-0077 | `lyt migrate-frontmatter` — backfill schema_version + lifecycle (phase 5) | M | ISS-0074 ✅ | sprint |
| ISS-0076 | AI wrapper integration — write ai_implementer / tokens / cost (phase 4) | M | ISS-0074 ✅ | sprint |
| ISS-0067 | Propagate implementer/auditor section to lytos-method | XS | — | sprint |

---

## Suggested order

1. **ISS-0077** d'abord — self-contained, valeur immédiate (efface les infos `schema-v1` de `lyt doctor`), et exerce les write-paths v2 sur l'ensemble du board.
2. **ISS-0076** ensuite — nécessite un peu de design (comment le wrapper écrit les champs), le plus structurant des trois.
3. **ISS-0067** à tout moment — XS, propagation docs vers `lytos-method`, sans dépendance.

## Dependency graph

```
ISS-0074 (done) ──┬── ISS-0077 (migrate-frontmatter)
                  └── ISS-0076 (AI wrapper integration)
ISS-0067 (propagation) ── independent
```

---

## Out of scope / notes

- ISS-0076 touche le contrat avec les wrappers (Claude Code, Cursor, Codex). La spec d'intégration par cible peut elle-même se découper en sous-issues si nécessaire — voir le corps d'ISS-0076.
- ISS-0067 implique un commit sur le repo `lytos-method` (hors `lytos-cli`). À traiter via son propre repo/branche au moment de l'exécution.

---

## Previous sprints

### Sprint #02 — Rename socle → lytos (2026-04-14 → 2026-04-20) ✅
ISS-0011 → ISS-0015 : rename de toutes les références « socle » → « lytos » dans les repos method / CLI / website, publication npm, configuration des domaines.

### Sprint #01 — CLI MVP (2026-04-13 → 2026-04-13) ✅
ISS-0001 → ISS-0007 : Setup, init, board, tests, CI, npm publish.
