---
id: ISS-0104
title: "Bibliothèque de checks structurels + checklist de review + sign-off tracé"
type: feat
priority: P1-high
effort: L
complexity: heavy
domain: [cli, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: claude/claude-loops-lytos-wtkc94
depends: [ISS-0101]
created: 2026-08-09
updated: 2026-08-09
schema_version: 2
---
# ISS-0104 — Une review sans checklist, c'est du vibecoding au gate

## Contexte

Si l'humain ne sait pas quoi vérifier, il tamponne. Sur du multi-projet, « quoi
vérifier » ne se mémorise pas : ça se **génère et se persiste dans le repo**, versionné,
et ça voyage avec l'issue (ADR-0004 §6). C'est la clé de voûte du gate humain.

## Le geste

Deux sources → une checklist : (a) les items DoD `verify: human` de l'issue (via
ISS-0101), (b) des **checks structurels** tirés d'une bibliothèque versionnée
(`.lytos/review-checks/*.md`) par type/domaine (UI → visuel, auth/données → sécurité,
copy user-facing → ton). Les checks structurels ne sont **pas** inventés par le loop.
Garde-fous : slot « regard libre / non couvert ici », checklist vide = signal de
sous-spécification. **Sign-off tracé** : cocher un item écrit qui/quoi/quand dans le
frontmatter (`human_signoff`), lisible par l'audit.

## Definition of done

- [ ] Bibliothèque `review-checks/` + mapping type/domaine → checks — *verify: auto*
- [ ] `lyt` génère la checklist (DoD human ∪ checks structurels) + slot regard-libre — *verify: auto*
- [ ] Sign-off enregistré (`human_signoff`: handle + date + item) — *verify: auto*
- [ ] Checklist vide/triviale signalée, pas verte par défaut — *verify: human*
- [ ] Doc : comment ajouter un check à la bibliothèque — *verify: human*

## Notes

- Nouvelle métrique de gouvernance : « quel humain a validé, sur quelle checklist ».
- Alimente le review packet (ISS-0103). Réf : ADR-0004 §6.
