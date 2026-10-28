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

### Le tutoriel avancé (`tuto-avance.html`) : trois niveaux, pour les élèves à l'aise

Il ne remplace pas le premier tutoriel : il ajoute des primitives **cachées par défaut**, pour ne pas noyer les débutants. La page d'accueil du tutoriel avancé propose trois niveaux. On peut les faire dans l'ordre ou choisir directement ; chaque niveau a sa progression (⭐).

**🥈 Intermédiaire** (`tuto-avance.html?niveau=moyen`)

| Étape | Contenu |
|---|---|
| 1 | Le lagon bouge : un lagon différent à chaque partie, algues qui se vident et repoussent ailleurs, sacs qui dérivent, soleil sur la plage |
| 2 | Les distances : `distance_algue()`, `distance_plage()`, `distance_requin()`, avec des curseurs et un quiz « vrai ou faux » |
| 3 | `or` et `not` (et les parenthèses), puis un exercice |
| M1 | Mission « Le buffet est pris » : `aller_vers_algue_libre()` |
| 4 | Pousser : `pousser()` (−2 ⚡), `tortue_a_cote()`, `requin_derriere_tortue()`, puis un exercice |
| M2 | Mission « La pirate » : pousser une rivale sur un requin |
| 5 | Anticiper la nuit avec `heure()` et `distance_plage()` |
| 🏆 | Le défi : lire le code de la **Pirate** 🤖 et la battre (vérifier avec 📊 Estimer) |

**🥇 Expert** (`tuto-avance.html?niveau=expert`) : lire le lagon, choisir ses algues

| Étape | Contenu |
|---|---|
| 1 | Lire le lagon : les 6 capteurs « choisir ses algues », avec des curseurs |
| 2 | Comparer deux choix (quiz) : `distance_algue_sure() <= distance_algue() + 3`, zone à quitter… |
| 3 | La zone dangereuse : `requins_autour()`, `requins_pres_algue()` (exercice) |
| 4 | Le bon repas : `portions_algue()`, `algues_autour()` (exercice) |
| 5 | Dîner près de la plage : `algue_pres_plage()` et `heure()` (exercice) |
| 🏆 | Le défi : une stratégie d'expert (elle bat la Championne en moyenne) à améliorer avec 📊 Estimer |

**👥 Équipe** (`tuto-avance.html?niveau=equipe`)

| Étape | Contenu |
|---|---|
| 1 | Jouer en équipe : les règles, `donner()`, `aller_vers_equipiere()`, la protection à deux |
| 2 | S'entraider (exercice) : `equipiere_fatiguee()`, `requin_derriere_adversaire()` |
| M | Mission « La nourrice » : donner de l'énergie à une équipière épuisée pour que l'équipe ponde |
| 3 | Plusieurs équipes, l'équipe rivale : `rang_equipe()`, `equipe_en_tete()`, `rivale_a_cote()`… (exercice) |
| 🏆 | Une stratégie d'équipe, et des conseils pour se répartir les rôles |

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
  - il donne **l'idée suivante** d'après ce qui manque dans le code, en 5 paliers : pondre la nuit sur la plage, se méfier des requins, vérifier l'énergie, éviter le plastique, partir avant la nuit (pendant une manche en équipes, un palier « Aide ton équipe ! » s'ajoute après le premier) ;
  - chaque palier montre un programme complet, les lignes à ajouter en vert ;
  - l'élève les recopie lui-même.
- **Rappels** : sous l'éditeur, une règle importante change toutes les 15 secondes.
- **Panneau « Ta tortue » réductible** : le bouton **◀ Réduire** replie l'éditeur ; le lagon du bac à sable prend alors toute la largeur, et les boutons Tester / Envoyer restent visibles.
- **Bac à sable** :
  - chaque **▶ Tester** se joue dans un **nouveau lagon** ; « 🔁 Rejouer ce lagon » rejoue le même (pour vérifier une correction) ;
  - **📊 Estimer** : la tortue joue 10, 20 ou 50 parties **sans les afficher**. L'élève obtient son **nombre d'œufs moyen**, de la pire à la meilleure partie, la part des parties sans œuf, ses captures, et la moyenne de chaque tortue d'entraînement. Ce sont toujours les mêmes lagons : l'élève compare ses versions (« Estimation précédente : 1,2 → maintenant 2,8 »).
- **Rapport après chaque match**, avec des conseils qui donnent le code à écrire. Exemple : « Attrapée en train de manger ! Mets tout en haut : `if requin_proche():` puis `fuir()` ».

---

## 2. Les règles du jeu (résumé pour l'enseignant)

- Un match dure **180 tours**, soit 3 jours et 3 nuits (1 journée = 60 tours). Il commence à 8 h ; la nuit va de 19 h à 6 h.
- **Un lagon différent à chaque partie** : le corail, les algues et les départs des tortues et des requins sont tirés au hasard ; les plages ne bougent pas. Chaque carte est vérifiée avant de jouer, pour qu'il n'y ait **aucune situation de blocage** :
  - pas de zone fermée : une tortue peut aller partout (algues, plages), un requin peut patrouiller partout ;
  - pas de cul-de-sac ;
  - les tortues partent sur l'eau libre, ni trop près ni trop loin d'une plage ;
  - les requins partent **au large** (bords du lagon), loin des plages et des tortues ; après une capture, un requin repart au départ de requin le plus éloigné de la tortue attrapée.

  Le vérificateur (`node outils/verifier.mjs`) teste 3 000 cartes et 400 parties. Les tutoriels gardent la carte classique, et les manches jouées **avant** cette mise à jour se rejouent à l'identique, sur l'ancienne carte.
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
- **Les requins** voient à 4 cases et chassent la tortue la plus proche. Une tortue attrapée **perd 1 nid** (si elle en a), retourne au départ et reste bloquée 5 tours. Deux refuges (`fuir()` choisit la plage en premier) :
  - **la plage**, où les requins ne vont jamais ;
  - **les algues** : la tortue y est invisible… **sauf quand elle mange**.

| Capteurs | Actions |
|---|---|
| `requin_proche()` : un requin à 3 cases ou moins | `manger()` |
| `algue_ici()`, `plastique_ici()`, `sur_plage()` | `pondre()` |
| `est_la_nuit()` | `fuir()`, `se_cacher()` |
| `energie()` (0 à 10), `heure()` (0 à 23) | `aller_vers_algue()`, `aller_vers_plage()` |

### Les manches en équipes

L'enseignant peut lancer une manche **de 2 à 6 équipes** (panneau « Préparer la manche », voir plus bas). Chaque équipe reçoit **automatiquement** une couleur : 🔵 Bleue, 🔴 Rouge, 🟢 Verte, 🟡 Jaune, 🟣 Violette, 🟠 Orange.

- **Seul le rang de l'équipe compte** : on classe les équipes selon leur **moyenne de nids par élève**, donc les équipes peuvent avoir des **tailles différentes**. Les tortues d'entraînement 🤖 ne sont dans **aucune équipe** : ce sont des concurrentes neutres.
- Les élèves voient **avant la manche** leur équipe, leurs équipières et leurs adversaires (carte en haut de l'écran élève), pour se mettre d'accord sur une stratégie.
- Ce qui rend l'entraide utile :
  - 🎁 `donner()` passe 3 ⚡ à une équipière collée (une équipière épuisée sur la plage peut alors pondre) ;
  - 🛡️ deux équipières **collées** sont protégées des requins ;
  - on ne peut pas pousser une équipière.
- Pendant le brawl, les tortues ont un halo de la couleur de leur équipe, et le score de chaque équipe s'affiche en direct (👑 sur l'équipe en tête).

| Capteurs d'équipe | Actions d'équipe |
|---|---|
| `mon_equipe()` : numéro de l'équipe (1 Bleue, 2 Rouge, 3 Verte…) | `donner()` : +3 ⚡ à une équipière collée |
| `mes_nids()`, `nids_voisine()`, `nids_equipe()` | `aller_vers_equipiere()` : rejoindre l'équipière la plus proche |
| `rang_equipe()` : place de mon équipe en ce moment ; `equipe_en_tete()` | `pousser()` (avancé) : jamais une équipière, l'équipe rivale en premier |
| `equipe_rivale()` : la meilleure des **autres** équipes ; `nids_adversaires()` : ses nids ; `rivale_a_cote()` | |
| `equipiere_a_cote()`, `adversaire_a_cote()`, `equipiere_fatiguee()` (moins de 6 ⚡) | |
| `requin_derriere_adversaire()` : une adversaire collée peut être poussée sur un requin | |

Ces primitives apparaissent automatiquement dans l'autocomplétion et la boîte à outils des élèves dès qu'une manche en équipes est annoncée.

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
- **En équipes** : chaque élève marque les points du **rang de son équipe**, de 20 (1re) à 10 (dernière) :

  | Équipes | Points par rang |
  |---|---|
  | 2 | 20 / 10 |
  | 3 | 20 / 15 / 10 |
  | 4 | 20 / 17 / 13 / 10 |
  | 5 | 20 / 18 / 15 / 13 / 10 |
  | 6 | 20 / 18 / 16 / 14 / 12 / 10 |

  Des équipes à égalité se partagent les points de leurs places (2 équipes à égalité : 15 chacune).
- L'enseignant peut aussi rendre une manche **à points doubles** (×2) ou **hors classement** (entraînement).

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
| 40–52 min | **Finale** (manche 3), par exemple **en équipes** | Idem |
| 52–55 min | (Duel des champions) puis bilan | Podium final, meilleure progression, **export CSV** |

### Préparer la manche suivante (à la main)

Avant chaque manche (dans la salle d'attente, puis sous les résultats de la manche précédente), le panneau **⚙️ Préparer la manche** permet de tout régler :

- **Raccourcis** : 🔁 Rematch (manche suivante classique), 👥 En équipes, ⛈️ Duel des champions, 🏋️ Entraînement (hors classement), ♾️ Manche longue ;
- **titre** de la manche (affiché aux élèves et sur l'écran projeté) ;
- **nouveauté** (lagon calme, plastique, requins affamés, nuits courtes, finale, tempête) ;
- **durée de programmation**, ou **♾️ temps illimité** (voir « Manche longue » ci-dessous) ;
- **points** : normaux, doubles, ou hors classement ;
- **nombre de tortues minimum** (complété par des 🤖, 0 pour aucune) ;
- **qui joue** : toute la classe, ou seulement les élèves cochés ;
- **mode** : chacun pour soi, ou en équipes :
  - **nombre d'équipes** de 2 à 6, la couleur de chaque équipe est attribuée automatiquement ;
  - 🎲 **Au hasard** ou ⚖️ **Équilibrées** (d'après le classement de la séance, en « serpent » : les meilleurs sont répartis entre les équipes) ;
  - **à la main** : cliquer sur un nom puis sur l'équipe où le mettre, ou le faire glisser ; les équipes peuvent avoir des tailles différentes ;
  - un élève qui arrive en retard rejoint automatiquement l'équipe la plus petite.

Les réglages sont **publiés tout de suite** : les élèves voient la prochaine manche (et leur équipe) pendant qu'ils préparent leur tortue.

### Devoir à la maison (salle créée hors cours)

Sur l'accueil enseignant, **📚 Créer un devoir** crée une salle dont la **manche 1 démarre tout de suite, sans limite de temps**. Une fenêtre donne :

- le **lien d'accès** à donner aux élèves (`https://babash.github.io/lagon-arena/index.html?salle=ABCD`), avec son QR code ;
- un **message prêt à envoyer** (messagerie de l'établissement, cahier de textes…), modifiable, avec le lien et les consignes.

Un élève qui ouvre le lien arrive sur l'accueil avec la salle déjà remplie et un encadré « Tu es invité·e » : tutoriel d'abord s'il n'a jamais joué (il revient ensuite dans la salle), puis pseudo. À sa première visite, son **code de session** s'affiche tout de suite. Vous lancez le brawl quand vous voulez, en classe ou de chez vous (« 🏠 Autre ordinateur »). Le bouton **🔗 Lien d'accès élèves** de la salle redonne le lien et le message à tout moment (pour une séance en classe aussi). L'adresse du site utilisée dans les liens est réglée dans `js/config.js` (`URL_SITE`).

### Manche longue : continuer à la maison

- Cochez **♾️ temps illimité** (ou le raccourci ♾️ Manche longue) : la manche reste ouverte, sans chrono, **jusqu'à ce que vous lanciez le brawl**, par exemple au cours suivant. Les élèves programment, testent et renvoient leur tortue quand ils veulent, y compris depuis chez eux. Au moment voulu, « ⏱️ Chrono de 5 min » remet un compte à rebours, ou lancez directement le brawl.
- **Code de session** : chaque élève a un code de 8 caractères (ex. `R8GS-Z4AN`), visible avec le bouton **🏠 Mon code de session** de sa page. Sur un autre ordinateur, il tape la salle, son pseudo, puis ce code dans « 🏠 Tu reviens depuis un autre ordinateur ? ». Il retrouve sa dernière tortue envoyée et ses points. Le bouton **🔑 Codes de session** de la salle vous donne la liste (imprimable), si un élève a oublié le sien.
- **Vous aussi, depuis un autre ordinateur** : le bouton **🏠 Autre ordinateur** de la salle donne un **lien enseignant** à ouvrir chez vous (ne le donnez pas aux élèves).
- Une salle est gardée **60 jours** après sa dernière utilisation.

Conseils :

- À 0 au chrono, les tortues modifiées mais non envoyées partent automatiquement (si le code est correct).
- Un élève qui n'envoie rien joue avec sa dernière tortue envoyée, ou avec la tortue de départ.
- « Terminer le chrono » laisse 5 secondes aux élèves. « +1 min » rallonge le temps.
- Le bouton **◧ Panneau** masque la colonne de gauche. Elle est masquée automatiquement pendant le brawl. **⛶ Plein écran** sert pour le vidéoprojecteur.
- La salle est pilotée **depuis le navigateur qui l'a créée** : le jeton enseignant y est enregistré. On peut la reprendre plus tard depuis « Mes salles ».
- **Arriver en cours de partie** : un élève peut rejoindre la salle à tout moment avec le code. L'écran projeté l'annonce (« 🆕 … rejoint la partie »), et sa tortue joue au brawl suivant.
- **Changer d'ordinateur** : l'élève se reconnecte avec son **code de session** (voir ci-dessus). S'il l'a perdu, cliquez sur 🔓 à côté de son nom : il pourra reprendre son pseudo sans code, avec ses tortues et ses points.
- Le bouton ✕ retire un élève et ses tortues (pseudo inapproprié, doublon). Faites-le de préférence avant le premier brawl.

---

## 4. Mise en ligne (≈ 15 minutes, gratuit)

### Étape A : la base de données Supabase

1. Créez un compte sur <https://supabase.com>, puis **New project**.
   - Choisissez une **région européenne** (par exemple *West EU (Paris)* ou *Central EU (Frankfurt)*), ce qui est préférable pour le RGPD.
   - Le mot de passe de la base ne servira pas ici.
2. Ouvrez **SQL Editor → New query**. Copiez-collez **tout** le fichier `supabase.sql`, puis cliquez sur **Run**. Le script peut être relancé sans risque. **Relancez-le après chaque mise à jour du site** (la version « équipes » ajoute par exemple la colonne `config` des salles ; la version « manches longues » ajoute les codes de session et garde les salles 60 jours). Les salles et les scores existants sont conservés.
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
- **Ménage automatique** : les salles inutilisées depuis 60 jours sont supprimées automatiquement, avec leurs joueurs, leurs tortues et leurs scores.
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
index.html  tuto.html  tuto-avance.html  eleve.html  prof.html
css/style.css
js/config.js       ← URL + clé Supabase, adresse publique du site (URL_SITE), durées
js/engine.js       ← point d'entrée du MOTEUR (aucun accès à la page) ; le code est dans js/moteur/ :
  moteur/hasard.js       hasard reproductible (graines)
  moteur/regles.js       réglages, nouveautés de manche, heures, points
  moteur/carte.js        grille, distances, carte classique, cartes aléatoires sans blocage
  moteur/equipes.js      équipes (couleurs) et résultat des équipes
  moteur/tortues.js      tortue de départ, tortues d'entraînement 🤖
  moteur/monde.js        l'état d'une partie et les questions qu'on se pose dessus
  moteur/capteurs.js     les capteurs (questions du programme de l'élève)
  moteur/actions.js      les actions (une par tour)
  moteur/requins.js      chasse, patrouille et captures
  moteur/simulation.js   la boucle des tours : simulate()
  moteur/rapport.js      le rapport de match et les conseils
  moteur/missions.js     les missions des tutoriels
js/interp.js       ← mini-interpréteur Python (conditions uniquement), messages d'erreur en français
js/brawl.js        ← participants, équipes, scores, classement (partagé prof / élèves)
js/db.js           ← accès Supabase (API REST) ou mode démo (localStorage)
js/render.js       ← dessin du lagon (canvas) et lecteur de match
js/viewer.js       ← visionneuse réutilisable (lagon + frise + pensée)
js/editor.js       ← éditeur coloré, autocomplétion, boîte à outils, « pensée de la tortue »
js/primitives.js   ← capteurs, actions et mots-clés avec leur rôle (en mots simples)
js/common.js       ← petits outils de page, liens à donner, code de session, aide-mémoire
js/pouce.js        ← le « coup de pouce » gradué
js/tutokit.js      ← composants des tutoriels (exemples, exercices, quiz, missions, navigation)
js/tuto.js         ← le tutoriel débutant
js/tuto-avance/    ← le tutoriel avancé : main.js (choix du niveau), commun.js, moyen.js, expert.js, equipe.js
js/eleve/          ← l'écran élève : main.js (démarrage), etat.js, ui.js, editeur.js, bac.js (bac à sable,
                     estimation), envoi.js, session.js (code de session), manche.js (suivre la salle), resultats.js
js/prof/           ← l'écran enseignant : main.js (démarrage), etat.js (état, pilotage), accueil.js, salle.js,
                     scenes.js (ce qui est projeté), preparer.js (préparer la manche), liens.js, demo.js
supabase.sql       ← tables, règles de sécurité et fonctions
outils/verifier.mjs ← vérification du moteur (missions, déterminisme, cartes sans blocage, capteurs, équilibrage)
```

Le langage accepté par l'interpréteur :

- `def tour():` avec `if` / `elif` / `else` (imbriqués ou non) ;
- `and`, `or`, `not`, `True`, `False` ;
- les comparaisons `< <= > >= == !=`, et `+ - *` ;
- des variables locales, `pass` et `return`.

Les erreurs fréquentes sont expliquées en français : `:` oublié, `=` au lieu de `==`, parenthèses manquantes, faute de frappe (avec une suggestion), indentation, `true` au lieu de `True`, `&&`, etc.
