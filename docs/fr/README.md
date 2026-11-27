# Lytos CLI

[![npm](https://img.shields.io/npm/v/lytos-cli)](https://www.npmjs.com/package/lytos-cli)
[![CI](https://github.com/getlytos/lytos-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/getlytos/lytos-cli/actions/workflows/ci.yml)

> L'outil en ligne de commande de [Lytos](https://lytos.org/fr/) — une méthode human-first pour travailler avec des agents IA de code.

**[Documentation — lytos.org](https://lytos.org/fr/)** · **[La méthode](https://github.com/getlytos/lytos-method)** · **[Read in English](../../README.md)**

---

## Vous développez avec l'IA ?

Vous changez de modèle. Vous ouvrez une nouvelle session. Vous passez de Claude à Codex.
Et chaque fois, le même rituel : il faut redonner le contexte, répéter les conventions, corriger les mêmes dérives.

Pendant ce temps, la dette s'installe. Le code généré aujourd'hui ne ressemble plus à celui d'hier. Les conventions glissent. Le projet grossit plus vite que la capacité de l'IA à s'y repérer.

Cette friction, beaucoup ont fini par l'accepter comme normale. Elle ne l'est pas.

**Lytos répond à ce problème en ancrant le contexte à l'endroit où il doit vivre : dans le repo.**

---

## Pour qui, pour quoi

| Profil | Setup typique | Ce que Lytos apporte |
|---|---|---|
| **Vibe-coder / maker** | Claude Code, Codex, apps IA + GitHub | Un manifest que l'IA lit à chaque session. Moins de réexplication, un contexte qui s'enrichit. |
| **Développeur** | IDE + Git (GitHub / GitLab) + IA en appoint | Règles versionnées, mémoire qui se construit, board qui trace le travail — dans le repo, pas dans un SaaS. |
| **Équipe** | IDE + Git + CI + revues + ticketing produit | Manifest, skills, rules partagés. L'IA produit dans le style du projet. Les specs techniques pour l'IA vivent dans le repo, à côté du code. |

---

## Installation

```bash
npm install -g lytos-cli
lyt init
```

Ou sans installer :

```bash
npx lytos-cli init
```

En 2 minutes, votre dépôt a son manifest, ses rules, son board. À partir de là, l'IA connaît votre projet.

### Setup d'équipe mixte : un repo, plusieurs outils IA

Sur un repo où certains développeurs utilisent Claude Code, d'autres Cursor, d'autres Codex, `lyt init` peut générer tous les bridge files en une seule fois :

```bash
lyt init --tool claude,cursor,copilot       # CSV : seulement ce que l'équipe utilise
lyt init --all-tools                        # tous les adaptateurs shippants d'un coup
```

Chaque bridge pointe vers le même dossier `.lytos/`, donc changer d'outil ne demande aucune reconfiguration du projet. `none` est accepté dans la liste en no-op, pour que des scripts puissent passer `"none,claude"` sans cas particulier. Les valeurs inconnues sortent en erreur avant qu'aucun fichier ne soit écrit.

![Démo Lytos](../screenshots/lytos.gif)

![lyt board](../screenshots/lyt-board.png)

---

## Commandes

| Commande | Ce qu'elle fait |
|----------|-----------------|
| `lyt init` | Génère `.lytos/` dans un projet (interactif, détecte la stack). Sur un terminal interactif, pose une question facultative — utilisez-vous Claude Design — à laquelle `--design <claude-design\|other\|none>` répond d'avance ; voir [Facultatif : un registre Claude Design](#facultatif--un-registre-claude-design) |
| `lyt board` | Régénère BOARD.md depuis le frontmatter YAML des issues. Quand le board contient des epics, une section Epics (chaque epic, ses feuilles et leur progression, dérivées de `parent`) s'ajoute à la vue terminal et à BOARD.md, et `--json` porte une clé `epics` — voir [La couche d'intention](#la-couche-dintention) |
| `lyt archive` | Déplace les issues terminées de `5-done/` vers `archive/<quarter>/` (défaut : plus de 7 jours). `--all`, `--older-than <Nd>`, `--dry-run` |
| `lyt lint` | Valide la structure et le contenu de `.lytos/`. Quatre règles de la couche d'intention n'émettent que des avertissements (voir [La couche d'intention](#la-couche-dintention)) |
| `lyt doctor` | Diagnostic complet — liens cassés, mémoire obsolète, skills manquants, score de santé. Signale aussi ce qu'il n'a pas pu utiliser de la section `independence:` de `.lytos/config.yml` (voir [Indépendance du relecteur](#indépendance-du-relecteur)) |
| `lyt show [ISS-XXXX]` | Affiche le détail d'une issue avec sa progression, ou toutes les issues en cours. Une feuille montre son epic, un epic ses feuilles et leur progression ; `--json` ajoute une clé `intent` à une issue qui participe à la couche d'intention |
| `lyt milestone [id]` | Lecture seule. Un jalon, ou tous, depuis `.lytos/milestones/<id>.md` : ses critères de sortie, ses epics et ses feuilles, avec une progression comptée à chaque appel depuis les issues qui le nomment. `--json` pour les scripts. Voir [La couche d'intention](#la-couche-dintention) |
| `lyt start ISS-XXXX` | Démarre une issue — déplace en in-progress, crée la branche, met à jour le board. Une feuille d'un epic encore en découverte est refusée, sauf si c'est un `spike` ou avec `--discovery-override "<raison>"` (voir [La couche d'intention](#la-couche-dintention)) |
| `lyt close ISS-XXXX` | Ferme une issue — déplace en done, alerte sur les items non cochés |
| `lyt close` | Ferme en lot toutes les issues de 4-review/ → 5-done/ (demande confirmation ; `--yes` saute le prompt ; `--dry-run` previewe) |
| `lyt review [ISS-XXXX]` | Audit cross-model pour les issues en `4-review/` — imprime un prompt autonome ou ingère un bloc audit retourné (`--accept`). À lancer depuis une **session IA fraîche**, idéalement un vendor différent de l'implémenteur. `--verdict` est refusé quand la relecture est moins indépendante que ne l'exige le `risk` de l'issue, et `--countersign` consigne la contre-signature du propriétaire (voir [Indépendance du relecteur](#indépendance-du-relecteur)) |
| `lyt exchanges` | Lecture seule. Les échanges de design ouverts entre le design et le code, une ligne par entrée, dérivés de `.lytos/design/exchanges/` à chaque appel (`--json` pour les scripts). Pour les projets `design: claude-design` ; voir [Facultatif : un registre Claude Design](#facultatif--un-registre-claude-design) |
| `lyt upgrade` | Récupère les derniers fichiers méthode dans `.lytos/`. Ce qui est à vous n'est jamais écrit : `quality/kit.md` et `stack.md` (liés à votre stack — il se contente de nommer les gates fournies que votre kit n'a pas), le registre de design, la config, le manifest. Les nouvelles grilles et listes sont ajoutées, mais une version modifiée n'est jamais écrasée, même avec `--force`. Le guide des échanges de design est ajouté à un projet `design: claude-design` et, une fois écrit, il est à vous aussi. Avec le bridge Claude Code, il ajoute aussi les renvois de skills manquants dans `.claude/skills/` et réécrit ceux qui ont dérivé. `--migrate-cursor` convertit un legacy `.cursorrules` vers `.cursor/rules/lytos.mdc`. |
| `lyt update` | Met à jour lytos-cli vers la dernière version |

Le skill `reference-loop` (`.lytos/skills/reference-loop/SKILL.md`, installé comme les autres task skills) enchaîne les primitives de la boucle pour un agent : choisir avec `lyt next`, démarrer l'issue, construire, prouver avec `lyt gates`, remettre avec `lyt report`, mettre l'issue de côté (`lyt park`) plutôt que deviner, et s'arrêter pour appeler l'humain dans cinq cas. Il ne ferme jamais une issue, et le CLI lui-même ne lance aucune boucle et n'appelle aucune IA.

![lyt show](../screenshots/lyt-show.png)

---

## Ce que `lyt init` génère

```
project/
└── .lytos/
    ├── manifest.md              # Intent — identité du projet et contraintes
    ├── LYTOS.md                 # Référence de la méthode
    ├── config.yml               # Préférences langue, profil et design
    ├── skills/                  # Design — protocole Lytos + task skills agentskills.io
    │   ├── session-start.md     # Protocole de bootstrap Lytos (flat)
    │   ├── code-structure/SKILL.md
    │   ├── code-review/SKILL.md
    │   ├── testing/SKILL.md
    │   ├── documentation/SKILL.md
    │   ├── git-workflow/SKILL.md
    │   ├── deployment/SKILL.md
    │   ├── security/SKILL.md
    │   ├── api-design/SKILL.md
    │   └── reference-loop/SKILL.md  # 9 task skills (format agentskills.io)
    ├── rules/                   # Standards — critères de qualité
    │   ├── default-rules.md
    │   └── team-and-loop.md     # Les rôles d'une équipe et la boucle entre les deux portes du propriétaire
    ├── quality/                 # Standards rendus exécutables
    │   ├── kit.md               # Catalogue de gates : machine, revue par un modèle, jugement humain — par risque
    │   ├── stack.md             # Contrat de stack
    │   ├── rubrics/             # Les grilles qu'une relecture suit (FORMAT.md + 8 grilles)
    │   └── checklists/          # Les listes qu'une personne parcourt (4)
    ├── issue-board/             # Progress — kanban
    │   ├── BOARD.md
    │   ├── 0-icebox/
    │   ├── 1-backlog/
    │   ├── 2-sprint/
    │   ├── 3-in-progress/
    │   ├── 4-review/
    │   ├── 5-done/
    │   └── templates/           # Templates d'issue : tâche, feature, epic
    ├── memory/                  # Memory — connaissance accumulée
    │   ├── MEMORY.md
    │   └── cortex/
    └── templates/               # Templates de sprint et de jalon
```

`lyt init` détecte aussi la stack du projet (langage, framework, runner de tests, package manager) et pré-remplit le manifest. Il génère le fichier d'adaptateur approprié pour l'outil IA choisi — `CLAUDE.md`, `.cursor/rules/lytos.mdc`, `AGENTS.md`, `.github/copilot-instructions.md`, `GEMINI.md`, ou `.windsurfrules`.

Les skills de tâche sont dans `.lytos/skills/<nom>/SKILL.md`. On ne suppose d'aucun outil qu'il charge ce dossier de lui-même : chaque fichier d'adaptateur ordonne donc à l'agent de lire les skills qui s'appliquent. Claude Code charge les skills d'un projet depuis `.claude/skills/` : avec `--tool claude`, `lyt init` écrit aussi un renvoi par skill de tâche, `.claude/skills/lytos-<nom>/SKILL.md`, y compris pour les skills que vous ajoutez (lancez `lyt upgrade` après en avoir ajouté un). Un renvoi contient la description et envoie l'agent vers le fichier source, seul endroit où le skill est écrit. Le préfixe `lytos-` préserve les commandes de Claude Code, comme `/code-review`. Committez les renvois : si git les ignore, un clone neuf, un worktree ou une session cloud ne les aura pas, et la CLI vous en avertit.

Un hook pre-commit est installé pour faire respecter les conventions de nommage de branches (`type/ISS-XXXX-slug`). Cela évite tout travail non tracé sur `main` — quel que soit l'outil IA ou le modèle utilisé.

### Profondeur de startup — léger vs standard

La skill `session-start` lit le frontmatter de l'issue en cours pour décider combien de contexte l'IA charge avant de démarrer.

- **Startup léger** autorisé uniquement quand l'issue est explicitement `effort: XS` **et** `complexity: light`. L'IA charge quand même la baseline de sécurité obligatoire (manifest, MEMORY, default rules, BOARD, l'issue elle-même), mais diffère les notes cortex, les rules spécifiques au projet et l'exploration large du codebase tant que l'issue n'en a pas besoin.
- **Startup standard** reste obligatoire pour toute autre combinaison. Si un des deux champs manque, l'IA retombe sur standard. Si la tâche grossit en cours de session, elle repasse immédiatement en standard.

C'est ainsi que les petites issues restent rapides sans brûler la fenêtre de contexte — et c'est pour ça que `effort` et `complexity` dans le frontmatter portent vraiment quelque chose : ce ne sont pas juste des indicateurs de priorisation.

### Les bridge files personnalisés sont préservés

Lancer `lyt init --force` sur un projet existant régénère `.lytos/` sans écraser les personnalisations locales que vous avez apportées à votre bridge IA (`CLAUDE.md`, `.cursor/rules/lytos.mdc`, `AGENTS.md`, `.github/copilot-instructions.md`, `GEMINI.md`, `.windsurfrules`). Si le bridge existe déjà, il est conservé tel quel et le CLI affiche un warning pour signaler que le fichier a été sauté.

Pour remplacer explicitement un bridge par le template fourni — utile quand vous voulez remonter un nouveau défaut, ou quand votre copie locale a dérivé — passez `--overwrite-bridges` :

```bash
lyt init --force                          # régénère, préserve les bridges (défaut)
lyt init --force --overwrite-bridges      # régénère, remplace aussi les bridges
```

### Facultatif : un registre Claude Design

`lyt init` pose **une** question facultative, uniquement sur un terminal interactif hors CI : *Utilisez-vous Claude Design pour le design ?* — `yes`, `no` ou `other tool` ; Entrée vaut non. `--design <claude-design|other|none>` y répond d'avance. Sans terminal (un pipe, la CI, `--yes`), aucune question n'est posée et la réponse est `none`.

La réponse est consignée dans `.lytos/config.yml` sous la clé `design:`. Seul `claude-design` crée quelque chose : `.lytos/design/registry.md`, un registre de vos artefacts Claude Design — liens, version courante, quelles cartes couvrent quelle version, écarts rendus à l'outil de design — et `.lytos/design/exchanges/README.md`, le guide des échanges de design. Un registre ou un guide existant n'est jamais écrasé, même par `init --force`.

Un échange de design est un petit fichier par tour entre le design et le code, `.lytos/design/exchanges/<epic>/NNN-<slug>.md` : un `from` (`design` ou `code`), un `type` (`gap`, `prompt`, `response` ou `decision`) et un `status` (`open` ou `resolved`), en 150 mots au plus. `lyt exchanges` liste ceux qui sont ouverts, dérivés à chaque appel : aucun fichier d'index n'existe, et une entrée quitte la liste quand vous passez `status: resolved`. Une entrée mal formée est signalée, jamais ignorée, et la commande sort en code 1. `lyt upgrade` ajoute le guide à un projet `claude-design` qui ne l'a pas.

Ce n'est jamais un frein : `none` et `other` ne génèrent rien, `lyt doctor` et `lyt lint` ne disent rien du design, aucune gate n'en dépend, et `lyt exchanges` se contente de dire que les échanges ne sont pas utilisés.

### Marqueurs de la Definition of Done

Chaque item de Definition of Done dit **qui le vérifie** par un marqueur final, et `lyt lint` signale ceux qui n'en ont pas :

| Marqueur | Vérifié par | Compte comme vérifiable par machine (éligible à la boucle) ? |
|----------|-------------|---------------------------------------------------------------|
| `— verify: auto` | Une commande qui sort en erreur (test, typecheck, lint, build) | Oui |
| `— verify: reviewer` | Le modèle qui audite, face à une grille écrite | Non |
| `— verify: human` | Une personne, parce que rien d'autre ne peut trancher | Non |

Chaque marqueur peut épingler la ligne du kit qualité qui le porte : `verify: auto:tests-unit`, `verify: reviewer:over-engineering`, `verify: human:product-intent`. Une épingle est l'id d'une ligne du kit (première colonne de `quality/kit.md`), pas le nom d'une grille ou d'une liste ; `lyt doctor` signale une épingle que le kit n'a pas. Un item non marqué compte comme `auto` et `lyt lint` le signale. Une DoD sans item `auto` (ou non marqué) n'est pas du travail de boucle.

`verify: human` est le dernier recours : légitime seulement si un testeur de bout en bout n'a pas pu contrôler l'item lui-même, dans un navigateur ou avec Playwright — sinon c'est `verify: auto:e2e`. Un item humain porte toujours une épingle nommant une ligne `human` du kit, et `lyt lint` **avertit** (jamais d'erreur) quand ce n'est pas le cas.

### La couche d'intention

Une issue dit quoi construire ; le niveau au-dessus dit pourquoi. Trois niveaux, jamais plus : un **jalon** (milestone : une version, avec ses critères de sortie), un **epic** (l'issue d'intention, `type: epic`) et une **feuille** (une issue de la taille d'une itération de boucle). Tous les champs sont facultatifs et `schema_version` reste à 2 : un projet qui n'en adopte aucun ne change rien.

| Champ | Se place sur | Sens |
|-------|--------------|------|
| `parent: ISS-XXXX` | une feuille | L'epic auquel elle appartient |
| `milestone: <id>` | un epic ou une feuille | Un fichier `.lytos/milestones/<id>.md` : `id`, `title`, `status: open\|closed` et une checklist sous `## Exit criteria` |
| `phase: discovery\|frozen` | un epic | `discovery` : l'intention est encore en train de se fixer |

Les enfants et la progression sont **dérivés** des champs `parent` à chaque appel, jamais écrits à la main : `lyt board` (une section Epics), `lyt show` et `lyt milestone`. `lyt lint` avertit (jamais d'erreur) quand un `parent` n'est pas un identifiant d'issue unique qui désigne un epic existant, quand la profondeur dépasserait deux (un epic n'a pas de parent), quand une `phase` se trouve sur une issue qui n'est pas un epic ou n'est ni `discovery` ni `frozen`, et quand un `milestone` n'a pas de fichier sous `.lytos/milestones/`.

**La porte de découverte.** Tant qu'un epic est en `phase: discovery`, ses feuilles ne peuvent pas entrer dans le sprint : `lyt move … 2-sprint`, `lyt start`, `lyt claim` et `lyt unpark` les refusent en nommant l'epic, et `lyt next` les écarte (raison `epic-in-discovery` dans `--json`). Deux exemptions : une feuille de `type: spike` (étude de faisabilité ou mesure), et `--discovery-override "<raison>"` sur `lyt move` ou `lyt start`, qui laisse passer une feuille sur la parole de l'humain responsable et consigne la raison dans l'issue sous `discovery_override`. Une issue sans epic parent n'est pas concernée. Un humain fige l'epic en passant `phase: frozen` ; la checklist de gel est dans `rules/default-rules.md`, et les templates sont `issue-board/templates/issue-epic.md` et `templates/milestone.md`.

### Indépendance du relecteur

Une relecture faite par le modèle qui a écrit le travail en partage les angles morts : Lytos mesure donc l'indépendance de chaque relecture et en exige davantage quand le risque monte. Le niveau est **calculé** à partir de `ai_implementer` et `ai_reviewer` (un modèle et une session chacun ; `lyt review --ai-model` et `--ai-session` consignent le relecteur), jamais déclaré :

| Niveau | Le relecteur est |
|--------|------------------|
| 1 | Un autre fournisseur |
| 2 | Le même fournisseur, avec un modèle que le classement configuré place au-dessus de celui de l'implémenteur |
| 3 | Le même modèle : « weak independence », indépendance faible |

Ce qui ne peut pas être établi compte pour le niveau 3, et c'est dit : un modèle absent, un modèle dont le fournisseur est inconnu, un modèle absent du classement (jamais traité comme plus fort). Le minimum dépend du `risk` de l'issue : `low` n'importe quel relecteur, `medium` un autre modèle ou une session neuve, `high` le niveau 1 ou 2. `lyt report` et `lyt gates` montrent le niveau et le minimum, et `lyt review` annonce le niveau quand il consigne un verdict. En dessous du minimum, `lyt review --verdict go` (ou `go-pending-human`) est consigné et signalé à `medium`, et **refusé à `high` tant que le propriétaire n'ajoute pas `--countersign`**, qui consigne qui, quand et « weak independence » dans le bloc `review_independence` de l'issue. Un `no-go` reste toujours consignable.

Les valeurs par défaut sont un plancher : on peut les durcir, jamais les assouplir, sous `independence:` dans `.lytos/config.yml` (une valeur plus souple est ignorée et signalée par `lyt doctor`) :

```yaml
independence:
  ranking: [model-a, model-b]   # ids exacts de modèles, du plus faible au plus fort
  providers:                    # préfixe d'id de modèle: fournisseur, ajouté à la table intégrée
    acme: acme-ai
  minimum:                      # par risque : any | fresh-session | level-2 | level-1
    high: level-1
  below_minimum:                # par risque : warn | countersign | refuse
    medium: countersign
    high: refuse
```

Par défaut, `minimum` vaut `any`, `fresh-session` et `level-2`, et `below_minimum` vaut `warn`, `warn` et `countersign`, pour `low`, `medium` et `high`. Lytos ne livre **aucun classement de modèles** : classer des modèles est un jugement de qualité que seul le projet peut porter ; sans classement, deux modèles d'un même fournisseur sont au niveau 3.

---

## Fonctionne avec n'importe quel outil IA

| Outil | Ce que `lyt init` génère |
|-------|--------------------------|
| **Claude Code** | `CLAUDE.md` à la racine du projet, plus les renvois `.claude/skills/lytos-*/` |
| **Cursor** | `.cursor/rules/lytos.mdc` (règle Cursor moderne avec front-matter YAML) |
| **Codex (OpenAI)** | `AGENTS.md` à la racine |
| **GitHub Copilot** | `.github/copilot-instructions.md` |
| **Gemini CLI** | `GEMINI.md` à la racine |
| **Windsurf** | `.windsurfrules` à la racine |
| **Autres** | Le dossier `.lytos/` est en Markdown brut — n'importe quel LLM peut le lire |

> *"Choisissez votre IA. Ne lui appartenez pas."*

---

## Principes de design

- **Offline-first** — `lyt lint`, `lyt doctor`, `lyt board`, `lyt show`, `lyt start`, `lyt close` ne demandent jamais de réseau
- **Zéro lock-in** — fichiers Markdown bruts, portables vers n'importe quel outil IA
- **Pas de télémétrie** — aucun tracking, aucune analytics, jamais. Opt-out pour le check de mise à jour : `LYT_NO_UPDATE_CHECK=1`
- **Human-first** — l'humain définit la méthode, l'IA la suit
- **Fail with context** — quand quelque chose ne va pas, le CLI dit quoi, où, et comment corriger

![lyt lint](../screenshots/lyt-lint.png)
![lyt doctor](../screenshots/lyt-doctor.png)

---

## Construit avec Lytos

Ce CLI est développé en utilisant Lytos lui-même. Le dossier `.lytos/` de ce dépôt contient le vrai manifest, le sprint, les issues et la mémoire — pas des templates. Chaque feature a été trackée comme une issue, démarrée avec `lyt start`, et fermée avec `lyt close`.

[Voir le board →](../../.lytos/issue-board/BOARD.md)

---

## Liens

- **Documentation** — [lytos.org](https://lytos.org/fr/)
- **Tutoriel** — [lytos-learn](https://github.com/getlytos/lytos-learn) — apprendre en faisant en 7 étapes
- **La méthode** — [github.com/getlytos/lytos-method](https://github.com/getlytos/lytos-method)
- **npm** — [npmjs.com/package/lytos-cli](https://www.npmjs.com/package/lytos-cli)

---

## Auteur

Créé par **Frédéric Galliné**

- GitHub : [@FredericGalline](https://github.com/FredericGalline)
- X : [@fred](https://x.com/fred)

---

## Licence

MIT — voir [LICENSE](../../LICENSE)

---

## Historique des étoiles

[![Star History Chart](https://api.star-history.com/svg?repos=getlytos/lytos-cli,getlytos/lytos-method&type=Date)](https://www.star-history.com/#getlytos/lytos-cli&getlytos/lytos-method&Date)
