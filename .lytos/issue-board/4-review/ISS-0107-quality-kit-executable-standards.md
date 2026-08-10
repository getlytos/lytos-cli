---
id: ISS-0107
title: Quality kit versionné — Pilier Standards exécutable
type: feat
priority: P1-high
effort: L
complexity: heavy
domain: [cli, method]
skill: 
skills_aux: []
status: 4-review
branch: claude/claude-loops-lytos-wtkc94
depends: []
created: 2026-08-09
updated: 2026-08-10
schema_version: 2
assignee: Claude
started_at: 2026-08-09
---
# ISS-0107 — Rendre le Pilier 3 (Standards) exécutable

## Contexte

ADR-0004 dit qu'il faut *gater* la qualité, pas la demander. ADR-0005 dit *avec quoi*.
Aujourd'hui `rules/` est de la prose : « préfère KISS » ne fait rien. Il faut **lier
chaque règle à un vérificateur**, et regrouper ça dans un kit versionné qui voyage avec
le repo (multi-projet → on ne mémorise pas quelle config).

## Le geste

Un kit `.lytos/quality/` par projet : **contrat de stack** (versions épinglées + deps
allow-listées + `no-new-dependency-without-ADR` + source des docs), **configs de gates**
(lint/type/format/archi/complexité + les dimensions repliées d'ADR-0007 : secrets,
reproductibilité du build, audit de deps, budget perf/taille en régression, observabilité
/« fail with context », compat/migrations, doc L0/L3), **rubrique du relecteur** (prompt
versionné). Chaque dimension est **sélectionnée par la matrice risque** (ISS-0114), pas
appliquée uniformément. Les items `verify: auto` de la DoD (ISS-0101) **pointent** vers
une entrée du kit. Les règles
non gatables sont marquées `reviewer-judged` ou `human-checked` — jamais « appliquée » en
silence. Signaux anti-sur-ingénierie inclus : taille de diff vs `effort`, complexité,
nb de nouvelles abstractions.

## Definition of done

- [x] Structure `.lytos/quality/` + schéma du contrat de stack — *verify: auto*
- [x] Dimensions repliées d'ADR-0007 présentes comme checkers (secrets, repro, audit deps, perf, observabilité, compat, doc L0/L3) — *verify: auto*
- [x] `lyt doctor` vérifie la présence/cohérence du kit — *verify: auto*
- [x] Convention : un item `verify: auto` référence une entrée de kit résoluble — *verify: auto*
- [ ] Règles non gatables explicitement classées reviewer/human — *verify: human*
- [ ] Doc : comment ajouter une règle exécutable au kit — *verify: human*

## Notes

- Réf : ADR-0005 §1-2. Consommé par les gates d'ADR-0004, ne les pilote pas.
- Propagation méthode suivie par ISS-0106.

## Audit — 2026-08-10

**Verdict:** NO_GO

### Checks
- [x] Tests pass (313)
- [ ] Issue checklist complete
- [x] Rules respected
- [ ] Documentation aligned

### Notes
The kit parser and doctor validation are covered, but both human documentation criteria are unchecked. The template/rules introduce the kit but do not close the explicit review checklist.

### To fix before next review
- [x] Review and document the classification of non-gatable rules as reviewer or human.
- [x] Add and validate user-facing guidance for adding an executable rule, then tick both DoD items.

## Response to audit — 2026-08-10

**Accepted: both documentation criteria were genuinely unwritten.** `method/quality/kit.md` now
carries them.

- **"The three kinds"** — a table stating what `gate` / `reviewer` / `human` mean, who executes
  each, and which failure mode each prevents. The load-bearing sentence: *a rule with no `tool`
  binding is not a rule, it is a wish*. "Prefer KISS" cannot be a gate; it becomes `reviewer` with
  a rubric that says what over-engineering looks like here, or `human`, or it leaves the kit — but
  it never sits in `rules/` looking enforced while nothing checks it.
- **"How to add an executable rule"** — six steps from prose rule to wired gate, with the tier
  guidance that matters (`low` means *every* change pays this cost; most new gates belong at
  `medium,high`) and a worked example across the three kinds.

Two real defects surfaced while writing this, both fixed:

1. **`parseGates` read any 4-column markdown table.** Adding a documentation table to `kit.md`
   silently produced 8 phantom gates. The parser now anchors on the exact `id | kind | tiers |
   tool` header, so a project can document its kit without corrupting its catalog. This was
   latent — it would have hit the first user who added a note table.
2. **`unresolvedGateRefs` compared a lowercased reference against raw ids.** The shipped kit ships
   `doc-L0` and `doc-L3`; every DoD item pinning them was reported unresolved by `lyt doctor`.
   Both sides are lowercased now. Regression test asserts every shipped gate is referenceable.

The `verify: auto` DoD item "an item references a resolvable kit entry" was ticked while defect 2
made it false for two of the shipped gates — worth noting as a case where a machine gate passed
because nothing exercised it on real data. The new test does.

Remaining: your judgment on whether the classification and the guidance read right.
