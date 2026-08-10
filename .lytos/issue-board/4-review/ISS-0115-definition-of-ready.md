---
id: ISS-0115
title: Definition of Ready — le gate d'entrée, jumeau de la DoD
type: feat
priority: P1-high
effort: M
complexity: standard
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
# ISS-0115 — Attraper l'ambiguïté avant de dépenser des tokens

## Contexte

Le park-on-ambiguity (ADR-0004 §3) est **réactif** : on s'arrête *après* avoir heurté
l'ambiguïté. Un gate de « prêt » déplace ça à gauche : une issue sous-spécifiée n'entre
pas dans le loop (ADR-0007 §3). C'est ce qui transforme « 40 % des parks = ambiguous-spec »
en prévention.

## Le geste

Une issue est **ready** si : scope clair, contraintes énoncées, **hors-scope explicite**,
DoD testable (ADR-0004 §4), `risk` renseigné. Section `## Ready` normée dans le template.
`lyt next` **refuse** une issue non-ready (nouvelle raison d'inéligibilité `not-ready`) ;
`lyt lint` la signale. Complète la loop-éligibilité existante (DoD machine-vérifiable).

## Definition of done

- [ ] Critères de Ready définis + section `## Ready` au template (projet + method/), doc L1 — *verify: human*
- [x] `lyt next` : une issue non-ready n'est pas éligible (raison `not-ready`) — *verify: auto*
- [x] `lyt lint` signale les issues du sprint non-ready — *verify: auto*
- [x] Tests : ready complet / champ manquant / hors-scope absent — *verify: auto*
- [ ] Les critères sont-ils suffisants sans être bureaucratiques — *verify: human*

## Notes

- Jumeau amont de la DoD. Étend `lyt next` (ISS-0099). Réf : ADR-0007 §3.

## Audit — 2026-08-10

**Verdict:** NO_GO

### Checks
- [x] Tests pass (313)
- [ ] Issue checklist complete
- [x] Rules respected
- [ ] Documentation aligned

### Notes
The Ready analyzer and template section are present, but the documentation criterion is unchecked and `lyt lint` reports its `verify: doc L1` item as unqualified. The human sufficiency criterion is also still pending.

### To fix before next review
- [x] Complete the Ready documentation and explicitly record the human scope review.
- [x] Use a verification marker accepted by the current parser, or implement support for the documented level marker.

## Response to audit — 2026-08-10

**Partly accepted.** The audit was right that the documentation criterion was incomplete, but the
gap was narrower than "the Ready section is missing": `issue-feature.md` already carried a full
`## Ready` section. What was missing was the other half of the surface.

Delivered:

- `method/issue-board/templates/issue-task.md` — a `## Ready` section sized for a task: the
  out-of-scope line plus `risk:`, and nothing else. A task is XS/S; asking for the four-field form
  there would be the bureaucracy this issue's own human criterion asks you to guard against. The
  note says so explicitly, and points out that an agent hitting ambiguity mid-work will park it
  `ambiguous-spec` anyway — Ready moves that cost left, it does not add a new one.
- `method/rules/default-rules.md` — the Ready criteria, the `lyt lint` / `lyt next` consequences
  (`not-ready` ineligibility), and the proportionality caveat, in the rules every generated
  project receives.
- Propagated to `.lytos/` via `lyt upgrade --force`.

The `verify: doc L1` marker is now `verify: human`, per the decision to keep the ISS-0101 taxonomy
closed at `auto | human`; the doc level stays in the item text. ISS-0116 owns making levels
first-class.

Remaining, and genuinely yours: whether these criteria are sufficient without being bureaucratic.
The concrete way to answer it — would you accept filling this in on an XS task?
