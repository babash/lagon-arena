# 📜 Les règles du jeu

[← Retour au README](../README.md) · [Guide de l'enseignant](GUIDE-ENSEIGNANT.md) · [Pédagogie](PEDAGOGIE.md)

Ce document décrit les règles **exactes** du moteur (`js/moteur/`). Les valeurs viennent de l'objet `P` de `js/moteur/regles.js` : si vous les changez, ce document doit suivre.

---

## 1. Le principe

- Chaque élève écrit une fonction `tour()`. **À chaque tour, le jeu l'appelle** pour chaque tortue.
- La tortue fait **une seule action par tour** : la première rencontrée en lisant le code de haut en bas. Si aucune action n'est atteinte, elle ne fait rien.
- **Pour marquer 1 point (1 nid)**, il faut appeler `pondre()` **sur une plage**, **la nuit**, avec **au moins 6 ⚡**. Pondre coûte 4 ⚡.
- Le gagnant est la tortue qui a le plus de nids à la fin du match.

```python
def tour():
    if requin_proche() and not sur_plage():
        fuir()
    elif sur_plage() and est_la_nuit() and energie() >= 6:
        pondre()
    elif est_la_nuit() and energie() >= 6:
        aller_vers_plage()
    elif algue_ici() and not plastique_ici():
        manger()
    else:
        aller_vers_algue()
```

> **La tortue de départ** sait manger mais **ne pond jamais** : sans rien changer, l'élève marque 0 nid. C'est voulu : il faut lire le code et l'améliorer.

## 2. Le temps

| | |
|---|---|
| Durée d'un match | **180 tours** = 3 jours et 3 nuits (1 journée = 60 tours) |
| Début | 8 h du matin |
| Nuit | de 19 h à 6 h (de 20 h à 5 h avec les nouveautés « Nuits courtes », « Finale » et « Tempête ») ; `debut_nuit()` et `fin_nuit()` donnent les heures de la manche en cours |

## 3. L'énergie ⚡

| Événement | Effet |
|---|---|
| Départ | 8 ⚡ (maximum 10) |
| Faim | −1 ⚡ tous les 6 tours |
| `manger()` sur des algues | +3 ⚡ (une portion de la touffe) |
| `manger()` sur un sac plastique | −3 ⚡ |
| `pondre()` réussi | −4 ⚡ |
| Soleil : rester sur la plage **le jour** | −1 ⚡ de plus tous les 3 tours |
| `pousser()` | −2 ⚡ |
| `donner()` (en équipes) | −3 ⚡ pour la donneuse, +3 ⚡ pour l'équipière |
| **0 ⚡ : épuisée** | retour au point de départ, bloquée 5 tours |

## 4. Le lagon

### Un lagon différent à chaque partie

Le corail, les touffes d'algues, les départs des tortues et des requins sont **tirés au hasard** à chaque partie ; les **plages ne bougent pas**. Chaque carte est **vérifiée** avant de jouer (`carteSansBlocage` dans `js/moteur/carte.js`) :

- **pas de zone fermée** : une tortue peut atteindre toutes les algues et toutes les plages, un requin peut patrouiller partout ;
- **pas de cul-de-sac** : chaque case d'eau a au moins deux voisines praticables ;
- les tortues partent sur l'eau libre, **ni trop près ni trop loin** d'une plage (4 à 13 cases) ;
- les requins partent **au large** (bords du lagon), à 4 cases au moins des plages et loin des tortues.

Si 80 tirages échouent (cas très rare, avec beaucoup de tortues), la partie se joue sur la carte classique. Le vérificateur (`node outils/verifier.mjs`) teste 3 000 cartes et 400 parties.

Les **tutoriels** gardent la carte classique (les missions doivent être reproductibles), et les manches jouées **avant** l'arrivée des cartes aléatoires se rejouent à l'identique sur l'ancienne carte (voir [ARCHITECTURE.md](ARCHITECTURE.md#5-compatibilité-des-anciennes-séances)).

### Les algues 🌿

- Une touffe a **5 portions**. Mangée jusqu'au bout, elle disparaît, et une nouvelle touffe pousse **ailleurs** 6 tours plus tard, à 2 cases ou plus des plages.
- Rester collée à la plage n'est donc pas une stratégie gagnante à coup sûr : les algues proches s'épuisent.

### Les sacs plastique 🛍️

- Ils **dérivent**, coulent au bout de 30 à 60 tours, puis réapparaissent ailleurs.
- Avec « Invasion de plastique » et « Tempête », ils apparaissent **surtout sur les algues** : il faut `not plastique_ici()`.

### Les refuges

- **La plage** : les requins n'y vont jamais.
- **Les algues** : une tortue y est **invisible**… **sauf quand elle mange**.

## 5. Les requins 🦈

- Ils voient à **4 cases** (5 pour les requins affamés ; `vision_requin()` donne la valeur de la manche en cours) et chassent la tortue visible la plus proche ; sinon, ils patrouillent.
- Ils bougent **2 tours sur 3** (à chaque tour s'ils sont « rapides »).
- Une tortue attrapée **perd 1 nid** (si elle en a), retourne à son point de départ et reste **bloquée 5 tours**. Le requin repart vers le départ de requin **le plus éloigné** de la tortue attrapée (il ne campe pas sur sa route).
- `requin_proche()` répond `True` quand un requin est à **3 cases ou moins**.
- `fuir()` éloigne la tortue du requin le plus proche, **en préférant la plage**.
- En équipes, **deux équipières collées sont protégées** des requins.

## 6. Pousser 💥 (primitive avancée)

`pousser()` coûte 2 ⚡ et pousse d'une case une tortue **collée** à la sienne. Si un requin attend derrière elle, elle est attrapée.

En équipes : on ne pousse **jamais une équipière**, et `pousser()` vise **d'abord l'équipe rivale** (la meilleure des autres équipes).

## 7. Les nouveautés de manche

| Nouveauté | Requins | Plastique | Nuit | Usage conseillé |
|---|---|---|---|---|
| 🌊 Lagon calme | 3, vision 4 | 4 sacs | 19 h – 6 h | manche 1 |
| 🛍️ Invasion de plastique | 3, vision 4 | **22 sacs, surtout sur les algues** | 19 h – 6 h | manche 2 (rematch) : il faut `not plastique_ici()` |
| 🦈 Requins affamés | **5 rapides, vision 5** | 4 sacs | 19 h – 6 h | au choix |
| 🌙 Nuits courtes | 3, vision 4 | 4 sacs | **20 h – 5 h** | au choix : il faut anticiper avec `heure()` |
| 🏆 Finale | **5 rapides, vision 5** | 6 sacs | **20 h – 5 h** | manche 3 |
| ⛈️ Tempête | **5 rapides, vision 5** | **22 sacs, sur les algues** | **20 h – 5 h** | duel des champions |

### Un lagon personnalisé

Par-dessus la nouveauté, l'enseignant peut régler le lagon d'une manche (panneau « Préparer la manche ») :

| Réglage | Valeurs |
|---|---|
| 🦈 Requins | 0 à 6 |
| 💨 Requins rapides | oui / non |
| 👁️ Vue des requins | 2 à 7 cases |
| 🛍️ Sacs plastique | 0 à 40 |
| 🌿 Plastique surtout sur les algues | oui / non |
| 🌙 Début de la nuit | 17 h à 23 h |
| 🌅 Fin de la nuit | 3 h à 8 h |
| 🪸 Massifs de corail | 0 à 14 (5 à 8 d'habitude) |
| 🌿 Touffes d'algues | 8 à 35 (19 à 23 d'habitude) |

Un réglage laissé vide garde la valeur de la nouveauté. La carte est toujours vérifiée sans blocage (le vérificateur teste les valeurs extrêmes). Le lagon personnalisé est enregistré avec les scores : la manche se rejoue à l'identique.

## 8. Les tortues d'entraînement 🤖

Elles complètent le lagon s'il y a moins de tortues que le minimum réglé (8 par défaut). Elles **ne marquent jamais de points** et ne sont dans **aucune équipe**.

| Tortue | Ce qu'elle fait | Nids moyens (lagon calme) |
|---|---|---|
| Bulle | mange, mais **ne pond jamais** (comme la tortue de départ) | 0 |
| Gourmande | mange **avant** de regarder les requins ; pond la nuit sans vérifier son énergie | 1,9 |
| Prudente | fuit d'abord ; pond la nuit sans vérifier son énergie ; ne regarde pas le plastique | 2,2 |
| Maline | se cache dans les algues quand un requin approche ; vérifie son énergie ; évite le plastique | 4,1 |
| Championne | comme la Maline, mais ne quitte pas la plage pour fuir, part vers la plage dès 16 h si elle est bien nourrie et ne mange pas pour rien | 4,2 |
| Pirate | (mode avancé) pousse les autres tortues sur les requins, cherche des algues libres | — |

Moyennes mesurées par `node outils/verifier.mjs` (30 parties de 20 tortues, cartes aléatoires). Avec 5 requins rapides (« Requins affamés », « Finale », « Tempête »), la Championne tombe à environ 2,5 nids et finit **sans aucun nid dans environ 1 partie sur 5** : un seul match est donc une loterie partielle, d'où l'intérêt du bouton 📊 Estimer.

Le code des tortues d'entraînement est dans `js/moteur/tortues.js`. La Pirate est le défi final du tutoriel avancé (niveau intermédiaire).

## 9. Les points

### Chacun pour soi

- Points selon le **rang parmi les élèves** : 25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1 (1 point minimum). Les ex æquo ont le même rang.
- **+3 de bonus de progression** si la tortue pond plus de nids qu'à la manche précédente : un élève qui progresse marque aussi.
- Une manche peut être **à points doubles** (×2) ou **hors classement** (entraînement).
- Le **duel des champions** (les 3 premiers, complétés par des 🤖) est hors classement.

### En équipes

On classe les équipes selon la **moyenne de nids par élève** (les équipes peuvent donc avoir des tailles différentes). Chaque élève marque les points du **rang de son équipe**, de 20 (1re) à 10 (dernière) :

| Équipes | Points par rang |
|---|---|
| 2 | 20 / 10 |
| 3 | 20 / 15 / 10 |
| 4 | 20 / 17 / 13 / 10 |
| 5 | 20 / 18 / 15 / 13 / 10 |
| 6 | 20 / 18 / 16 / 14 / 12 / 10 |

Des équipes à égalité se partagent les points de leurs places (2 équipes à égalité en tête de 2 : 15 chacune).

Ce qui rend l'entraide utile :

- 🎁 `donner()` passe 3 ⚡ à une équipière collée (une équipière épuisée sur la plage peut alors pondre) ;
- 🛡️ deux équipières **collées** sont protégées des requins ;
- on ne peut pas pousser une équipière.

Les couleurs sont attribuées automatiquement : 🔵 Bleue, 🔴 Rouge, 🟢 Verte, 🟡 Jaune, 🟣 Violette, 🟠 Orange.

### Le Panthéon

Le Panthéon classe les tortues de tous les temps sur un **banc d'essai** identique pour toutes (`js/pantheon.js`) :

- **20 parties** « chacun pour soi », lagon calme, contre les 5 tortues d'entraînement ;
- toujours **les mêmes 20 lagons** (graines fixes) : le calcul est reproductible, l'administrateur peut le refaire pour vérifier un score ;
- le score est la **moyenne de nids**, arrondie au centième ; à égalité, la première arrivée passe devant.

Sur ce banc, les tortues d'entraînement font : Championne 5,50 · Maline 4,25 · Prudente 2,05 · Gourmande 1,35 · Bulle 0.

---

## 10. Toutes les primitives

Les primitives sont rangées par niveau. Le jeu les accepte **toutes**, toujours ; le niveau ne change que ce qui est **proposé** à l'élève (autocomplétion, boîte à outils, aide) :

- **débutant** : toujours proposées ;
- **intermédiaire** et **expert** : proposées quand l'élève active « 🚀 Primitives avancées » (sous l'éditeur) ;
- **équipe** : proposées automatiquement dès qu'une manche en équipes est annoncée.

Une **question** (capteur) répond `True`/`False` ou un nombre ; un **ordre** (action) fait agir la tortue (un seul par tour).

Dans la boîte à outils et dans l'aide, les primitives sont aussi rangées par **thème** : questions 🦈 les requins, 🌿 les algues, 🏖️ la plage et l'heure, ⚡ moi, 🐢 les tortues autour, 👥 mon équipe ; ordres 🥚 manger et pondre, 🧭 se déplacer, 🛡️ se protéger, 🤝 agir sur les autres (`CATEGORIES` dans `js/primitives.js`).

#### Débutant

| | Primitive | Rôle | Réponse |
|---|---|---|---|
| 🦈 | `requin_proche()` | Un requin est-il près de moi (3 cases ou moins) ? | True / False |
| 🌿 | `algue_ici()` | Y a-t-il des algues sur ma case ? | True / False |
| 🛍️ | `plastique_ici()` | Y a-t-il un sac plastique sur ma case ? | True / False |
| 🏖️ | `sur_plage()` | Suis-je sur la plage ? | True / False |
| 🌙 | `est_la_nuit()` | Fait-il nuit ? | True / False |
| ⚡ | `energie()` | Combien ai-je d'énergie ? (0 à 10) | un nombre |
| 🕐 | `heure()` | Quelle heure est-il ? (0 à 23) | un nombre |
| 😋 | `manger()` | Manger l'algue de ma case (+3 ⚡). Sur un sac plastique : −3 ⚡ ! | ordre |
| 🥚 | `pondre()` | Pondre un nid = 1 point. Seulement sur la plage, la nuit, avec 6 ⚡ ou plus. | ordre |
| 💨 | `fuir()` | Nager loin du requin le plus proche. | ordre |
| 🙈 | `se_cacher()` | Ne pas bouger. Dans les algues, le requin ne me voit pas. | ordre |
| ➡️🌿 | `aller_vers_algue()` | Nager d'une case vers les algues propres. | ordre |
| ➡️🏖️ | `aller_vers_plage()` | Nager d'une case vers la plage. | ordre |

#### Intermédiaire

| | Primitive | Rôle | Réponse |
|---|---|---|---|
| 📏🌿 | `distance_algue()` | À combien de cases sont les algues propres les plus proches ? (0 = ici) | un nombre |
| 📏🏖️ | `distance_plage()` | À combien de cases est la plage ? (0 = j'y suis) | un nombre |
| 📏🦈 | `distance_requin()` | À combien de cases est le requin le plus proche ? | un nombre |
| 👁️🦈 | `vision_requin()` | À combien de cases les requins voient-ils dans cette manche ? (4 d'habitude, 5 quand ils sont affamés). Plus loin, ou cachée dans les algues, ils ne te voient pas. | un nombre |
| 🌆 | `debut_nuit()` | À quelle heure commence la nuit dans cette manche ? (19 d'habitude, 20 quand les nuits sont courtes) | un nombre |
| 🌅 | `fin_nuit()` | À quelle heure finit la nuit dans cette manche ? (6 d'habitude, 5 quand les nuits sont courtes) | un nombre |
| 🐢🐢 | `tortue_a_cote()` | Une autre tortue est-elle collée à moi ? | True / False |
| 🐢🦈 | `requin_derriere_tortue()` | Si je pousse la tortue voisine, tombe-t-elle sur un requin ? | True / False |
| ➡️🌿✨ | `aller_vers_algue_libre()` | Nager vers les algues propres où il n'y a PAS d'autre tortue. | ordre |
| 💥 | `pousser()` | Pousser une tortue collée à moi d'une case (−2 ⚡). S'il y a un requin derrière elle… (en équipes : jamais une équipière, l'équipe rivale d'abord) | ordre |

#### Expert : choisir ses algues

Certains coins du lagon sont truffés de requins, loin des plages ou presque vides. Ces questions servent à **lire le lagon** autour de soi :

| | Primitive | Rôle | Réponse |
|---|---|---|---|
| 🦈🔢 | `requins_autour()` | Combien de requins à 5 cases ou moins de moi ? (zone dangereuse ?) | un nombre |
| 🌿🔢 | `algues_autour()` | Combien de touffes d'algues propres à 5 cases ou moins de moi ? (zone riche ?) | un nombre |
| 🌿🦈 | `requins_pres_algue()` | Combien de requins à 4 cases ou moins des algues les plus proches ? | un nombre |
| 📏🌿🛡️ | `distance_algue_sure()` | À combien de cases sont les algues SANS requin autour (à 4 cases) ? (99 = aucune) | un nombre |
| 🌿🏖️ | `algue_pres_plage()` | Les algues les plus proches sont-elles à 3 cases ou moins d'une plage ? | True / False |
| 🌿🍽️ | `portions_algue()` | Combien de repas reste-t-il dans les algues les plus proches ? (5 au départ, 0 = aucune) | un nombre |

#### Équipe

| | Primitive | Rôle | Réponse |
|---|---|---|---|
| 🏳️ | `mon_equipe()` | Le numéro de mon équipe : 1 = 🔵 Bleue, 2 = 🔴 Rouge, 3 = 🟢 Verte, 4 = 🟡 Jaune… (0 = chacun pour soi) | un nombre |
| 🥚 | `mes_nids()` | Combien de nids me reste-t-il ? | un nombre |
| 🐢🥚 | `nids_voisine()` | Combien de nids a la tortue collée à moi ? (0 s'il n'y en a pas) | un nombre |
| 🥚🥚 | `nids_equipe()` | Combien de nids a mon équipe en tout ? | un nombre |
| 🏅 | `rang_equipe()` | À quelle place est mon équipe en ce moment ? (1 = en tête ; on compare la moyenne de nids) | un nombre |
| 👑 | `equipe_en_tete()` | Mon équipe est-elle en tête en ce moment (seule ou à égalité) ? | True / False |
| 🎯 | `equipe_rivale()` | Le numéro de l'équipe RIVALE : la meilleure des autres équipes en ce moment | un nombre |
| 🥚🎯 | `nids_adversaires()` | Combien de nids a l'équipe rivale en tout ? | un nombre |
| 🤝 | `equipiere_a_cote()` | Une tortue de MON équipe est-elle collée à moi ? | True / False |
| ⚔️ | `adversaire_a_cote()` | Une tortue ADVERSE (d'une autre équipe, ou 🤖) est-elle collée à moi ? | True / False |
| 🤝😓 | `equipiere_fatiguee()` | Une équipière collée à moi a-t-elle moins de 6 ⚡ (pas assez pour pondre) ? | True / False |
| ⚔️🦈 | `requin_derriere_adversaire()` | Si je pousse l'adversaire collée à moi, tombe-t-elle sur un requin ? | True / False |
| 🎯🐢 | `rivale_a_cote()` | Une tortue de l'équipe RIVALE est-elle collée à moi ? (`pousser()` la vise en premier) | True / False |
| 🎁 | `donner()` | Donner 3 ⚡ à une équipière collée à moi. | ordre |
| ➡️🤝 | `aller_vers_equipiere()` | Nager vers l'équipière la plus proche (deux équipières collées sont protégées des requins). | ordre |

---

## 11. Le langage accepté

Un sous-ensemble de Python, centré sur les conditions :

- `def tour():` avec `if` / `elif` / `else`, imbriqués ou non ;
- `and`, `or`, `not`, `True`, `False`, les parenthèses ;
- les comparaisons `<`, `<=`, `>`, `>=`, `==`, `!=` et les opérations `+`, `-`, `*` ;
- des variables locales (`d = distance_plage()`), `pass` et `return`.

Pas de boucle, de liste ni de variable qui survit d'un tour à l'autre : **chaque tour repart de zéro**.

Les erreurs fréquentes sont expliquées en français, avec la ligne et une suggestion : `:` oublié, `=` au lieu de `==`, parenthèses manquantes, faute de frappe dans un nom (« Tu voulais dire `requin_proche` ? »), indentation incohérente, `true` au lieu de `True`, `&&` au lieu de `and`, etc.

Dans l'éditeur, on peut taper les mots-clés **en français** pour les retrouver : *si* → `if`, *sinon si* → `elif`, *sinon* → `else`, *et* → `and`, *ou* → `or`, *pas* → `not`, *vrai* → `True`, *faux* → `False`.
