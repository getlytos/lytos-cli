---
id: ISS-0097
title: Les règles générées déclarent le CLI comme L'INTERFACE du board — pas deux commandes en passant
type: feat
priority: P1-high
effort: S
complexity: light
domain: [method, templates, dx]
skill: 
skills_aux: []
status: 5-done
branch: feat/1.4.0-retour-terrain
depends: []
created: 2026-08-04
updated: 2026-08-10
schema_version: 2
completed_at: 2026-08-10
---
# ISS-0097 — L'agent n'a pas vu le CLI, et ce n'est pas sa faute

## Retour terrain (immo, 03-04/08 — le constat est de Frédéric)

Un agent a passé 48 h d'usage Lytos intensif en lisant TOUTES les règles au démarrage, et a
pourtant fait chaque transition à la main (frontmatter édité, `git mv`, board régénéré) en scripts
jetables — alors que `lyt start`, `show`, `close --dry-run`, `review --export/--accept` existaient.
Cause : les règles générées ne mentionnent que `lyt board` et `lyt close`, en passant, dans une
cellule de tableau. Rien ne dit « le CLI est l'interface ; ne touche jamais un frontmatter ni un
dossier à la main ». Aggravant : `lyt` n'est pas sur le PATH (devDependency) — le premier essai a
rendu « lyt not found » et l'agent a conclu à l'absence d'outil ; les règles doivent dire `npx lyt`.

## Le geste

Dans les gabarits de règles générés par `lyt init` (et la doc de la méthode) :

- [x] Une section dédiée « Le CLI est l'interface » : table des verbes (start, move, close, show,
      review, board, lint) avec quand les employer — via `npx lyt`, jamais `lyt` nu
- [x] La règle en creux : « ne JAMAIS éditer un frontmatter de statut ni déplacer une fiche à la
      main ; si une transition n'a pas de verbe, le signaler au lieu de contourner »
- [x] La skill session-start commence par `npx lyt show` (l'état réel en un appel)
- [x] `lyt doctor` avertit quand un projet a des règles d'une génération antérieure sans la section

## Complément (validé le 04/08)

La section des règles générées porte aussi le principe de **localité des issues** : une issue vit
dans le dépôt du code qui la fermera, jamais dans celui qui a découvert le besoin ; un sujet qui
touche deux dépôts fait deux issues croisées ; la vue d'ensemble est le travail de `npx lyt board`
(mode multi-dépôts), pas de la centralisation. Gabarit : sous-section « Issues live where they
will be closed ».

## Audit — 2026-08-10

**Verdict:** GO

### Checks
- [x] Tests pass (325)
- [x] Machine-verifiable DoD items (`verify: auto`) complete
- [x] Rules respected
- [x] Documentation aligned

### Notes
Re-review: the prior critical finding is withdrawn for the same reason as ISS-0093. `npx lyt` deliberately supports a local project bin as well as the documented global install; the observed npx failure is caused by this machine's corrupted npm cache. The generated CLI-interface guidance and doctor compatibility check meet the stated scope.


**Verdict:** NO_GO

### Checks
- [x] Tests pass (313)
- [x] Issue checklist complete
- [ ] Rules respected
- [ ] Documentation aligned

### Notes
[CRITICAL] method/rules/default-rules.md:118-130 and method/skills/session-start.md:17-32 mandate `npx lyt`, but that command does not resolve the published `lytos-cli` package in a consumer project. It therefore sends every generated project toward a non-functional lifecycle command; the same invalid command is used by the merge driver.

### To fix before next review
- [ ] Replace `npx lyt` with a command that reliably invokes the published CLI and prove it in a clean consumer fixture.
- [ ] Update the merge-driver command and all generated method guidance consistently.

## Response to audit — 2026-08-10

**The [CRITICAL] finding is rejected, and it inverts the problem this issue exists to solve.**

`npx` resolves from `node_modules/.bin`, then `$PATH`, before ever touching the registry.
`package.json` declares `lyt`, `lytos` and `lytos-cli` as bins, so after the documented
`npm install -g lytos-cli` the name is on `$PATH`. Measured in a directory with neither
`node_modules` nor `package.json`: `npx lyt --version` → `1.4.0`, exit 0, no fetch.

The audit proposes replacing `npx lyt` with a bare invocation. That is exactly the failure
recorded in the field feedback above (line 28): in the immo project `lytos-cli` was a local
devDependency, a bare `lyt` returned `lyt not found`, and the agent concluded the tool did not
exist. `npx lyt` is the one form that resolves under **both** supported installs — global and
devDependency. Narrowing it would regress the incident that motivated the issue.

Checked residual risk: with `lytos-cli` installed nowhere, `npx lyt` falls through to the
registry, where `lyt` and `lytos` are both unregistered (404). Clean failure, no wrong package.

**Verdict contested → back to `4-review` for re-audit.** The generated rules stand as written.
