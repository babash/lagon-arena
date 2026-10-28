# 🐢 Lagon Arena

**Jeu de programmation pour la 1re NSI : les conditions en Python.**
Chaque élève programme une tortue marine avec des `if` / `elif` / `else`, `and` / `or` / `not` et des comparaisons.
Toutes les tortues de la classe plongent ensuite **en même temps** dans le même lagon, projeté au tableau : c'est le **brawl**.
Le but est de pondre un maximum de nids en échappant aux requins.
Après chaque match, chaque élève revoit **sa** tortue ligne par ligne, comprend ce qui n'a pas marché, la corrige… puis vient le **rematch**.

- Une seule séance (≈ 55 min), 20 élèves (30 au maximum).
- Uniquement des conditions : pas de boucle ni de variable compliquée.
- Site statique (GitHub Pages) et petite base de données gratuite (Supabase).
- Aucune donnée personnelle : un pseudo, une couleur, le code des tortues et les scores.

---

## 1. Les pages du site

| Page | Pour qui | Rôle |
|---|---|---|
| `index.html` | élèves | Accueil : tutoriel, rejoindre une salle (code + pseudo + couleur), bac à sable |
| `tuto.html` | élèves | **Tutoriel** en 14 étapes courtes : un exemple à manipuler, puis un petit exercice vérifié tout de suite |
| `eleve.html` | élèves | Programmer, tester, envoyer sa tortue ; résultats, rapport, « Et si… ? », classement, aide |
| `tuto-avance.html` | élèves avancés | **Tutoriel avancé** (niveau intermédiaire) : distances, comparaisons, `or` / `not`, algues libres, pousser, anticiper la nuit |
| `eleve.html?libre=1` | élèves | Bac à sable seul, sans salle (pour s'entraîner à la maison) |
| `prof.html` | enseignant | Créer la salle, lancer les manches, projeter les brawls, podium, export CSV |

### Le tutoriel (`tuto.html`) : pensé pour les grands débutants

Chaque étape montre **d'abord un exemple à manipuler**, avec très peu de texte, puis un **petit exercice vérifié tout de suite**. Une étoile ⭐ marque chaque exercice réussi.

1. **Le jeu** : le but en une phrase et un match de démonstration animé.
2. **Le lagon** : la légende illustrée.
3. **Les questions (capteurs)** : la liste des capteurs. Un quiz en images montre une tortue en gros plan et demande : « Que répond `algue_ici()` ? True ou False ? »
4. **Les ordres (actions)** : la liste des actions. Un quiz donne une situation et demande quel ordre donner.
5. **Ton premier `if`** :
   - un `if` décortiqué en couleurs (`if`, la question, les deux-points, les 4 espaces, l'ordre) ;
   - un interrupteur True/False pour voir l'effet ;
   - puis l'élève écrit son premier `if`, vérifié dans 2 situations.
6. **`else`** : un exemple avec interrupteur, puis un exercice.
7. **`elif`, le premier vrai gagne** : un exemple et un quiz « Devine ce que fait la tortue ».
8. **`and`** : un testeur de ponte, puis un exercice.
9. **Énergie et dangers** : une jauge à manipuler et 4 règles en une ligne chacune.
10. à 13. **4 tortues à réparer** dans le lagon. Chacune vient avec un indice ; le bouton « Voir la solution » apparaît après 2 essais.

   | Mission | Notion | Ce qui ne va pas |
   |---|---|---|
   | 1 | `if` | La tortue va vers les algues mais ne mange jamais. |
   | 2 | ordre des `elif` | Elle mange alors qu'un requin arrive. |
   | 3 | `and` | Elle essaie de pondre en plein jour. |
   | 4 | `not` | Elle avale un sac plastique. |

14. **En classe** : le déroulé de la séance et le barème des points.

### Le tutoriel avancé (`tuto-avance.html`) : pour les élèves à l'aise

Il ne remplace pas le premier tutoriel : il ajoute des primitives **cachées par défaut** pour ne pas noyer les débutants.

| Étape | Contenu |
|---|---|
| 1 | Le lagon bouge : les touffes d'algues se vident puis repoussent ailleurs, les sacs plastique dérivent, le soleil fatigue sur la plage, on peut pousser |
| 2 | Les distances : `distance_algue()`, `distance_plage()`, `distance_requin()`, avec des curseurs et un quiz « vrai ou faux » sur `<`, `<=`, `==`, `!=` |
| 3 | `or` et `not` (et les parenthèses), suivis d'un exercice |
| M1 | Mission « Le buffet est pris » : `aller_vers_algue_libre()` |
| 4 | Pousser : `pousser()` (−2 ⚡), `tortue_a_cote()`, `requin_derriere_tortue()`, suivis d'un exercice |
| M2 | Mission « La pirate » : pousser une rivale sur un requin, en testant le bon capteur en premier |
| 5 | Anticiper la nuit avec `heure()` et `distance_plage()` |
| 🏆 | Le défi : lire le code de la tortue **Pirate** 🤖 et activer le mode avancé |

**Mode avancé** : sous l'éditeur de l'écran élève, l'interrupteur « 🚀 Primitives avancées » ajoute les nouvelles primitives à l'autocomplétion, à la boîte à outils et à l'aide. Dans le bac à sable, la tortue Pirate 🤖 rejoint alors les tortues d'entraînement. Le jeu accepte toujours toutes les primitives : l'interrupteur ne change que ce qui est proposé.

### Les aides pour les débutants (dans tous les éditeurs)

- **Autocomplétion** :
  - on tape le début d'un mot et l'éditeur propose la suite, avec le rôle de chaque primitive ;
  - on peut aussi taper en français : *si*, *sinon*, *et*, *pas*, *nuit*, *plage*… ;
  - les propositions tiennent compte de l'endroit : seulement des questions après un `if`, seulement des ordres en début de ligne.
- **Boîte à outils** : toutes les primitives en boutons. Un clic insère le mot dans le code et rappelle son rôle.
- **Barre d'info** sous l'éditeur : le rôle du mot sous le curseur.
- **Indentation visible** : un trait vertical coloré par niveau de décalage. Quand le curseur est sur un `if`, un `elif` ou un `else`, les mots-clés qui vont ensemble sont surlignés en jaune, avec le trait qui les relie. La barre d'info précise, par exemple : « Ce `else` va avec le `if` de la ligne 5 ».
- **Bouton 📋 Copier** sur tous les blocs de code : l'éditeur, les solutions, le coup de pouce, la « pensée » de la tortue, l'aide-mémoire.
- **Deux-points ajoutés automatiquement** quand on oublie les `:` après `if`, `elif` ou `else` (l'éditeur le signale), et **indentation automatique**.
- **💡 Coup de pouce** (écran élève) :
  - il donne **l'idée suivante** d'après ce qui manque dans le code, en 5 paliers : pondre la nuit sur la plage, se méfier des requins, vérifier l'énergie, éviter le plastique, partir avant la nuit ;
  - chaque palier montre un programme complet, les lignes à ajouter en vert ;
  - l'élève les recopie lui-même.
- **Rappels** : sous l'éditeur, une règle importante change toutes les 15 secondes.
- **Rapport après chaque match**, avec des conseils qui donnent le code à écrire. Exemple : « Attrapée en train de manger ! Mets tout en haut : `if requin_proche():` puis `fuir()` ».

---

## 2. Les règles du jeu (résumé pour l'enseignant)

- Un match dure **180 tours**, soit 3 jours et 3 nuits (1 journée = 60 tours). Il commence à 8 h ; la nuit va de 19 h à 6 h.
- À chaque tour, le jeu appelle la fonction `tour()` de l'élève. La tortue fait **une seule action** : la première rencontrée.
- **Pour marquer 1 point** : appeler `pondre()` **sur une plage**, **la nuit**, avec **au moins 6 d'énergie**. Pondre coûte 4 d'énergie.
- **L'énergie** :
  - au départ, 8 (maximum 10) ;
  - −1 tous les 6 tours ;
  - `manger()` sur des algues : +3 ;
  - `manger()` sur un sac plastique : −3 ;
  - à 0, la tortue est **épuisée** : retour au départ et bloquée 5 tours.
- **Les algues bougent** : une touffe a 5 portions. Mangée jusqu'au bout, elle disparaît et une nouvelle pousse ailleurs, à 2 cases ou plus des plages. Rester collé à la plage n'est donc plus une stratégie gagnante à coup sûr.
- **Les sacs plastique** dérivent, coulent au bout de 30 à 60 tours, puis réapparaissent ailleurs.
- **Le soleil** : le jour, une tortue qui reste sur la plage perd 1 ⚡ de plus tous les 3 tours.
- **Pousser** (primitive avancée) : `pousser()` coûte 2 ⚡ et pousse une tortue voisine d'une case. Si un requin attend derrière elle, elle est attrapée.
- **Les requins** voient à 4 cases et chassent la tortue la plus proche. Une tortue attrapée **perd 1 nid** (si elle en a), retourne au départ et reste bloquée 5 tours. Deux refuges :
  - **la plage**, où les requins ne vont jamais ;
  - **les algues** : la tortue y est invisible… **sauf quand elle mange**.

| Capteurs | Actions |
|---|---|
| `requin_proche()` : un requin à 3 cases ou moins | `manger()` |
| `algue_ici()`, `plastique_ici()`, `sur_plage()` | `pondre()` |
| `est_la_nuit()` | `fuir()`, `se_cacher()` |
| `energie()` (0 à 10), `heure()` (0 à 23) | `aller_vers_algue()`, `aller_vers_plage()` |

**La tortue de départ** sait manger mais **ne pond jamais** : sans rien changer, l'élève marque 0 nid. Il a donc intérêt à comprendre et à améliorer son code.

### Les nouveautés de manche (rematch)

| Nouveauté | Effet |
|---|---|
| 🌊 Lagon calme (manche 1) | 3 requins, quelques sacs plastique |
| 🛍️ Invasion de plastique (manche 2) | 22 sacs, surtout sur les algues : il faut `not plastique_ici()` |
| 🏆 Finale (manche 3) | 5 requins rapides et nuits courtes (20 h – 5 h) : il faut anticiper avec `heure()` |
| 🦈 Requins affamés, 🌙 Nuits courtes | Au choix de l'enseignant |
| ⛈️ Tempête | Tout à la fois (duel des champions) |

### Les points

- À chaque manche, les points dépendent du **rang parmi les élèves** : 25, 20, 16, 13, 11, 10, 9…, avec 1 point minimum.
- **+3 de bonus** si la tortue pond plus de nids qu'à la manche précédente. Un élève faible qui progresse marque donc aussi.
- Les tortues d'entraînement 🤖 servent **uniquement à compléter le lagon jusqu'à 8 tortues** (réglable), y compris pendant le duel. Elles ne marquent pas de points.
- Le **duel des champions** (les 3 premiers, complétés par des 🤖) est hors classement.

---

## 3. Déroulé conseillé d'une séance (≈ 55 min)

| Temps | Élèves | Enseignant (écran projeté) |
|---|---|---|
| 0–15 min | Font le **tutoriel** (`index.html` → « Commencer le tutoriel ») | Crée la salle dans `prof.html` ; le code s'affiche en grand |
| 15 min | Rejoignent la salle (code + pseudo) | Voit la liste des élèves arriver, puis clique sur **Lancer la manche 1** |
| 15–23 min | Programment, testent dans le bac à sable, **envoient** leur tortue | Chrono géant ; ✅ ou ⏳ pour chaque élève |
| 23–25 min | Écran « Brawl en cours, regarde le tableau » | **Lancer le brawl** : le match est animé, avec le classement en direct et le fil des événements |
| 25–28 min | Onglet **Résultats** : rang, rapport, conseils, rejeu de *leur* tortue avec ses pensées, « Et si… ? » | Podium de la manche et classement de la séance |
| 28–40 min | **Rematch** (manche 2, invasion de plastique), 6 min | Idem |
| 40–52 min | **Finale** (manche 3) | Idem |
| 52–55 min | (Duel des champions) puis bilan | Podium final, meilleure progression, **export CSV** |

Conseils :

- À 0 au chrono, les tortues modifiées mais non envoyées partent automatiquement (si le code est correct).
- Un élève qui n'envoie rien joue avec sa dernière tortue envoyée, ou avec la tortue de départ.
- « Terminer le chrono » laisse 5 secondes aux élèves. « +1 min » rallonge le temps.
- Le bouton **◧ Panneau** masque la colonne de gauche. Elle est masquée automatiquement pendant le brawl. **⛶ Plein écran** sert pour le vidéoprojecteur.
- La salle est pilotée **depuis le navigateur qui l'a créée** : le jeton enseignant y est enregistré. On peut la reprendre plus tard depuis « Mes salles ».
- **Arriver en cours de partie** : un élève peut rejoindre la salle à tout moment avec le code. L'écran projeté l'annonce (« 🆕 … rejoint la partie »), et sa tortue joue au brawl suivant.
- **Changer d'ordinateur** : si un élève doit continuer sur un autre poste, son pseudo est refusé (il est protégé). Cliquez sur 🔓 à côté de son nom : il pourra le reprendre, avec ses tortues et ses points.
- Le bouton ✕ retire un élève et ses tortues (pseudo inapproprié, doublon). Faites-le de préférence avant le premier brawl.

---

## 4. Mise en ligne (≈ 15 minutes, gratuit)

### Étape A : la base de données Supabase

1. Créez un compte sur <https://supabase.com>, puis **New project**.
   - Choisissez une **région européenne** (par exemple *West EU (Paris)* ou *Central EU (Frankfurt)*), ce qui est préférable pour le RGPD.
   - Le mot de passe de la base ne servira pas ici.
2. Ouvrez **SQL Editor → New query**. Copiez-collez **tout** le fichier `supabase.sql`, puis cliquez sur **Run**. Le script peut être relancé sans risque, par exemple après une mise à jour.
> ✅ **Déjà fait pour votre projet** : `js/config.js` contient l'URL et la clé de votre projet Supabase. Il reste seulement à exécuter `supabase.sql` (point 2).
> ⚠️ **À refaire après chaque mise à jour du site** : le script peut être relancé sans risque. La dernière version ajoute le déblocage de pseudo 🔓.
> Pour vérifier : la page d'accueil du site doit afficher « 🟢 Connecté à la base de données de la classe ».
> Si elle affiche « 🔴 La base de données n'est pas prête », exécutez `supabase.sql`.

3. Pour un autre projet : récupérez deux informations (bouton **Connect** en haut du tableau de bord, ou **Project Settings → API Keys / Data API**) :
   - l'**URL du projet** : `https://xxxxxxxx.supabase.co` ;
   - la **clé publique** : la *Publishable key* (`sb_publishable_…`) ou, sur un ancien projet, la clé *anon* (`eyJ…`).
4. Ouvrez `js/config.js` et recopiez-les :

   ```js
   SUPABASE_URL: "https://xxxxxxxx.supabase.co",
   SUPABASE_KEY: "sb_publishable_xxxxxxxxxxxx",
   ```

> ⚠️ La clé *publishable* (ou *anon*) est **faite pour être publique** : la sécurité repose sur les règles du script SQL.
> Ne mettez **jamais** la clé *secret* ou *service_role* dans ce fichier.

### Étape B : GitHub Pages

1. Sur <https://github.com>, créez un dépôt **public** (par exemple `lagon-arena`).
2. Déposez-y **le contenu** du dossier : *Add file → Upload files*, puis glissez tous les fichiers et dossiers. On peut aussi utiliser `git push`.
3. Allez dans **Settings → Pages**. Pour *Source*, choisissez *Deploy from a branch*, la branche `main` et le dossier `/ (root)`, puis cliquez sur **Save**.
4. Après une minute environ, le site est en ligne : `https://votre-compte.github.io/lagon-arena/`.
5. Pour tester :
   - ouvrez `…/prof.html`, puis **Créer une salle** ;
   - sur un téléphone, ouvrez `…/index.html` et rejoignez la salle avec le code ;
   - l'accueil doit afficher « 🟢 Connecté à la base de données de la classe ».

### Bon à savoir

- **Pause du projet gratuit** : un projet Supabase gratuit est mis en pause après environ une semaine sans activité. Avant le cours, ouvrez le tableau de bord Supabase et cliquez sur **Restore project** si besoin.
- **Ménage automatique** : les salles de plus de 7 jours sont supprimées automatiquement, avec leurs joueurs, leurs tortues et leurs scores.
- **Faible charge** : la base ne stocke que du texte (le code des tortues et les scores). La simulation est **déterministe** : chaque navigateur recalcule lui-même le match à partir des codes. 20 élèves interrogent la base toutes les 2 secondes, ce qui reste très loin des limites de l'offre gratuite.
- **Sécurité** :
  - le code des autres élèves est invisible pendant la phase de programmation, et devient lisible après le brawl ;
  - on ne peut écrire dans la base qu'avec le jeton secret de la salle (enseignant) ou de l'élève ;
  - un pseudo déjà pris est refusé.

### Mode démo (sans base de données)

Tant que `SUPABASE_URL` est vide, ou si l'on ajoute `?demo` à l'adresse, le site fonctionne en **mode démo** : tout reste dans le navigateur. C'est pratique pour découvrir le jeu seul :

- ouvrez `prof.html`, créez une salle ;
- cliquez sur **🤖 + 3 élèves fictifs**, ou sur **➕ Ouvrir un élève** pour jouer un élève dans un autre onglet ;
- lancez les manches.

Le bac à sable et le tutoriel fonctionnent sans aucune base de données.

---

## 5. Tester sur son ordinateur

Les modules JavaScript ne fonctionnent pas en ouvrant les fichiers directement (`file://`) : il faut un petit serveur.

```bash
cd lagon-arena
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

---

## 6. Personnaliser

- **Durées et nombre minimum de tortues** :
  - valeurs par défaut dans `js/config.js` ;
  - modifiables aussi pendant la séance dans **⚙️ Réglages** (`prof.html`).
- **Règles du jeu** : l'objet `P` en haut de `js/engine.js` (énergie, coût de la ponte, portée des requins…). Les nouveautés sont dans `TWISTS`, les tortues d'entraînement dans `BOTS`.
- **Après toute modification des règles**, lancez la vérification :

  ```bash
  node outils/verifier.mjs
  ```

  Elle contrôle trois choses :
  - chaque mission du tutoriel échoue avec son code et réussit une fois corrigée ;
  - les parties sont reproductibles ;
  - l'équilibrage (nids moyens de chaque tortue d'entraînement selon la nouveauté).

## 7. Organisation du code

```
index.html  tuto.html  eleve.html  prof.html
css/style.css
js/config.js     ← à remplir (URL + clé Supabase)
js/interp.js     ← mini-interpréteur Python (conditions uniquement), messages d'erreur en français
js/engine.js     ← règles, carte, simulation déterministe, rapport et conseils, missions du tutoriel
js/brawl.js      ← participants, scores, classement (partagé prof / élèves)
js/db.js         ← accès Supabase (API REST) ou mode démo (localStorage)
js/render.js     ← dessin du lagon (canvas) et lecteur de match
js/editor.js     ← éditeur de code coloré, autocomplétion, boîte à outils, vue « pensée de la tortue »
js/primitives.js ← les capteurs, actions et mots-clés avec leur rôle (en mots simples)
js/pouce.js      ← le « coup de pouce » gradué
js/tutokit.js    ← composants communs aux deux tutoriels (exemples, exercices, quiz, missions)
js/tuto-avance.js ← le tutoriel avancé (avec tuto-avance.html)
js/viewer.js     ← visionneuse réutilisable (lagon + frise + pensée)
js/tuto.js  js/eleve.js  js/prof.js
supabase.sql     ← tables, règles de sécurité et fonctions
outils/verifier.mjs
```

Le langage accepté par l'interpréteur :

- `def tour():` avec `if` / `elif` / `else` (imbriqués ou non) ;
- `and`, `or`, `not`, `True`, `False` ;
- les comparaisons `< <= > >= == !=`, et `+ - *` ;
- des variables locales, `pass` et `return`.

Les erreurs fréquentes sont expliquées en français : `:` oublié, `=` au lieu de `==`, parenthèses manquantes, faute de frappe (avec une suggestion), indentation, `true` au lieu de `True`, `&&`, etc.
