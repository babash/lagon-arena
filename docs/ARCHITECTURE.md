# 🧭 Architecture technique

[← Retour au README](../README.md) · [Règles](REGLES.md) · [Pédagogie](PEDAGOGIE.md)

Pour qui veut comprendre, relire, corriger ou faire évoluer le code. Pour **utiliser** le jeu, il n'y a rien à installer : tout se passe sur [le site](https://babash.github.io/lagon-arena/index.html).

---

## 1. Les principes

1. **Un site statique, sans outil de construction.** Du HTML, du CSS et des modules JavaScript (ES modules) servis tels quels par GitHub Pages. Aucun framework, aucune dépendance npm, aucune étape de *build* : on modifie un fichier, on recharge la page.
2. **Un moteur pur et déterministe.** `js/moteur/` ne touche jamais à la page. Même graine + mêmes codes ⇒ **exactement le même match**, sur n'importe quel navigateur.
3. **La base ne stocke que du texte.** Les salles, les pseudos, le **code** des tortues et les scores. Elle ne calcule rien : **chaque navigateur rejoue lui-même les matchs** à partir des codes. C'est ce qui permet de tenir dans l'offre gratuite de Supabase.
4. **L'écriture passe par des fonctions qui vérifient un secret.** Personne n'écrit directement dans les tables : seulement via des fonctions SQL (`SECURITY DEFINER`) qui contrôlent le jeton de l'enseignant·e ou celui de l'élève.
5. **Tout en français**, y compris les noms de variables et les commentaires : le code doit pouvoir être lu par un·e enseignant·e de NSI.

## 2. Le déroulé d'une manche, côté technique

```
 Enseignant·e (prof.html)              Base Supabase                    Élèves (eleve.html)
 ────────────────────────              ─────────────                    ───────────────────
 piloter_salle(prog, chrono) ───────▶  salles.phase = 'prog'  ◀──────── lecture toutes les 2 s
                                                                         programme, teste (bac à sable,
                                                                         100 % local), puis
                                       tortues (code)         ◀──────── deposer_tortue(jeton)
 piloter_salle(brawl)        ───────▶  salles.phase = 'brawl'
 lit joueurs + tortues  ◀──────────    (le code devient lisible)
 simulate(graine de la manche)                                            simulate(même graine)
   → anime le match projeté                                                 → même match, rejoué
 calculerScores → enregistrer_scores ▶ scores (nids, rang, points,
                                        nouveauté + version de carte)
 piloter_salle(resultats)    ───────▶                         ──────▶  résultats, rapport, « Et si… ? »
 banc d'essai (meilleure tortue)
   → pantheon_classe          ───────▶  pantheon (classe, manche) ◀──── mon_entree_pantheon(jeton)
```

- La **graine d'une manche** est dérivée de la graine de la salle et du numéro de manche (`graineManche` dans `js/moteur/hasard.js`).
- Les élèves ne font pas confiance à l'écran projeté : leur navigateur **recalcule** le match pour le revoir en suivant leur tortue, et pour le « Et si… ? » (même graine, leur nouveau code).
- Le **bac à sable** et l'**estimation** (📊 Estimer) tournent entièrement dans le navigateur de l'élève, sans la base.
- **Pendant la programmation**, l'enseignant·e lit la dernière tortue de chaque élève avec `codes_manche` (protégé par le secret de la salle) : son navigateur fait passer les **tests de la tortue** (`js/moteur/diagnostic.js`) à chacune et affiche 🟢 🟠 🔴 🐞 ⏳ dans la liste des élèves. Les codes ne sont rechargés que si un·e élève a envoyé une tortue (signature des dépôts).
- **Le Panthéon automatique** (`js/prof/pantheon-auto.js`) : quand les résultats d'une manche s'affichent, le navigateur de l'enseignant·e prend la meilleure tortue d'élève (ou les 3 meilleures, réglage), écarte celles sans nid et les copies (`codeConnu` de `js/pantheon.js`, plus la mission « elle mange au lieu de pondre » et le coup de pouce), lui fait passer le banc d'essai par paquets (la page reste fluide), puis l'inscrit avec `pantheon_classe`. La manche traitée est notée avec la salle (`lagon:prof`) : pas de second banc d'essai si la page est rechargée.

## 3. Arborescence

```
index.html  tuto.html  tuto-avance.html  eleve.html  prof.html  pantheon.html
css/style.css
img/                  ← icône (tortue.svg)
docs/                 ← documentation (et docs/img : captures d'écran)
js/config.js          ← adresse + clé « publishable » de la base, adresse publique du site (URL_SITE), durées
js/engine.js          ← point d'entrée du MOTEUR (réexporte js/moteur/*)
  moteur/hasard.js        hasard reproductible (mulberry32), graine d'une manche
  moteur/regles.js        réglages P, nouveautés TWISTS, lagon personnalisé (LAGON_REGLAGES, reglesManche),
                          heures, barème des points
  moteur/carte.js         grille, distances (BFS), carte classique, cartes aléatoires sans blocage
  moteur/equipes.js       équipes (couleurs) et résultat des équipes
  moteur/tortues.js       tortue de départ, tortues d'entraînement 🤖
  moteur/monde.js         l'état d'une partie et les questions qu'on se pose dessus
  moteur/capteurs.js      les capteurs (les questions du programme de l'élève)
  moteur/actions.js       les actions (une par tour)
  moteur/requins.js       chasse, patrouille, captures
  moteur/simulation.js    la boucle des tours : simulate()
  moteur/rapport.js       le rapport de match et les conseils (la vraie cause quand elle ne pond pas)
  moteur/missions.js      les missions des tutoriels (scénarios fixes)
  moteur/diagnostic.js    les tests de la tortue : un tour dans 10 situations clés, toutes les situations
                          de débutant·e (≈ 5 000), la structure (blocs à la suite, ordre, conditions jamais
                          vraies), les 4 actions clés, le verdict 🟢 🟠 🔴 et les explications ligne par ligne
js/interp.js          ← mini-interpréteur Python (conditions), messages d'erreur en français
js/primitives.js      ← capteurs, actions, mots-clés, leur rôle en mots simples et leur catégorie (source unique)
js/brawl.js           ← participants, équipes, lancement d'une manche, scores, classement (partagé prof / élèves)
js/db.js              ← accès Supabase (API REST) ou mode démo (localStorage), même interface
js/stockage.js        ← stockage local avec durée de vie (1 jour pour l'élève, 60 jours pour l'enseignant·e)
js/render.js          ← dessin du lagon (canvas)
js/viewer.js          ← visionneuse de match (lagon + frise + « pensée » de la tortue)
js/editor.js          ← éditeur coloré, autocomplétion, boîte à outils, indentation visible
js/pouce.js           ← le « coup de pouce » gradué (il suit les tests de la tortue)
js/bilan.js           ← l'affichage des tests de la tortue (verdict, actions clés, tableau, liens « ligne 7 »)
js/common.js          ← outils de page, liens à donner, code de session
js/aide.js            ← les onglets 📜 Règles et 💡 Conseils de l'écran élève
js/regles-vue.js      ← les règles du jeu en 6 cartes, l'aide-mémoire, le modèle français / Python (source unique)
js/regles-code.js     ← lire la chaîne if / elif / else comme une liste de règles ; ajouter, déplacer, supprimer
js/regles-panneau.js  ← le panneau « 🧩 Mes règles » (page élève et dernière étape du tutoriel)
js/parcours.js        ← les 4 missions du tutoriel débutant et leur progression (lue par l'accueil)
js/accueil.js         ← la page d'accueil (vues élève / enseignant·e, compteurs, entrer dans la partie
                        par la salle ou par le seul code de session, le parcours, les règles)
js/pantheon.js        ← le banc d'essai du Panthéon (20 parties fixes), repères, programmes déjà connus
js/pantheon/          ← la page du Panthéon : main.js (classement, lycées, ma tortue), admin.js (vérifier, retirer)
js/tutokit.js         ← composants des tutoriels (exemples, exercices, quiz, missions, navigation)
js/tuto.js            ← le tutoriel débutant, en 4 missions
js/tuto-pilote.js     ← la mission 1 « 🎮 Pilote ta tortue » (la tortue jouée à la main, vrai moteur)
js/tuto-avance/       ← main.js (choix du niveau), commun.js, moyen.js, expert.js, equipe.js,
                        strategies.js (les stratégies complètes données en exemple)
js/eleve/             ← main.js, etat.js (état partagé S), ui.js (6 onglets, côte à côte), editeur.js,
                        mesregles.js (🧩), bac.js (onglet 🧪 Tester, estimation), envoi.js, session.js (code de session), manche.js (suivre la salle),
                        resultats.js, pantheon.js (proposer sa tortue au Panthéon)
js/prof/              ← main.js, etat.js (état partagé S, piloter), accueil.js, salle.js, scenes.js
                        (ce qui est projeté), preparer.js (préparer la manche), liens.js, demo.js,
                        fiche.js (état des tortues, fiche d'un·e élève, résumé de la classe),
                        pantheon-auto.js (le Panthéon automatique en fin de manche)
supabase.sql          ← tables, règles de sécurité (RLS) et fonctions ; relançable sans risque
outils/verifier.mjs   ← vérification du moteur (node, sans navigateur)
outils/tests/         ← les tests dans le navigateur (Playwright) : tout.mjs, parcours/, captures.mjs
```

Les écrans `eleve/` et `prof/` suivent le même schéma : un état partagé `S` dans `etat.js`, des modules qui ne s'importent pas en boucle, et des **crochets** (`quandModifie`, `quandPilotee`) pour prévenir les autres modules d'un changement.

## 4. Le moteur

`simulate({ joueurs, graine, twist, ticks, scenario, version, leger, lagon })` (`js/moteur/simulation.js`). Une entrée de `joueurs` peut avoir une option `pilote` (une fonction tour → action) : sa tortue est alors jouée « à la main » au lieu de son programme (tutoriel « 🎮 Pilote ta tortue » ; on rejoue la partie depuis le début à chaque tour, ce qui reste déterministe).


1. `creerMonde` prépare la partie : la carte (classique ou tirée de la graine), les tortues, les requins, les algues, les sacs.
2. À chaque tour :
   - `debutTour` calcule une fois ce que toutes les tortues partagent (heure, nuit, algues propres, distances) ;
   - les tortues jouent **dans un ordre tiré au hasard** (reproductible) : `capteurs()` fournit les réponses aux questions, `runTurn()` exécute le programme de l'élève, `agir()` applique l'action ;
   - les requins bougent et attrapent (`deplacerRequins`, `captures`) ;
   - l'environnement évolue : faim, soleil, épuisement, algues qui repoussent, sacs qui dérivent.
3. Le résultat contient les nids, les événements, les **images** du match (pour l'animation) et les **traces** de chaque tortue (quelles conditions étaient vraies ou fausses, quelle ligne a agi) : c'est ce qu'affiche « Dans la tête de ta tortue ».

Le **mode léger** (`leger: true`) supprime les images et les traces : il sert à l'estimation (jusqu'à 50 parties en quelques secondes). Le vérificateur contrôle qu'il donne exactement les mêmes nids que la partie complète.

Les **scénarios** (tutoriels) imposent la position des requins, des algues, l'énergie de départ… pour que chaque mission soit reproductible.

Les capteurs sont des fonctions appelées **à la demande**. En mode léger, seuls ceux que le programme utilise sont calculés ; en mode complet, tous le sont, pour la trace « Dans la tête de ta tortue ». Les plus coûteux (niveau expert, qui demandent un parcours en largeur) sont mis en cache pour le tour.

## 5. Compatibilité des anciennes séances

Les règles et la carte ont évolué : une manche jouée il y a un mois doit pourtant se **rejouer à l'identique** (pour le rapport et le « Et si… ? »). D'où la **version de carte** :

| Version | Carte | Règles propres à la version |
|---|---|---|
| 1 | carte classique, fixe | règles d'origine |
| 2 (actuelle) | tirée de la graine (`genererCarte`), vérifiée sans blocage | le requin repart vers le départ le plus éloigné après une capture ; `fuir()` préfère la plage ; en équipes, `nids_adversaires()` et `pousser()` visent l'équipe rivale |

- La version est **enregistrée avec les scores**, dans la colonne `scores.nouveaute` : `"calme"` pour la version 1, `"calme|v2"` pour la version 2 (`nouveauteAvecVersion` / `lireNouveaute` dans `js/brawl.js`). Cela évite d'ajouter une colonne et reste lisible par une ancienne page.
- Les tutoriels utilisent toujours la version 1 (missions sur carte classique).
- Un **lagon personnalisé** (réglages fins par-dessus la nouveauté) est enregistré avec les scores dans `scores.lagon` (JSON) : `infosManche` le relit pour rejouer la manche. Sans réglage, la carte et la partie sont exactement les mêmes qu'avant : le nombre de massifs de corail et de touffes d'algues n'est tiré au hasard que s'il n'est pas imposé.
- **Pour changer une règle sans casser les anciennes manches** : conditionne-la à `m.version >= 3`, passe `VERSION_CARTE` à 3 dans `js/moteur/carte.js`, et ajoute un contrôle dans `outils/verifier.mjs`.

## 6. L'interpréteur (`js/interp.js`)

Un mini-Python écrit pour l'occasion, en trois temps : découpage en mots (*tokens*) avec gestion de l'indentation, analyse (*parsing*) en arbre, puis exécution d'un tour.

- Il accepte `def tour():`, `if`/`elif`/`else` imbriqués, `and`/`or`/`not` (évaluation paresseuse, comme Python), les comparaisons, `+ - *`, des variables locales, `pass`, `return` ([détails](REGLES.md#11-le-langage-accepté)).
- La table `SENSORS` liste les capteurs connus et leur type (booléen ou nombre) ; `ACTIONS` liste les ordres. Un nom inconnu, ou un capteur sans parenthèses, donne une erreur claire.
- Les erreurs sont **en français**, avec la ligne et une suggestion (distance d'édition sur les noms connus).
- Il n'y a ni boucle ni récursion : un tour s'exécute toujours en temps borné.

## 7. La base de données (`supabase.sql`)

Depuis le déménagement de novembre 2026 (T42), Lagon Arena vit dans la **base commune des applications du site** (projet Supabase `cukahpyqkljiddmimpyi`), dans son propre schéma, `lagon`. Les migrations, leur ordre, leurs inverses et les vérifications sont dans [`supabase/LISEZMOI.md`](../supabase/LISEZMOI.md) ; `supabase.sql` est le script complet, fabriqué à partir d'elles par `outils/supabase_sql.py` (pour installer sa propre copie).

- **Le schéma `lagon` n'est pas exposé à l'API** : aucune table n'est lisible ni modifiable directement, même par erreur. Toutes les tables ont la RLS, sans règle et sans droit pour `anon`.
- **La page passe par les fonctions `public.lagon_…`** (`security definer`, `search_path` vide, appelables par `anon` seul). `js/db.js` ajoute le préfixe tout seul : la page appelle `rpc("creer_salle")`, la base reçoit `lagon_creer_salle`. Pendant les 30 jours où l'ancien projet reste en réserve, `js/db.js` reconnaît aussi l'ancienne forme (tables dans `public`, fonctions sans préfixe).
- Chaque table, chaque colonne et chaque fonction a un **commentaire** en français, que le tableau de bord affiche ; la vue `commun.registre` les liste avec les autres applications.

| Table (`lagon.`) | Contenu | Données d'élèves |
|---|---|---|
| `salles` | code (c'est lui qui identifie la classe), établissement (facultatif), manche, phase, fin du chrono, graine, nouveauté, duel, `config` (réglages de la manche préparée, en JSON) | non |
| `salles_secrets` | le secret de pilotage de chaque salle (enseignant·e) | non (secret) |
| `joueurs` | pseudo, couleur, date d'arrivée | oui |
| `joueurs_jetons` | jeton de chaque élève (il contient son code de session) | oui (secret) |
| `programmes` | le programme envoyé par manche (l'ancienne table `tortues`) | oui |
| `scores` | nids, rang, points, bonus, nouveauté (+ version), duel, équipe, lagon personnalisé | oui (pseudo) |
| `compteurs` | compteurs de l'accueil (parties, participants, salles) et date du dernier ménage, gardés à part pour que le ménage ne les fasse pas baisser | non |
| `pantheon` | pseudo, date d'entrée, établissement (colonne `lycee`, celui de la salle), classe d'origine (`salle`, jamais affichée ; vide = proposée hors classe), `manche` (entrées automatiques), moyenne, version du banc, **programme**, empreinte du programme, jeton (code Panthéon), vérifié | oui |
| `pantheon_admin` | l'**empreinte** (bcrypt) du mot de passe de l'administration du Panthéon | non (secret) |

Les fonctions d'entrée (toutes préfixées `lagon_` dans la base ; ci-dessous sans le préfixe) :

| Fonction | Qui | Rôle |
|---|---|---|
| `creer_salle(établissement)` | tout le monde | crée une salle (l'établissement est facultatif), renvoie le code et le secret ; lance le ménage |
| `salle(code)`, `joueurs(code)`, `scores(code)` | tout le monde, avec le code de la salle | l'état de la salle ; les pseudos et couleurs ; les scores (elles remplacent l'ancienne lecture publique des tables) |
| `programmes(code)` | tout le monde, avec le code de la salle | les programmes, **seulement après le brawl** de leur manche |
| `definir_etablissement(code, secret, établissement)` | enseignant·e | renseigner, corriger ou effacer l'établissement de la salle ; les tortues de la classe au Panthéon le suivent |
| `piloter_salle(code, secret, …)` | enseignant·e | change de manche, de phase, de chrono, de nouveauté |
| `definir_config(code, secret, config)` | enseignant·e | publie les réglages de la manche préparée (équipes, points…) |
| `enregistrer_scores(code, secret, manche, scores)` | enseignant·e | enregistre les scores calculés par son navigateur |
| `retirer_joueur`, `liberer_pseudo` | enseignant·e | retirer un·e élève, débloquer un pseudo |
| `codes_session(code, secret)` | enseignant·e | la liste des codes de session des élèves |
| `codes_manche(code, secret, manche)` | enseignant·e | la dernière tortue envoyée par chaque élève (manche ≤ `manche`), **même pendant la programmation** : pour l'état de chaque élève et sa fiche. Le public ne voit toujours rien avant le brawl |
| `pantheon_classe(code, secret, manche, entrées)` | enseignant·e | le Panthéon automatique : au plus 3 tortues `{pseudo, code, moyenne, banc}` ; le code doit être une tortue vraiment envoyée par l'élève dans la salle. Même programme déjà au Panthéon → rien (`deja` ou `copie`) ; même élève (même salle, même pseudo) → remplacée si meilleure (`ameliore`, sinon `moins_bien`) ; sinon `nouveau`, avec un code Panthéon tiré au hasard. Renvoie le statut et le rang de chacune |
| `rejoindre(salle, pseudo, jeton, couleur)` | élève | rejoindre (ou revenir avec le même jeton) ; **aucun plafond du nombre de joueurs** |
| `deposer_tortue(salle, pseudo, jeton, manche, code)` | élève | envoyer sa tortue pour la manche en cours |
| `changer_jeton`, `ma_tortue`, `retrouver_session(jeton)` | élève | passer à un code de session ; retrouver sa dernière tortue ; revenir avec son seul code de session |
| `mon_entree_pantheon(salle, pseudo, jeton)` | élève | sa tortue de la classe au Panthéon (rang, moyenne, manche) **et son code Panthéon**, retrouvé grâce à son jeton de session |
| `etat_depots(salle, manche)` | tout le monde | qui a envoyé (sans le code) |
| `heure_serveur()` | tout le monde | pour synchroniser les chronos |
| `statistiques()` | tout le monde | les chiffres de l'accueil (et lance le ménage, au plus une fois par heure) |
| `proposer_pantheon(pseudo, code, moyenne, banc, jeton, salle, jeton de session)` | élève | entrer au Panthéon, ou améliorer sa tortue (gardée si elle fait mieux). Avec la salle et le jeton de session, la tortue est rattachée à la classe, avec l'établissement de la salle ; hors classe, sans établissement (l'élève ne le donne jamais) |
| `pantheon_top(limite, établissement)`, `pantheon_lycees()`, `ma_tortue_pantheon(jeton)` | tout le monde | le classement **sans les programmes ni la classe** : rang, pseudo, établissement, moyenne, vérifiée, date |
| `pantheon_admin`, `pantheon_valider`, `pantheon_retirer` | administration | lire les programmes (et la manche des entrées automatiques), corriger un score recalculé, retirer une tortue |

Les listes sans borne (joueurs, scores, programmes, codes) sont renvoyées en un seul objet JSON : l'API de Supabase ne les coupe donc pas à 1 000 lignes.

**Le code de session** d'un·e élève (8 caractères, sans lettres ambiguës) *est* son jeton : `jeton = "perso-" + CODE + "-lagon"`. Le retaper sur un autre ordinateur suffit donc à reprendre son pseudo, sans compte.

**Le ménage** (`lagon.menage()`, appelée par `creer_salle` et `statistiques`, au plus une fois par heure) supprime les séances terminées depuis 7 jours, les salles jamais commencées depuis 7 jours, et les salles sans activité depuis 60 jours (l'activité compte aussi les élèves qui rejoignent ou envoient leur tortue).

**Le Panthéon.** Le navigateur de l'élève calcule la moyenne sur le banc d'essai et l'envoie avec le programme. La base ne peut pas refaire le calcul : un score envoyé à la main peut donc être faux. D'où : le programme est gardé (illisible par le public), l'empreinte refuse deux fois le même programme (sans commentaires ni espaces), et l'**administration du Panthéon** recalcule les scores dans son navigateur (`pantheon.html?admin`, recalcul déterministe) puis les valide (⏳ → ✔). Au-delà de 1 000 tortues, les moins bonnes sont effacées.

**Défier les meilleures tortues** (piste) : faire jouer un·e élève contre une tortue du Panthéon sans révéler son programme suppose que le match soit joué **par le serveur** (par exemple une fonction Supabase Edge, qui peut importer les modules du moteur tels quels) et que seules les images du match soient renvoyées.

**Stockage local** (navigateur, `js/stockage.js`) : chaque valeur est enregistrée avec sa date d'expiration, effacée au chargement des pages une fois dépassée. **Un jour** pour ce qui est à l'élève (postes partagés) : jetons et codes de session (`lagon:jeton:…`, `lagon:codeperso:…`), programme en cours (`lagon:code:…`), dernier envoi, préférences, progression des tutoriels (`lagon:tuto…`), code Panthéon. **60 jours** pour l'enseignant·e : ses salles et leur secret (`lagon:prof`), ses réglages, ses préparations de manche, le mode démo (`lagon-demo-v1`). La durée repart à chaque écriture, pas à la lecture.

## 8. Vérifier

```bash
node outils/verifier.mjs
```

Sans navigateur, il vérifie les missions des tutoriels, les tests de la tortue (les 6 tortues types vues en classe ont le bon verdict et la bonne explication, aucune fausse alerte sur les bonnes tortues, le rapport ne conseille jamais d'ajouter un `pondre()` déjà écrit), le déterminisme (y compris les anciennes manches et le mode léger), les capteurs experts sur des lagons construits à la main, 3 000 cartes aléatoires et 400 parties, les lagons personnalisés (réglages appliqués, valeurs extrêmes sans blocage, partie normale inchangée), le banc d'essai du Panthéon et le refus des copies, la catégorie de chaque primitive, et affiche l'équilibrage des tortues d'entraînement.

### Les tests (`outils/tests/`)

Les parcours dans le navigateur (Playwright + Chromium) : chacun joue un vrai usage du site et **s'arrête au premier problème**, y compris une erreur JavaScript dans une page.

```bash
node outils/tests/tout.mjs                 # tous les parcours, en mode démo (≈ 3 min 30)
node outils/tests/tout.mjs session tuto    # seulement ceux-là
LAGON_DB=http://localhost:3300 node outils/tests/tout.mjs    # + les parcours « base »
node outils/tests/captures.mjs             # captures aux 5 tailles d'écran, comparées à la référence
node outils/tests/captures.mjs --reference # … et cette série devient la référence
```

- `tout.mjs` démarre un petit serveur statique (Node, sans dépendance) sur un port libre (8770 et +), lance chaque parcours, puis affiche un résumé ✔ / ✘ ; le code de sortie vaut 1 si un parcours échoue.
- **Mode démo** (par défaut) : `js/config.js` est remplacé, pour les pages de test, par une configuration **sans base** : les tests ne touchent jamais la vraie base. Dans ce mode, la « base » vit dans le navigateur (`lagon-demo-v1`) : un « autre ordinateur » reçoit une copie de celle de la page de départ (`t.autreOrdinateur`).
- **Mode base** (`LAGON_DB`) : les parcours marqués `modes: ["demo", "base"]` sont rejoués contre une base **locale** (PostgreSQL + PostgREST avec `supabase.sql`), jamais celle des élèves. Pour l'administration du Panthéon : `LAGON_ADMIN` (mot de passe d'administration de la base locale).
- `lib.mjs` : les outils communs (pages prêtes, `ok`, `egal`, `contient`, `attendre`, `sansDebordement`…) et les gestes d'une séance (`creerSalle`, `rejoindre`, `lancerManche`, `envoyer`, `brawl`).
- `parcours/*.mjs` : un fichier par parcours (`export default { nom, titre, ordre, modes, delai, lancer(t) }`).

| Parcours | Ce qu'il vérifie |
|---|---|
| `accueil` | entrer (salle + pseudo, ou code de session), salle inconnue, 4 missions et leur progression, les 6 cartes des règles, la vue enseignant·e mémorisée, le lien d'invitation, les compteurs (base) |
| `tutoriel` | les 4 missions (navigation, `?mission=`), 🎮 Pilote ta tortue (refus expliqué, un nid), vrai / faux des règles, Si… alors…, Complète le code, Mon premier if, une mission dans le lagon, Construis ta tortue avec 🧩 jusqu'au 🟢, « Emporter » jusque dans l'éditeur |
| `tuto-avance` | les 3 niveaux, toutes les étapes, les exercices réussis avec une bonne solution, le quiz expert, la progression |
| `bac` | les onglets du bac à sable, l'aide-mémoire, le bilan 🔴 → 🟢, ▶ Tester → 🧪 Tester, « Rejouer ce lagon », un clic sur la pensée ramène à la ligne, la nouveauté, l'estimation, le coup de pouce, « côte à côte », le mode avancé, ↺ |
| `mesregles` | 🧩 : ajouter au bon rang (et une question écrite à la main), monter, descendre, supprimer, toujours une seule chaîne, l'alerte « deux blocs » |
| `regles` | 📜 Règles (6 cartes, modèle, détail) et 💡 Conseils ; les mêmes cartes à l'accueil et dans le tutoriel |
| `seance` | une séance : 3 élèves, pseudo déjà pris, 2 manches, état d'envoi sur le bouton, compteur d'envois, brawl, résultats et classement chez l'élève, « Et si… ? », fin de séance |
| `equipes` | 3 équipes, bascule et glisser-déposer, carte d'équipe et primitives d'équipe chez l'élève, retardataire, score des équipes, manche ×2 réglée à la main |
| `session` | manche longue, code de session montré tout de suite, entrée par le SEUL code, mauvais code, la dernière tortue revient, lien `#code=`, « Reprendre ma partie », codes de session chez l'enseignant·e |
| `devoir` | lien et message pour les élèves, invitation, code de session, envoi, brawl plus tard |
| `lagon` | lagon personnalisé : réglages, résumé, bac à sable de l'élève, brawl, match rejoué identique (et différent sans) |
| `etablissement` | établissement à la création, prérempli, modifiable, repris au Panthéon par l'élève de la salle |
| `pantheon` | copie refusée, banc d'essai, entrée hors classe (sans établissement) et de classe (établissement de la salle), même programme refusé, page publique (pseudo, établissement, score, date ; jamais la classe), filtre, retrouver avec son code, administration |
| `stockage` | 1 jour pour l'élève, 60 jours pour l'enseignant·e, ménage au chargement, autres sites intacts |
| `telephone` | à 390 px, aucune page ne déborde : accueil, toutes les étapes des tutoriels, tous les onglets élève, Panthéon, enseignant·e |

Pour ajouter un parcours : copier un fichier de `parcours/`, changer `nom` et `titre`, et vérifier ce qu'un utilisateur verrait (textes, boutons) plutôt que des détails internes.

## 9. Recettes

**Ajouter un capteur**

1. Le calculer dans `js/moteur/capteurs.js` (et, s'il est coûteux, ne le calculer que s'il est utilisé).
2. Déclarer son type dans `SENSORS` (`js/interp.js`).
3. Le décrire dans `CAPTEURS` (`js/primitives.js`) : icône, rôle en mots simples, niveau (`avance`, `groupe`, `equipe`). L'autocomplétion, la boîte à outils et l'aide suivent automatiquement.
4. Lui donner une valeur par défaut dans `SITUATION_BASE` (`js/moteur/diagnostic.js`), pour les tests de la tortue et les exercices des tutoriels.
5. Ajouter un contrôle dans `outils/verifier.mjs`, et la ligne correspondante dans [REGLES.md](REGLES.md#10-toutes-les-primitives).

**Ajouter une nouveauté de manche** : une entrée dans `TWISTS` (`js/moteur/regles.js`) avec le nombre de requins, leur vitesse, leur vision, le plastique et les heures de nuit. Elle apparaît dans le panneau « Préparer la manche » et dans l'équilibrage du vérificateur.

**Ajouter une mission** : un scénario dans `js/moteur/missions.js` (code à réparer, solution, critère de réussite), une étape dans le tutoriel concerné (`etapeMission` de `js/tutokit.js`), et le vérificateur contrôle automatiquement que le code donné échoue et que la solution réussit.

## 10. Maintenance du site

**Tester sur son ordinateur.** Les modules JavaScript ne fonctionnent pas en ouvrant les fichiers directement (`file://`) : il faut un petit serveur.

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000/?demo
```

Avec `?demo`, tout reste dans le navigateur (le mode est mémorisé pour l'onglet ; `?demo=0` l'annule).

**Changer la base** : écrire une migration numérotée dans `supabase/` (avec son inverse), la faire voir à l'enseignant avant de l'appliquer, puis refabriquer `supabase.sql` (`python3 -I outils/supabase_sql.py`) dans le même commit : voir [`supabase/LISEZMOI.md`](../supabase/LISEZMOI.md) et les règles des bases du site. Toute évolution du schéma doit rester **compatible avec les pages déjà ouvertes** (on ajoute d'abord, on publie la page, puis on retire).

**Après une modification du moteur** : `node outils/verifier.mjs`. Changer une règle change le résultat des anciennes manches quand on les rejoue : voir la [compatibilité des anciennes séances](#5-compatibilité-des-anciennes-séances).

**Réglages** (`js/config.js`) : adresse publique du site (`URL_SITE`, utilisée dans tous les liens donnés aux élèves), durées de programmation par défaut, nombre minimum de tortues. La clé de la base qui y figure est la clé **« publishable »**, publique, faite pour être visible (envoyée dans l'en-tête `apikey`) : la sécurité repose sur les règles de `supabase.sql`. Une clé secrète ne doit jamais y être placée.

**Le Panthéon** : pour l'administrer, choisir un mot de passe d'au moins 12 caractères et l'enregistrer une fois dans l'éditeur SQL (`select lagon.definir_mot_de_passe_admin('…');` : seule son empreinte est gardée), puis ouvrir `pantheon.html?admin`. Si les règles du moteur changent, le banc d'essai doit changer de version (`BANC.version` dans `js/pantheon.js`, et la version acceptée dans `lagon_proposer_pantheon`) et les tortues doivent être revérifiées.

**Bon à savoir** :

- la base de l'offre gratuite se met en pause après environ une semaine sans activité : il faut la réactiver depuis son tableau de bord avant le cours ;
- à chaque création de salle, les salles inutilisées depuis 60 jours sont supprimées avec les pseudos de leurs élèves, leurs tortues et leurs scores ;
- la charge est faible : 30 élèves interrogent la base toutes les 2 secondes, et ne reçoivent que du texte. Il n'y a pas de plafond du nombre d'élèves ; au-delà d'une trentaine de tortues, le brawl est plus long à calculer (chantier du TODO).

---

Conçu par Babash - NSI Tani Malandi, développé avec [Claude Code](https://claude.com/claude-code) · [Code source sur GitHub](https://github.com/babash/lagon-arena) · code [MIT](../LICENSE), documents [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.fr)
