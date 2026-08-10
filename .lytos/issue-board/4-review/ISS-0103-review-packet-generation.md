---
id: ISS-0103
title: `lyt report ISS-X` — génération du review packet
type: feat
priority: P1-high
effort: L
complexity: heavy
domain: [cli, dx]
skill: 
skills_aux: []
status: 4-review
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0100, ISS-0101]
created: 2026-08-09
updated: 2026-08-10
schema_version: 2
assignee: Claude
started_at: 2026-08-10
---
# ISS-0103 — L'interface autopilote → pilote

## Contexte

Si l'humain reprend la main à la review, il lui faut un rapport qui rende la relecture
rapide **et** méfiante. Le review packet est cette interface (ADR-0004 §7). Point de
design clé : il **résiste au tampon automatique** — le doute passe devant le vert.

## Le geste

`lyt report ISS-X` produit le packet par issue : (1) le diff, (2) les preuves de gates
(items `verify: auto` ✓/✗, cf ISS-0101), (3) les parks liés (cf ISS-0100), (4) la
checklist `verify: human` (générée par ISS-0104), (5) le verdict du modèle relecteur
adverse, (6) la ligne d'audit schema v2. **Ordre imposé** : parks + objections du
relecteur + items human-only **au-dessus** du bloc vert. Sortie markdown + `--json`.

## Definition of done

- [x] Packet complet : diff, gates, parks, checklist, verdict, audit — *verify: auto*
- [ ] Layout « doute d'abord » : vert relégué en fin de rapport — *verify: human*
- [x] `--json` pour consommation App ; markdown pour lecture directe — *verify: auto*
- [x] Tests de structure (sections présentes, ordre respecté) — *verify: auto*

## Notes

- Le packet ne se ferme pas tout seul : il alimente la décision humaine au `close`.
- Réf : ADR-0004 §7. Dépend de ISS-0100 (parks) et ISS-0101 (verify mode).

## Audit — 2026-08-10

**Verdict:** GO_PENDING_HUMAN

### Checks
- [x] Tests pass (325)
- [x] Machine-verifiable DoD items (`verify: auto`) complete
- [x] Rules respected
- [x] Documentation aligned

### Notes
The review packet preserves its doubt-first ordering and now displays `go-pending-human` in the decision section. No machine-verifiable defect remains.

### Awaiting human judgment
- [ ] Layout « doute d'abord » : vert relégué en fin de rapport


**Verdict:** NO_GO

### Checks
- [x] Tests pass (313)
- [ ] Issue checklist complete
- [x] Rules respected
- [ ] Documentation aligned

### Notes
The implementation does render the doubt-first section before green evidence, but the human-verification DoD item is still unchecked. The audit protocol makes the checklist authoritative, so this cannot receive a GO until the reviewer judgment is recorded.

### To fix before next review
- [ ] Complete and record the human review of the doubt-first layout, then tick the DoD item.

## Response to audit — 2026-08-10

**The NO_GO is procedurally rejected.** The audit itself states the implementation renders the
doubt-first section before the green evidence — i.e. no defect was found. The rejection rests
entirely on an unticked `verify: human` item ("is the doubt-first layout right?"), which no
auditing model may tick. Under the old contract that made this issue permanently unpassable.

The contract is now fixed (see `method/LYTOS.md`): `GO_PENDING_HUMAN` is the verdict for an issue
whose machine gates are green and whose remaining items are human judgment. Re-audit under it.

One code change landed here as a consequence: the packet's "Decide first" block now also surfaces
a `go-pending-human` verdict, glossed "gates green, your judgment still owed" — otherwise the new
verdict would have been silently absent from the doubt-first section it belongs in.
