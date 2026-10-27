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
| `tuto.html` | élèves | **Tutoriel** en 12 étapes : les règles avec des exemples à manipuler, puis 4 tortues en panne à réparer |
| `eleve.html` | élèves | Programmer, tester, envoyer sa tortue ; résultats, rapport, « Et si… ? », classement, aide |
| `eleve.html?libre=1` | élèves | Bac à sable seul, sans salle (pour s'entraîner à la maison) |
| `prof.html` | enseignant | Créer la salle, lancer les manches, projeter les brawls, podium, export CSV |

### Le tutoriel (`tuto.html`)

1. **Ta mission** : pondre un maximum de nids, avec un match de démonstration animé.
2. **Le lagon** : la légende illustrée (algues, plage, requin, sac plastique, corail, nid, nuit).
3. **L'énergie** : une jauge à manipuler (`manger()` +3, `pondre()` −4, −1 tous les 6 tours, épuisement).
4. **Pondre** : un testeur avec des interrupteurs. `sur_plage() and est_la_nuit() and energie() >= 6` affiche True ou False pour chaque morceau.
5. **Les dangers et les refuges** : les requins, la plage et les algues (cachée sauf quand elle mange), le plastique. Une tortue gourmande se fait attraper sous les yeux de l'élève.
6. **Ton programme** : `tour()` est appelée à chaque tour, une seule action, « le premier vrai gagne ». On y trouve un explorateur de conditions et un mini-quiz « Devine l'action ».
7. **L'aide-mémoire** : tous les capteurs et toutes les actions.
8. **Les 4 missions de réparation**, une notion chacune, avec indice, rejeu tour par tour et « Ce que tu as appris » :

   | Mission | Notion | Ce qui ne va pas |
   |---|---|---|
   | 1 | `if` | La tortue va vers les algues mais ne mange jamais. |
   | 2 | ordre des `elif` | Elle mange alors qu'un requin arrive. |
   | 3 | `and` | Elle essaie de pondre en plein jour. |
   | 4 (bonus) | `not` | Elle avale un sac plastique. |

9. **Le brawl en classe** : le déroulé de la séance et le barème des points.

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
- **Les requins** voient à 4 cases et chassent la tortue la plus proche. Une tortue attrapée retourne au départ, bloquée 5 tours. Deux refuges :
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
| 🏆 Finale (manche 3) | 5 requins rapides et nuits courtes (21 h – 4 h) : il faut anticiper avec `heure()` |
| 🦈 Requins affamés, 🌙 Nuits courtes | Au choix de l'enseignant |
| ⛈️ Tempête | Tout à la fois (duel des champions) |

### Les points

- À chaque manche, les points dépendent du **rang parmi les élèves** : 25, 20, 16, 13, 11, 10, 9…, avec 1 point minimum.
- **+3 de bonus** si la tortue pond plus de nids qu'à la manche précédente. Un élève faible qui progresse marque donc aussi.
- Les tortues d'entraînement 🤖 complètent le lagon s'il y a moins de 8 élèves. Elles ne marquent pas de points.
- Le **duel des champions** (les 3 premiers et la Championne 🤖) est hors classement.

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
- Le bouton ✕ retire un élève (pseudo inapproprié, doublon). Faites-le de préférence avant le premier brawl.

---

## 4. Mise en ligne (≈ 15 minutes, gratuit)

### Étape A : la base de données Supabase

1. Créez un compte sur <https://supabase.com>, puis **New project**.
   - Choisissez une **région européenne** (par exemple *West EU (Paris)* ou *Central EU (Frankfurt)*), ce qui est préférable pour le RGPD.
   - Le mot de passe de la base ne servira pas ici.
2. Ouvrez **SQL Editor → New query**. Copiez-collez **tout** le fichier `supabase.sql`, puis cliquez sur **Run**. Le script peut être relancé sans risque, par exemple après une mise à jour.
3. Récupérez deux informations (bouton **Connect** en haut du tableau de bord, ou **Project Settings → API Keys / Data API**) :
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
js/editor.js     ← éditeur de code coloré, vue « pensée de la tortue »
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
