# 🧭 Architecture technique

[← Retour au README](../README.md) · [Règles](REGLES.md) · [Pédagogie](PEDAGOGIE.md)

Pour qui veut comprendre, relire, corriger ou faire évoluer le code. Pour **utiliser** le jeu, il n'y a rien à installer : tout se passe sur [le site](https://babash.github.io/lagon-arena/index.html).

---

## 1. Les principes

1. **Un site statique, sans outil de construction.** Du HTML, du CSS et des modules JavaScript (ES modules) servis tels quels par GitHub Pages. Aucun framework, aucune dépendance npm, aucune étape de *build* : on modifie un fichier, on recharge la page.
2. **Un moteur pur et déterministe.** `js/moteur/` ne touche jamais à la page. Même graine + mêmes codes ⇒ **exactement le même match**, sur n'importe quel navigateur.
3. **La base ne stocke que du texte.** Les salles, les pseudos, le **code** des tortues et les scores. Elle ne calcule rien : **chaque navigateur rejoue lui-même les matchs** à partir des codes. C'est ce qui permet de tenir dans l'offre gratuite de Supabase.
4. **L'écriture passe par des fonctions qui vérifient un secret.** Personne n'écrit directement dans les tables : seulement via des fonctions SQL (`SECURITY DEFINER`) qui contrôlent le jeton de l'enseignant ou celui de l'élève.
5. **Tout en français**, y compris les noms de variables et les commentaires : le code doit pouvoir être lu par un enseignant de NSI.

## 2. Le déroulé d'une manche, côté technique

```
 Enseignant (prof.html)                Base Supabase                    Élèves (eleve.html)
 ──────────────────────                ─────────────                    ───────────────────
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
```

- La **graine d'une manche** est dérivée de la graine de la salle et du numéro de manche (`graineManche` dans `js/moteur/hasard.js`).
- Les élèves ne font pas confiance à l'écran projeté : ils **recalculent** le match chez eux pour le revoir en suivant leur tortue, et pour le « Et si… ? » (même graine, leur nouveau code).
- Le **bac à sable** et l'**estimation** (📊 Estimer) tournent entièrement dans le navigateur de l'élève, sans la base.

## 3. Arborescence

```
index.html  tuto.html  tuto-avance.html  eleve.html  prof.html  pantheon.html
css/style.css
img/                  ← icône (tortue.svg)
docs/                 ← documentation (et docs/img : captures d'écran)
js/config.js          ← URL + clé publique Supabase, adresse publique du site (URL_SITE), durées
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
  moteur/rapport.js       le rapport de match et les conseils
  moteur/missions.js      les missions des tutoriels (scénarios fixes)
js/interp.js          ← mini-interpréteur Python (conditions), messages d'erreur en français
js/primitives.js      ← capteurs, actions, mots-clés, leur rôle en mots simples et leur catégorie (source unique)
js/brawl.js           ← participants, équipes, lancement d'une manche, scores, classement (partagé prof / élèves)
js/db.js              ← accès Supabase (API REST) ou mode démo (localStorage), même interface
js/stockage.js        ← stockage local avec durée de vie (1 jour pour l'élève, 60 jours pour l'enseignant)
js/render.js          ← dessin du lagon (canvas)
js/viewer.js          ← visionneuse de match (lagon + frise + « pensée » de la tortue)
js/editor.js          ← éditeur coloré, autocomplétion, boîte à outils, indentation visible
js/pouce.js           ← le « coup de pouce » gradué
js/common.js          ← outils de page, liens à donner, code de session
js/aide.js            ← l'aide de l'écran élève : 📜 Règles et 💡 Conseils
js/accueil.js         ← la page d'accueil (vues élève / enseignant, compteurs, rejoindre une salle)
js/pantheon.js        ← le banc d'essai du Panthéon (20 parties fixes), repères, programmes déjà connus
js/pantheon/          ← la page du Panthéon : main.js (classement, lycées, ma tortue), admin.js (vérifier, retirer)
js/tutokit.js         ← composants des tutoriels (exemples, exercices, quiz, missions, navigation)
js/tuto.js            ← le tutoriel débutant
js/tuto-avance/       ← main.js (choix du niveau), commun.js, moyen.js, expert.js, equipe.js,
                        strategies.js (les stratégies complètes données en exemple)
js/eleve/             ← main.js, etat.js (état partagé S), ui.js, editeur.js, bac.js (bac à sable,
                        estimation), envoi.js, session.js (code de session), manche.js (suivre la salle),
                        resultats.js, pantheon.js (proposer sa tortue au Panthéon)
js/prof/              ← main.js, etat.js (état partagé S, piloter), accueil.js, salle.js, scenes.js
                        (ce qui est projeté), preparer.js (préparer la manche), liens.js, demo.js
supabase.sql          ← tables, règles de sécurité (RLS) et fonctions ; relançable sans risque
outils/verifier.mjs   ← vérification du moteur (node, sans navigateur)
```

Les écrans `eleve/` et `prof/` suivent le même schéma : un état partagé `S` dans `etat.js`, des modules qui ne s'importent pas en boucle, et des **crochets** (`quandModifie`, `quandPilotee`) pour prévenir les autres modules d'un changement.

## 4. Le moteur

`simulate({ joueurs, graine, twist, ticks, scenario, version, leger, lagon })` (`js/moteur/simulation.js`) :

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
- **Pour changer une règle sans casser les anciennes manches** : conditionnez-la à `m.version >= 3`, passez `VERSION_CARTE` à 3 dans `js/moteur/carte.js`, et ajoutez un contrôle dans `outils/verifier.mjs`.

## 6. L'interpréteur (`js/interp.js`)

Un mini-Python écrit pour l'occasion, en trois temps : découpage en mots (*tokens*) avec gestion de l'indentation, analyse (*parsing*) en arbre, puis exécution d'un tour.

- Il accepte `def tour():`, `if`/`elif`/`else` imbriqués, `and`/`or`/`not` (évaluation paresseuse, comme Python), les comparaisons, `+ - *`, des variables locales, `pass`, `return` ([détails](REGLES.md#11-le-langage-accepté)).
- La table `SENSORS` liste les capteurs connus et leur type (booléen ou nombre) ; `ACTIONS` liste les ordres. Un nom inconnu, ou un capteur sans parenthèses, donne une erreur claire.
- Les erreurs sont **en français**, avec la ligne et une suggestion (distance d'édition sur les noms connus).
- Il n'y a ni boucle ni récursion : un tour s'exécute toujours en temps borné.

## 7. La base de données (`supabase.sql`)

| Table | Contenu | Lecture |
|---|---|---|
| `salles` | code, manche, phase, fin du chrono, graine, nouveauté, duel, `config` (réglages de la manche préparée, en JSON) | publique |
| `salles_secret` | jeton enseignant de chaque salle | personne |
| `joueurs` | pseudo, couleur | publique |
| `joueurs_secret` | jeton de chaque élève | personne |
| `tortues` | code envoyé par manche | **seulement après le brawl** de la manche (politique RLS) |
| `scores` | nids, rang, points, bonus, nouveauté (+ version), duel, équipe, lagon personnalisé | publique |
| `compteurs` | compteurs de l'accueil (parties, participants, salles), gardés à part pour que le ménage ne les fasse pas baisser | personne (fonction `statistiques`) |
| `pantheon` | pseudo, lycée, moyenne, version du banc, **programme**, empreinte du programme, jeton (code Panthéon), vérifié | personne (fonctions ci-dessous) |
| `admin_secret` | le mot de passe de l'administrateur du Panthéon | personne |

| Fonction | Qui | Rôle |
|---|---|---|
| `creer_salle()` | tous | crée une salle, renvoie le code et le secret ; supprime les salles inutilisées depuis 60 jours |
| `piloter_salle(code, secret, …)` | enseignant | change de manche, de phase, de chrono, de nouveauté |
| `definir_config(code, secret, config)` | enseignant | publie les réglages de la manche préparée (équipes, points…) |
| `enregistrer_scores(code, secret, manche, scores)` | enseignant | enregistre les scores calculés par son navigateur |
| `retirer_joueur`, `liberer_pseudo` | enseignant | retirer un élève, débloquer un pseudo |
| `codes_session(code, secret)` | enseignant | la liste des codes de session des élèves |
| `rejoindre(salle, pseudo, jeton, couleur)` | élève | rejoindre (ou revenir avec le même jeton) |
| `deposer_tortue(salle, pseudo, jeton, manche, code)` | élève | envoyer sa tortue pour la manche en cours |
| `changer_jeton`, `ma_tortue` | élève | passer à un code de session ; retrouver sa dernière tortue |
| `etat_depots(salle, manche)` | tous | qui a envoyé (sans le code) |
| `heure_serveur()` | tous | pour synchroniser les chronos |
| `statistiques()` | tous | les chiffres de l'accueil (et lance le ménage, au plus une fois par heure) |
| `proposer_pantheon(pseudo, lycée, code, moyenne, banc, jeton)` | élève | entrer au Panthéon, ou améliorer sa tortue (gardée si elle fait mieux) |
| `pantheon_top(limite, lycée)`, `pantheon_lycees()`, `ma_tortue_pantheon(jeton)` | tous | le classement **sans les programmes** |
| `pantheon_admin`, `pantheon_valider`, `pantheon_retirer` | administrateur | lire les programmes, corriger un score recalculé, retirer une tortue |

**Le code de session** d'un élève (8 caractères, sans lettres ambiguës) *est* son jeton : `jeton = "perso-" + CODE + "-lagon"`. Le retaper sur un autre ordinateur suffit donc à reprendre son pseudo, sans compte.

**Le ménage** (`menage()`, appelée par `creer_salle` et `statistiques`, au plus une fois par heure) supprime les séances terminées depuis 7 jours, les salles jamais commencées depuis 7 jours, et les salles sans activité depuis 60 jours (l'activité compte aussi les élèves qui rejoignent ou envoient leur tortue).

**Le Panthéon.** Le navigateur de l'élève calcule la moyenne sur le banc d'essai et l'envoie avec le programme. La base ne peut pas refaire le calcul : un score envoyé à la main peut donc être faux. D'où : le programme est gardé (illisible par le public), l'empreinte refuse deux fois le même programme (sans commentaires ni espaces), et l'**administrateur** recalcule les scores dans son navigateur (`pantheon.html?admin`, recalcul déterministe) puis les valide (⏳ → ✔). Au-delà de 1 000 tortues, les moins bonnes sont effacées.

**Défier les champions** (piste) : faire jouer un élève contre une tortue du Panthéon sans révéler son programme suppose que le match soit joué **par le serveur** (par exemple une fonction Supabase Edge, qui peut importer les modules du moteur tels quels) et que seules les images du match soient renvoyées.

**Stockage local** (navigateur, `js/stockage.js`) : chaque valeur est enregistrée avec sa date d'expiration, effacée au chargement des pages une fois dépassée. **Un jour** pour ce qui est à l'élève (postes partagés) : jetons et codes de session (`lagon:jeton:…`, `lagon:codeperso:…`), programme en cours (`lagon:code:…`), dernier envoi, préférences, progression des tutoriels (`lagon:tuto…`), code Panthéon. **60 jours** pour l'enseignant : ses salles et leur secret (`lagon:prof`), ses réglages, ses préparations de manche, le mode démo (`lagon-demo-v1`). La durée repart à chaque écriture, pas à la lecture.

## 8. Vérifier

```bash
node outils/verifier.mjs
```

Sans navigateur, il vérifie les missions des tutoriels, le déterminisme (y compris les anciennes manches et le mode léger), les capteurs experts sur des lagons construits à la main, 3 000 cartes aléatoires et 400 parties, les lagons personnalisés (réglages appliqués, valeurs extrêmes sans blocage, partie normale inchangée), le banc d'essai du Panthéon et le refus des copies, la catégorie de chaque primitive, et affiche l'équilibrage des tortues d'entraînement.

Les parcours dans le navigateur (créer une salle, faire jouer des élèves, manches longues, équipes, devoir…) ont été testés avec Playwright pendant le développement, contre une copie locale de la base (PostgreSQL + PostgREST). Ces scripts ne sont pas encore dans le dépôt (voir la feuille de route du README).

## 9. Recettes

**Ajouter un capteur**

1. Le calculer dans `js/moteur/capteurs.js` (et, s'il est coûteux, ne le calculer que s'il est utilisé).
2. Déclarer son type dans `SENSORS` (`js/interp.js`).
3. Le décrire dans `CAPTEURS` (`js/primitives.js`) : icône, rôle en mots simples, niveau (`avance`, `groupe`, `equipe`). L'autocomplétion, la boîte à outils et l'aide suivent automatiquement.
4. Lui donner une valeur par défaut dans `SITUATION_BASE` (`js/tutokit.js`), pour les exercices des tutoriels.
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

**Après une modification de `supabase.sql`** : relancer le script en entier dans l'éditeur SQL de la base. Il est relançable sans risque : il ajoute les colonnes et fonctions manquantes et conserve les salles, les élèves et les scores. Toute évolution du schéma doit rester **compatible avec les pages déjà ouvertes** (colonnes ajoutées avec une valeur par défaut, anciennes fonctions conservées).

**Après une modification du moteur** : `node outils/verifier.mjs`. Changer une règle change le résultat des anciennes manches quand on les rejoue : voir la [compatibilité des anciennes séances](#5-compatibilité-des-anciennes-séances).

**Réglages** (`js/config.js`) : adresse publique du site (`URL_SITE`, utilisée dans tous les liens donnés aux élèves), durées de programmation par défaut, nombre minimum de tortues. La clé de la base qui y figure est une clé **publique**, faite pour être visible : la sécurité repose sur les règles de `supabase.sql`. Une clé secrète ne doit jamais y être placée.

**Le Panthéon** : pour l'administrer, choisir un mot de passe d'au moins 12 caractères et l'enregistrer une fois dans l'éditeur SQL (`insert into public.admin_secret (secret) values ('…') on conflict (id) do update set secret = excluded.secret;`), puis ouvrir `pantheon.html?admin`. Si les règles du moteur changent, le banc d'essai doit changer de version (`BANC.version` dans `js/pantheon.js`, et la version acceptée dans `proposer_pantheon`) et les tortues doivent être revérifiées.

**Bon à savoir** :

- la base de l'offre gratuite se met en pause après environ une semaine sans activité : il faut la réactiver depuis son tableau de bord avant le cours ;
- à chaque création de salle, les salles inutilisées depuis 60 jours sont supprimées avec leurs joueurs, leurs tortues et leurs scores ;
- la charge est faible : 30 élèves interrogent la base toutes les 2 secondes, et ne reçoivent que du texte.
