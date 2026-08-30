---
id: ISS-0135
title: "Le pont ne nomme qu'une règle sur trois, et la revue n'en lit que deux noms écrits en dur"
type: fix
priority: P1-high
effort: S
complexity: standard
domain: [method, cli]
skill: ""
skills_aux: []
status: 4-review
branch: "fix/ISS-0135-le-pont-ne-nomme-quune-regle-sur-trois"
depends: []
created: 2026-08-30
updated: 2026-08-30
schema_version: 2
---

# ISS-0135 — Le pont ne nomme qu'une règle sur trois

## Context

Trouvé le 30/08/2026 en cherchant tout autre chose : pourquoi un projet consommait la moitié du
crédit GitHub Actions du compte. La réponse tenait à des branches empilées — mais en voulant écrire
la règle qui l'évite, deux défauts de la méthode sont apparus, tous deux de la même famille.

**1. Le fichier-pont ne nomme qu'un fichier de règles sur trois.** `src/lib/templates.ts` génère le
pont pour six outils d'agent — Claude, Codex, Cursor, Copilot, Gemini, Windsurf —, et **les six**
portent la même ligne : « `3. .lytos/rules/default-rules.md — quality criteria` ». Le README des
règles annonce pourtant une hiérarchie cumulative où le projet l'emporte, et `session-start.md`
rattrape le coup beaucoup plus bas, par un « charge aussi les fichiers de règles spécifiques,
*e.g.* `rules/bookshelf-rules.md` ». Autrement dit : dans **tout** projet créé par Lytos, les règles
propres sont chargées par chance, pas par instruction.

**2. Le paquet de revue lit DEUX noms écrits en dur.** `review.ts` lisait
`rules/default-rules.md` et `rules/cli-rules.md`. Le second est le fichier de règles du dépôt
`lytos-cli` **lui-même** : il a été écrit en dur dans l'outil livré à tout le monde. Conséquence —
la porte GO/NO_GO auditait chaque projet contre des règles qu'elle ne pouvait pas voir. Un projet
dont les règles exigent, par exemple, une annotation de mutation sur chaque garde était relu par un
auditeur à qui personne n'avait montré cette exigence.

Le second défaut est le plus grave : c'est celui qui touche l'endroit où les règles servent.

**3. Le skill `git-workflow` ne dit rien de ce qui coûte le plus cher.** Il dit « no long-lived
branches », et rien sur le fait d'empiler une branche sur une autre, sur le délai entre un GO et la
fusion, ni sur la taille d'un lot.

## Definition of done

- [x] Les six gabarits d'agent nomment le dossier `rules/`, pas un fichier
- [x] `review.ts` lit TOUS les fichiers de règles du dossier, `default-rules.md` en tête
- [x] Deux gardes couvrent la lecture du dossier et l'ordre, chacun vu rouge
- [x] `git-workflow` porte les trois manques, chacun justifié par une mesure

## Journal — 2026-08-30

**Ce qui est corrigé.** Les six gabarits nomment désormais le dossier et disent la hiérarchie.
`review.ts` lit le dossier au lieu d'une liste de noms — `default-rules.md` d'abord, parce que c'est
la base et que les autres se posent dessus ; `README.md` exclu, c'est de la documentation, pas un
critère.

**Vus rouges.** Le filtre ramené aux deux noms écrits en dur → les deux gardes rougissent. L'ordre
ramené à `.sort()` alphabétique → seul le garde de l'ordre rougit, ce qui montre qu'ils ne mesurent
pas la même chose. 252 tests verts, `tsc --noEmit` propre.

**Ce que le skill gagne, et chaque point est mesuré, pas supposé** :

- **une branche part de l'intégration, jamais d'une autre branche de travail** — l'empilement n'est
  permis que sur `depends:` déclaré ET annoncé en tête de PR. Mesuré : cinq PR empilées ont porté
  **71 des 100 runs de CI du mois** contre 8 pour `main`, et les fusions de propagation ont
  silencieusement dupliqué une fiche sur les cinq branches ;
- **une PR relue et verte se fond le jour même** — Lytos a une porte GO, donc la règle s'énonce dans
  son vocabulaire propre : `review: go` plus CI verte, il ne reste qu'à fondre. Une PR qui attend
  est une pile en formation ;
- **une couture par PR, ~800 lignes comme seuil d'alerte** — trois revues indépendantes ont rendu GO
  avec la MÊME réserve sur des lots de 2 049, 2 536 et 2 623 lignes.

**Et un principe, pas une règle** : cadence de fusion ≠ cadence de livraison. Vouloir livrer par lot
est un bon réflexe, mais il porte sur le **tag**, pas sur la fusion. Retarder les fusions pour
grouper une livraison fabrique des piles. La colonne `2-sprint` sert à décider ce qui part ensemble,
sans retarder l'intégration de ce qui est prêt.

**Ce qui n'est PAS monté ici, et c'est délibéré.** « Le déploiement est un tag de fin de sprint »
reste une règle de projet : elle suppose un artefact versionné et une chaîne de release, et un site
déployé en continu n'en veut pas. Lytos propose déjà trois modèles au choix ; c'est au projet de
trancher. Les corrections de déclencheurs CI restent locales elles aussi — la méthode ne livre aucun
workflow CI.

**Honnêteté sur la mesure.** Le « 71 sur 100 » vient d'un seul projet, dans une situation créée par
un agent — moi. Le principe des branches courtes n'est pas une découverte : le skill cite déjà DORA
là-dessus. La mesure le confirme et lui donne un prix ; elle ne le fonde pas.
