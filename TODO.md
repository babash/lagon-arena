# 🛠️ TODO : prochains chantiers (branche `dev`)

*Mis à jour le 29 octobre 2026, après les séances en classe. Ce TODO remplace le précédent : il repart du constat de la classe et reprend, par ordre de priorité, l'audit (design, fluidité, pédagogie) et la réflexion sur les interfaces ([docs/INTERFACES.md](docs/INTERFACES.md)).*

Les chantiers se développent sur la branche `dev`, puis sont fusionnés dans `main`.

---

## Le constat

### Ce qu'on voit en classe

> **La majorité des élèves n'arrive pas à faire une tortue qui pond, même après le tutoriel.**

Les causes observées :

- des structures de code incompréhensibles, en particulier **plusieurs `if` / `else` à la suite** ;
- un **mauvais ordre des règles**, par exemple manger en premier.

### Ce que montre l'expérience

Six tortues « types » d'élèves, 20 parties chacune, lagon calme :

| Tortue type | Nids en moyenne | Parties à 0 | L'éditeur dit | Le rapport après le match dit |
|---|---|---|---|---|
| A. Deux `if` / `else` à la suite (manger, puis pondre) | **0** | **100 %** | « ✅ Code valide » | « Ajoute `pondre()` »… **déjà écrit** |
| B. Une seule chaîne, mais `manger()` en premier | 1,5 | 25 % | « ✅ Code valide » | parle des requins et de l'énergie, **pas de l'ordre** |
| C. `aller_vers_plage()` avant `pondre()` | **0** | **100 %** | « ✅ Code valide » | « Ajoute `pondre()` »… **déjà écrit** |
| D. `pondre()` sans `est_la_nuit()` | 0,6 | 60 % | « ✅ Code valide » | parle des requins et de l'énergie |
| E. Des `if` séparés, sans `elif` | **0** | **100 %** | « ✅ Code valide » | « Ajoute `est_la_nuit()` » (ne suffit pas) |
| F. Référence (coup de pouce n° 1) | 2,1 | 0 % | « ✅ Code valide » | |

**Quatre conclusions** :

1. **La structure piège les élèves.** La tortue de départ est un `if` / `else`. L'élève ajoute naturellement son idée **en dessous**, avec un second `if` / `else`. Or le premier bloc fait toujours une action, donc le second n'est **jamais atteint** : la règle « une seule action par tour, la première rencontrée » n'est pas comprise.
2. **L'ordre des règles n'est pas compris** (manger avant pondre, aller vers la plage avant pondre).
3. **Nos retours les induisent en erreur.**
   - L'éditeur dit « ✅ Code valide » pour une tortue qui ne pondra jamais.
   - Le rapport conseille d'ajouter `pondre()` alors qu'il est déjà écrit.
   - Le coup de pouce ne vérifie que la *présence* des mots `pondre` et `aller_vers_plage`. Il passe donc à « Attention aux requins ».
4. **L'enseignant est aveugle.** Il ne voit ni qui ne pond pas, ni pourquoi, ni le code des élèves, même après le brawl.

### Les autres difficultés relevées

| Difficulté | Chantier |
|---|---|
| « Dans la tête de ta tortue » est petit et loin, alors que c'est l'outil qui fait comprendre | 2 |
| Au vidéoprojecteur (1024×768) : le code géant et le classement du brawl sortent de l'écran ; le panneau de réglages est projeté | 6 |
| Sur téléphone (devoir) : éditeur étroit, page de 3 200 px de haut | 7 |
| Les pages se figent 2 s au calcul du brawl, se chargent en 3,3 s en connexion lente | 9 |
| Les données d'un jour (élève) et l'effacement à 7 jours (enseignant) ne sont annoncés nulle part | 10 |

---

## Règles communes à tous les chantiers

- **Aucune fonctionnalité perdue**, sur ordinateur comme sur téléphone.
- **Les séances en cours continuent.** Les anciennes manches se rejouent à l'identique, et la base reste compatible avec les pages déjà ouvertes.
- **Toute modification de `supabase.sql`** est relançable sans risque et compatible avec `main`. Elle est notée dans l'annexe B, pour ne pas oublier de relancer le script dans Supabase après la fusion.
- **Vérifié avant fusion** : `node outils/verifier.mjs`, les parcours du chantier 0, et des captures aux tailles 360, 390, 768, 1024×768 (vidéoprojecteur) et 1366×768.

## Priorités et ordre

| Priorité | Chantier | Pourquoi maintenant |
|---|---|---|
| **P1** | **0.** Le filet de tests | Avant de toucher aux écrans, pour ne rien casser |
| **P1** | **1.** Faire pondre toutes les tortues | Le problème n° 1 en classe |
| **P1** | **2.** Séparer Programmer, Tester, Aide et Conseils | Indispensable pour comprendre sa tortue ; c'est là que s'affichent les diagnostics du chantier 1 |
| **P1** | **3.** L'enseignant voit les codes et les difficultés | Pour aider les élèves au bon moment |
| P2 | **4.** Le Panthéon automatique | Les meilleures tortues de chaque manche y entrent seules |
| P2 | **5.** La galerie des gagnantes | Apprendre des tortues qui marchent |
| P2 | **6.** Vidéoprojecteur : écran projeté et pupitre | Ne plus projeter les réglages ni les codes |
| P2 | **7.** Le site sur téléphone | Le devoir à la maison |
| P3 | **8.** Le rendu graphique, surtout l'accueil | |
| P3 | **9.** La fluidité, sans perte de fonctionnalité | |
| P3 | **10.** Les parcours (fiche du lagon, progression, messages…) | |

Les chantiers 1, 2 et 3 se répondent : le diagnostic (1) s'affiche dans « Programmer » et « Tester » (2) et chez l'enseignant (3). Le plus simple est de construire d'abord le **diagnostic** (1.1), puis les écrans.

---

## 0. Le filet de sécurité : les tests dans le dépôt

*Pour garantir « aucune fonctionnalité perdue » pendant tous les chantiers suivants.*

- [ ] Ranger dans `outils/tests/` les parcours Playwright utilisés jusqu'ici (hors dépôt) :
  - [ ] séance en démo ;
  - [ ] équipes ;
  - [ ] manche longue et code de session ;
  - [ ] devoir ;
  - [ ] bac à sable et estimation ;
  - [ ] tutoriels (3 niveaux) ;
  - [ ] Panthéon et son administration ;
  - [ ] lagon personnalisé ;
  - [ ] accueil et compteurs ;
  - [ ] aide ;
  - [ ] stockage d'un jour.
- [ ] Un script unique `node outils/tests/tout.mjs` : il démarre un petit serveur, lance les parcours en mode démo et, si une base locale est disponible, ceux qui ont besoin de la base.
- [ ] Les captures de référence aux 5 tailles d'écran, pour comparer avant et après.
- [ ] Les **6 tortues types** du constat dans `outils/verifier.mjs` : ce sont les tests du chantier 1.
- [ ] (Plus tard) Lancement automatique sur GitHub à chaque envoi.

**C'est fini quand** une seule commande vérifie tout, et qu'elle passe sur `main`.

---

## 1. Faire pondre toutes les tortues

*Objectif : qu'un élève qui a fait le tutoriel ait une tortue qui pond, et que, quand elle ne pond pas, il sache **pourquoi** et **quelle ligne changer**.*

### 1.1. Un diagnostic juste : comprendre ce que fait vraiment la tortue

C'est la brique commune : elle sert à l'éditeur, au rapport, au coup de pouce et à l'enseignant.

- [ ] **Le bilan de santé de la tortue** : on fait jouer **un tour** du programme dans quelques situations clés, et on compare ce qu'elle fait à ce qu'on attend. Il s'appuie sur ce qui sert déjà aux exercices des tutoriels.

  | Situation | On attend | Ta tortue fait |
  |---|---|---|
  | 🌙 Nuit, sur la plage, 8 ⚡ | `pondre()` | `manger()` ❌ (ligne 3) |
  | 🌙 Nuit, loin de la plage, 8 ⚡ | `aller_vers_plage()` | |
  | 🌙 Nuit, sur des algues, 8 ⚡ | `aller_vers_plage()` (ou `manger()` si l'énergie est basse) | |
  | ☀️ Jour, sur des algues, 5 ⚡ | `manger()` | |
  | ☀️ Jour, rien autour | `aller_vers_algue()` | |
  | 🦈 Requin à 2 cases, loin de la plage | `fuir()` ou `se_cacher()` | |
  | 🛍️ Plastique sur des algues | pas `manger()` | |

  - [ ] Chaque ligne ❌ dit **quelle ligne du code a agi, et pourquoi**. Par exemple : « La nuit sur la plage, c'est la ligne 3 `manger()` qui s'exécute, parce que `algue_ici()` est vrai… et le premier vrai gagne. Mets la règle de ponte **au-dessus**. »
  - [ ] Les attentes s'adaptent au niveau : les deux situations de requin et de plastique sont des conseils (⚠️), pas des erreurs (❌). Pondre est l'objectif n° 1.
- [ ] **La structure** : repérer, dans le programme analysé (pas dans le texte), ce qui empêche des lignes d'être atteintes :
  - [ ] **plusieurs blocs `if` / `else` à la suite** : « Ta tortue fait **une seule action par tour**. Le bloc des lignes 2 à 5 fait toujours une action, donc les lignes 6 à 9 ne servent **jamais**. » ;
  - [ ] **des `if` séparés** (sans `elif`) : même message, avec la règle « le premier vrai gagne » ;
  - [ ] une **ligne jamais atteinte** à cause d'une condition plus haut, avec une situation en exemple ;
  - [ ] une **condition toujours vraie ou jamais vraie** (`energie() > 10`, `sur_plage() and not sur_plage()`) ;
  - [ ] un **`pondre()` toujours refusé** (il manque la plage, la nuit ou l'énergie), un **`manger()` sans `algue_ici()`** ;
  - [ ] deux conditions identiques, un `else` qui ne s'exécute jamais.
  - [ ] Méthode : essayer toutes les situations de débutant (5 questions vrai/faux, l'énergie de 0 à 10, l'heure de 0 à 23 : au plus 8 500 situations), en respectant les liens évidents (`est_la_nuit()` dépend de l'heure et de la nouveauté). Pour les questions avancées, utiliser des **situations réelles** relevées dans des parties simulées. Moins de 50 ms par analyse.
- [ ] **Les 4 actions clés** : `pondre()`, `aller_vers_plage()`, `manger()`, `aller_vers_algue()` (ou `aller_vers_algue_libre()`), présentes **et atteignables**. Une action en commentaire ou jamais atteinte compte comme absente. Une petite liste toujours visible sous l'éditeur : « Ta tortue sait : ✅ manger · ✅ aller vers les algues · ❌ pondre · ❌ aller vers la plage ».
- [ ] **Un verdict simple, en une ligne**, en tête de l'éditeur :
  - 🟢 « Ta tortue peut pondre » ;
  - 🟠 « Ta tortue peut pondre, mais… » (requins, plastique, énergie) ;
  - 🔴 « Ta tortue ne pondra **jamais** : [la cause] ».

  Il remplace le « ✅ Code valide » actuel, qui ne vérifie que la syntaxe.
- [ ] **Jamais bloquant** : la tortue peut toujours être testée et envoyée.

### 1.2. Des retours qui disent la vraie cause

- [ ] **Le rapport après le match** s'appuie sur le diagnostic et sur ce que la tortue a **réellement fait** pendant la partie :
  - [ ] ne plus jamais conseiller d'ajouter `pondre()` quand il est écrit. Dire plutôt : « `pondre()` est écrit ligne 7, mais il n'a **jamais été atteint**. La nuit, c'est la ligne 3 qui agissait. » ;
  - [ ] compter les occasions manquées : « 12 fois, elle était sur la plage la nuit sans pondre : 9 fois à cause de la ligne 3, 3 fois parce qu'il lui manquait de l'énergie » ;
  - [ ] un seul conseil principal, le plus important d'abord : on fait pondre la tortue avant de parler des requins.
- [ ] **Le coup de pouce** suit le diagnostic, et non la présence des mots :
  - [ ] structure cassée : il commence par « Tu as deux blocs : fusionne-les en une seule chaîne `if` / `elif` / `else` », et montre le code réorganisé ;
  - [ ] mauvais ordre : « Remonte la règle de ponte au-dessus de `manger()` », avec l'ordre conseillé (danger, pondre, rentrer la nuit, manger, chercher à manger) ;
  - [ ] ensuite seulement, les paliers actuels (requins, énergie, plastique, anticiper la nuit).
- [ ] **Une aide pour réparer la structure** : un bouton « 🔧 Fusionner en une seule chaîne », qui transforme les `if` / `else` successifs en `if` / `elif` / `else`. Il montre un avant / après et ne s'applique que si l'élève valide. L'enseignant peut le désactiver dans les réglages.

### 1.3. Une structure guidée dès le départ

- [ ] **Une tortue de départ qui montre la bonne forme.** Elle ne pond toujours pas, puisque c'est à l'élève de l'améliorer, mais elle est déjà **une seule chaîne**. Des commentaires indiquent où ajouter les règles et dans quel ordre. Par exemple :

  ```python
  def tour():
      # Ta tortue fait UNE action par tour : la PREMIÈRE règle vraie.
      # Ajoute tes règles avec « elif », dans l'ordre :
      #   1. 🦈 danger   2. 🥚 pondre   3. 🌙 rentrer la nuit   4. 🌿 manger
      if algue_ici():
          manger()
      else:
          aller_vers_algue()
  ```

  - [ ] À trancher : où placer la ligne d'insertion. Il faut aussi rester compatible avec les tortues déjà envoyées, et ajouter au vérificateur un contrôle « la tortue de départ ne pond pas » (aujourd'hui, il l'affiche seulement dans l'équilibrage).
- [ ] **« ➕ Ajouter une règle »** dans l'éditeur. L'élève choisit une condition et une action dans la boîte à outils, puis le **rang** de la règle (« avant manger », « tout en haut »). L'éditeur insère un `elif` bien indenté, au bon endroit. On ne peut plus fabriquer un second bloc par erreur.
- [ ] **La vue « Priorités »** (en option, à côté de la vue code) : chaque règle est une carte numérotée (« 1. si requin proche → fuir »). On les **fait glisser** pour changer l'ordre, et le code se met à jour. C'est l'image directe de « le premier vrai gagne ».
- [ ] **Pendant la frappe** : si l'élève commence un `if` juste après un bloc `if` / `else` complet, l'éditeur propose tout de suite « Ici, écris plutôt `elif` : sinon cette règle ne sera jamais atteinte ».

### 1.4. Un tutoriel qui finit avec une tortue qui pond

- [ ] **Une étape « Une seule chaîne »** : deux blocs `if` / `else` à la suite. Avec les interrupteurs, l'élève voit que le second bloc ne s'exécute **jamais**. Puis un exercice : fusionner en `if` / `elif` / `else`.
- [ ] **Une étape « L'ordre des priorités »** : remettre 5 règles dans l'ordre en les faisant glisser, vérifié dans des situations (nuit sur la plage, jour sur des algues…).
- [ ] **Deux nouvelles missions de réparation**, conçues à partir des tortues types A et B :
  - « Deux blocs à la suite » : elle ne pond jamais ;
  - « Elle mange au lieu de pondre ».
- [ ] **Une étape finale « Construis ta tortue »** : l'élève assemble la tortue complète avec le bilan de santé en direct, jusqu'à 🟢. Puis **« 🐢 Emporter ma tortue »** : elle l'attend dans l'éditeur de la salle (ou du bac à sable).
- [ ] La progression du tutoriel est visible par l'enseignant (chantier 3).

### 1.5. Tests et critères

- [ ] Les 6 tortues types dans `outils/verifier.mjs`, avec le diagnostic attendu pour chacune.
- [ ] **Aucune fausse alerte** sur les tortues d'entraînement, les solutions des tutoriels, les stratégies d'expert et d'équipe, et les programmes du coup de pouce.

**C'est fini quand** :
- pour chaque tortue type A à E, l'éditeur affiche 🔴 ou 🟠 avec **la vraie cause et la bonne ligne** ;
- le rapport et le coup de pouce ne conseillent plus jamais d'ajouter une action déjà écrite ;
- en classe, au moins **8 élèves sur 10** ont une tortue qui pond à la fin de la manche 1, d'après le chantier 3.

---

## 2. Séparer « Programmer », « Tester », « Aide » et « Conseils »

*Indispensable. Aujourd'hui, le bac à sable partage l'écran avec l'éditeur : « Dans la tête de ta tortue » est petit et loin, alors que c'est l'outil qui fait comprendre.*

- [ ] **Les onglets de la page élève, tous au même niveau** : **✍️ Programmer · 🧪 Tester · 📊 Résultats · 🏆 Classement · ❓ Aide · 💡 Conseils**. L'aide (les règles) et les conseils deviennent deux onglets principaux, à la place de l'unique onglet ❓ Aide qui les contient aujourd'hui en sous-onglets. Chacun garde son « essentiel en 5 lignes » et ses sections à déplier.
- [ ] **✍️ Programmer** :
  - le verdict 🟢 / 🟠 / 🔴 et les 4 actions clés (chantier 1) ;
  - l'éditeur, la boîte à outils, « ➕ Ajouter une règle » ;
  - le coup de pouce ;
  - les boutons **▶ Tester** et **📤 Envoyer**, avec l'état d'envoi bien visible sur le bouton (« ✅ Envoyée à 14 h 05 » ou « ⚠️ Modifiée, pas encore envoyée »).
- [ ] **🧪 Tester** : le lagon et **« Dans la tête de ta tortue »** côte à côte, en grand et synchronisés. On y trouve :
  - le code avec ses lignes vraies, fausses et exécutées ;
  - le tableau des capteurs ;
  - la frise des moments importants ;
  - le pas à pas (◀ 1 tour / 1 tour ▶) ;
  - le bilan de santé (chantier 1), à côté du match.
- [ ] **Navigation** :
  - [ ] **▶ Tester** bascule vers « Tester » et lance la partie ;
  - [ ] un clic sur une ligne de la « pensée » ramène à cette ligne dans l'éditeur (« ✏️ corriger ici ») ;
  - [ ] **🔁 Rejouer ce lagon** reste sur « Tester ».
- [ ] **Tout est conservé** :
  - nouveau lagon à chaque test, rejouer le même lagon ;
  - 📊 Estimer, 🏛️ Panthéon ;
  - choix de la nouveauté en bac à sable libre, lagon personnalisé de la manche ;
  - rapport et conseils du test.
- [ ] Sur un grand écran, une option « côte à côte » (le code et le test ensemble) remplace l'actuel « ◀ Réduire ».
- [ ] Même logique dans l'onglet 📊 Résultats (rejeu du brawl) et dans « Et si… ? ».

**C'est fini quand** un élève peut tester, suivre sa tortue pas à pas avec sa pensée bien visible, et revenir corriger la bonne ligne en un clic, sur ordinateur comme sur téléphone, sans qu'aucune fonction actuelle ne manque.

---

## 3. L'enseignant voit les codes et les difficultés

*Pour aider le bon élève au bon moment, et pour discuter des codes après le brawl.*

### 3.1. Dans les résultats

- [ ] Dans l'écran des résultats de la manche, **un clic sur un élève** ouvre sa fiche :
  - son **code** (en couleur), tel qu'il a joué ;
  - ses nids, ses captures, ses épuisements ;
  - le **diagnostic** du chantier 1 (« ne pond jamais : deux blocs à la suite ») ;
  - **« ▶ Revoir le match en suivant cette tortue »**, avec sa pensée.
- [ ] Un résumé de la classe : « 🥚 18 tortues sur 25 ont pondu. Les 7 autres : 4 ont deux blocs à la suite, 2 mangent la nuit, 1 n'a pas de `pondre()` ». Un clic sur une cause liste les élèves concernés.
- [ ] **Attention au projecteur** : tant que le chantier 6 (écran projeté et pupitre séparés) n'est pas fait, la fiche s'ouvre avec un avertissement « visible au tableau », et un bouton pour la masquer d'un coup.
- [ ] L'export CSV peut inclure les codes (case à cocher).

### 3.2. Pendant la programmation

- [ ] **L'état de chaque élève**, d'après sa **dernière tortue envoyée**, dans la liste des élèves :
  - 🟢 elle pond ;
  - 🔴 elle ne pond pas (avec la cause) ;
  - 🐞 erreur de syntaxe ;
  - ⏳ rien envoyé.

  Plus un compteur en tête : « 🥚 12 / 25 tortues pondent ».
- [ ] **Voir le code envoyé** par un élève pendant la manche, pour l'aider. Il reste invisible pour les autres élèves.
- [ ] **(Option)** L'état du **brouillon** en cours, avant envoi. Seul l'état est envoyé (🟢 / 🔴 / 🐞), jamais le code. Pratique pour repérer un élève bloqué qui n'ose pas envoyer.
- [ ] La progression du tutoriel de chaque élève (⭐ 6 / 10), s'il l'a fait après avoir rejoint la salle (voir le chantier 10).

### Côté base

- [ ] `codes_manche(code, secret, manche)` (enseignant) : les codes envoyés **même pendant la programmation**. Le public ne voit toujours rien avant le brawl.
- [ ] Pour l'option du brouillon : une petite table `etats` (salle, pseudo, état, date), écrite par l'élève avec son jeton, et lue par l'enseignant.

**C'est fini quand** l'enseignant voit, pendant la manche, qui ne pond pas et pourquoi. Après le brawl, il ouvre en un clic le code et le rejeu de n'importe quel élève.

---

## 4. Le Panthéon automatique

*Les meilleures tortues de chaque manche entrent d'elles-mêmes au Panthéon.*

- [ ] **À la fin de chaque manche**, quand l'enseignant passe aux résultats, son navigateur :
  1. prend la ou les meilleures tortues d'élèves de la manche (réglage : la 1re, ou les 3 premières) ;
  2. écarte celles qui n'ont pondu aucun nid, et les copies des tutoriels ou des tortues d'entraînement ;
  3. leur fait passer le banc d'essai (20 parties, en arrière-plan : chantier 9) ;
  4. les inscrit au Panthéon avec le pseudo de l'élève et le **lycée de la classe**.
- [ ] **Réglages enseignant** (gardés 60 jours) :
  - « 🏛️ Envoyer les meilleures tortues au Panthéon » : oui par défaut ;
  - le nom du lycée (une fois pour toutes) ;
  - 1 ou 3 tortues par manche.
- [ ] **L'élève le voit** dans ses résultats : « 🏛️ Ta tortue entre au Panthéon à la 12e place ! », avec **son code Panthéon** pour l'améliorer plus tard. Il le retrouve avec son code de session, sans rien noter.
- [ ] **Au tableau**, dans les résultats : « 🏛️ Maki_Rapide entre au Panthéon (12e) ».
- [ ] **Doublons** :
  - même programme déjà au Panthéon : on ne l'ajoute pas ;
  - même élève (même salle, même pseudo) avec une meilleure tortue : on la remplace ;
  - même élève avec une tortue moins bonne : on garde l'ancienne.
- [ ] **Pseudos en double entre classes** : aujourd'hui, un pseudo est unique dans tout le Panthéon. À trancher :
  - soit l'unicité porte sur **pseudo + lycée** ;
  - soit le pseudo prend une marque (« Moya ² »).
- [ ] Les entrées automatiques restent ⏳ jusqu'à la vérification de l'administrateur, comme les autres.

### Côté base

- [ ] `pantheon_classe(code, secret, entrées)` : l'inscription par l'enseignant (avec le secret de la salle).
- [ ] Les entrées gardent leur origine (salle, manche, pseudo).
- [ ] `mon_entree_pantheon(salle, pseudo, jeton)` : l'élève retrouve son code Panthéon avec son jeton de session.
- [ ] La règle d'unicité des pseudos, selon le choix fait plus haut.

**C'est fini quand**, après chaque manche, la meilleure tortue apparaît au Panthéon sans que personne n'ait rien fait, et que l'élève concerné le voit avec son code.

---

## 5. La galerie des gagnantes

*Après le brawl, les meilleures tortues de la classe deviennent des exemples à étudier. S'appuie sur le chantier 3.*

- [ ] **Au tableau**, dans les résultats de la manche, une **🏆 Galerie** :
  - [ ] le code des 3 premières (ou de celles que l'enseignant choisit) ;
  - [ ] pour chacune, les lignes les plus souvent exécutées (« 42 % du temps : `aller_vers_algue()` ») et ses moments forts.
- [ ] **Des questions pour lancer la discussion** : « Quelle ligne fait la différence ? », « Qu'est-ce que la 1re fait que la 3e ne fait pas ? ».
- [ ] **Chez les élèves**, la galerie dans l'onglet 📊 Résultats :
  - [ ] **comparer** son code avec celui d'une gagnante, côte à côte ;
  - [ ] **« Et si j'avais sa ligne 3 ? »**, qui rejoue le même match avec une ligne empruntée.
- [ ] **L'enseignant décide** : galerie affichée ou non, avec ou sans les pseudos (« Tortue A, B, C »).
- [ ] Rien n'est montré pendant la programmation.

**C'est fini quand** l'enseignant peut projeter et commenter le code des gagnantes, et que chaque élève peut comparer et emprunter une idée.

---

## 6. Vidéoprojecteur : écran projeté et pupitre

*En 1024×768, le code géant et le classement sortent de l'écran. Et tout ce que l'enseignant règle est projeté, y compris, bientôt, les codes des élèves.*

- [ ] **« 📽️ Ouvrir l'écran de projection »** : une fenêtre propre, à mettre sur le vidéoprojecteur. Elle montre le code de la salle, le chrono, le brawl, le podium, la galerie, sans aucun réglage. La fenêtre de l'ordinateur devient le **pupitre** : réglages, liste des élèves, états, codes. Les deux restent synchronisées. Le mode actuel, un seul écran dupliqué, reste possible.
- [ ] **Mise en page 1024×768** :
  - [ ] en dessous de 1200 px de large, la colonne de gauche se replie automatiquement (le code de la salle reste dans la barre du haut) ;
  - [ ] pendant le brawl, le classement en direct s'affiche par-dessus le lagon au lieu de passer sous l'écran.
- [ ] **Lisibilité au tableau** :
  - [ ] les noms des tortues ne se chevauchent plus (étiquettes qui s'écartent, ou pastilles numérotées avec une légende) ;
  - [ ] les 3 premières sont mises en valeur ;
  - [ ] le texte est assez grand pour le fond de la salle.

**C'est fini quand**, en 1024×768, l'écran projeté montre le code géant (attente) et le classement (brawl) sans faire défiler, et qu'aucun réglage ni aucun code d'élève n'apparaît au tableau sans que l'enseignant l'ait choisi.

---

## 7. Le site sur téléphone

*Les élèves font le devoir sur leur téléphone.*

- [ ] **Page élève** : les 6 onglets du chantier 2 dans une barre fixée en bas de l'écran (une icône et un mot court).
- [ ] **Éditeur au doigt** :
  - [ ] la boîte à outils devient un « clavier de primitives », avec « ➕ Ajouter une règle » (chantier 1.3) en premier ;
  - [ ] des boutons « → » (indenter) et « ← » (désindenter) ;
  - [ ] une autocomplétion utilisable au doigt.
- [ ] **Lagon et pensée** : pleine largeur, gros boutons, une frise qu'on fait glisser.
- [ ] **Tutoriels, accueil, Panthéon, aide** : rien ne déborde, les tableaux défilent dans leur cadre.
- [ ] **Espace enseignant sur téléphone** : surveiller la salle (états des élèves) et lancer le brawl.

**C'est fini quand** rien ne déborde horizontalement à 360 px, et qu'un élève peut faire tout le devoir au doigt.

---

## 8. Le rendu graphique, surtout l'accueil

- [ ] **Accueil** :
  - [ ] un en-tête vivant : un petit match qui tourne en fond, désactivé si le système demande moins d'animations ;
  - [ ] des boutons d'action plus visibles ;
  - [ ] une vue enseignant qui donne envie.
- [ ] **Une identité cohérente** : une seule famille d'icônes, ou des emojis homogènes ; cartes, ombres et espacements identiques ; hiérarchie des titres claire.
- [ ] **Polices hébergées sur le site** (woff2), qui ne bloquent plus l'affichage.
- [ ] **Moments de fête** : podium animé, confettis pour la meilleure progression, sons au choix (désactivés par défaut).
- [ ] **Accessibilité de base** : contrastes, navigation au clavier, information jamais portée par la couleur seule, réglage « moins d'animations » respecté.

**C'est fini quand** les captures avant et après des 5 tailles d'écran sont validées par l'enseignant.

---

## 9. Fluidité, sans perte de fonctionnalité

- [ ] **Calculs en arrière-plan (Web Worker)** : le brawl (pendant le compte à rebours 3-2-1), le rejeu chez les élèves, « Et si… ? », l'estimation, le banc d'essai du Panthéon (manuel et automatique). Si le navigateur ne le permet pas, le calcul se fait comme aujourd'hui.
- [ ] **Chargement** : préchargement des modules (`<link rel="modulepreload">`, liste générée par un petit script, sans étape de construction), polices locales, images au bon format.
- [ ] **Hors ligne** (service worker) :
  - [ ] le tutoriel, le bac à sable et l'aide marchent sans réseau ;
  - [ ] l'envoi de la tortue est mis en attente et réessayé au retour du réseau ;
  - [ ] les réponses de la base ne sont jamais gardées en cache ;
  - [ ] un message « nouvelle version disponible » invite à recharger.
- [ ] **Interrogation de la base** : toutes les 2 s pendant les phases vivantes, plus rarement pendant une manche illimitée ou un devoir.
- [ ] **Transitions** douces entre les phases, et un compte à rebours « le brawl commence dans 3… » aussi chez les élèves.

**C'est fini quand** la page élève se charge en moins de 1,5 s en connexion lente, qu'aucune page ne se fige plus de 100 ms, et que tous les tests du chantier 0 passent.

---

## 10. Les parcours (d'après [docs/INTERFACES.md](docs/INTERFACES.md))

- [ ] **La fiche du lagon**, chez l'élève, au tableau et dans la préparation : les règles de la manche, chacune avec la question qui la lit (« 🌙 nuit 20 h → 5 h : `debut_nuit()` = 20 » ; « 👁️ requins : 5 cases, `vision_requin()` »), avec un aperçu de la carte pour l'enseignant.
- [ ] **Rejoindre la salle d'abord, faire le tutoriel ensuite**, avec sa progression visible par l'enseignant (chantier 3).
- [ ] **Un objectif de progression annoncé avant la manche** (« ta dernière estimation : 2,4 nids : fais mieux pour le bonus +3 »).
- [ ] **Des messages au bon moment** :
  - l'oubli au bout d'un jour, chez l'élève (« ta tortue est gardée sur cet ordinateur jusqu'à demain 18 h ; ton code : … ») ;
  - l'effacement 7 jours après la fin d'une séance, chez l'enseignant (« exportez le CSV maintenant »).
- [ ] **Le devoir** : une consigne écrite par l'enseignant et affichée chez l'élève, une date de brawl prévue (facultative).
- [ ] **Préparer toute la séance d'un coup** : une frise des manches, puis un seul bouton « ▶ Manche suivante ».
- [ ] **Un bilan pédagogique de fin de séance**, à partir des codes et des diagnostics (chantiers 1 et 3) : ce que la classe maîtrise, les erreurs les plus fréquentes, imprimable.
- [ ] **Les moments du match** en 3 vignettes cliquables chez l'élève ; **sa progression** d'une manche à l'autre.
- [ ] **« Mon parcours »** : tutoriel → intermédiaire → expert → équipe → Panthéon (battre la Prudente, la Maline, puis la Championne).
- [ ] **Une démo qui se joue toute seule** pour l'enseignant qui découvre.
- [ ] **Un seul code par élève**, à étudier : aujourd'hui, il y a un code de session par salle et un code Panthéon.
- [ ] **Le Panthéon, côté public** : podium, classement des lycées, « comment entrer », les 20 lagons du banc d'essai.
- [ ] Un **pseudo au hasard** (🎲) sur l'accueil.

---

## Annexe A. Les mesures de départ

*Audit du 28 octobre 2026 : PC 4× plus lent, connexion « 3G ».*

| Mesure | Valeur |
|---|---|
| Page élève | 37 modules JavaScript en cascade : 0,6 s normalement, **3,3 s** en connexion lente |
| Brawl de 30 tortues | **2 s** de page figée au calcul, chez l'enseignant puis chez chaque élève |
| Estimation sur 50 parties | 4,2 s |
| Animation du lagon | 54 images/s |
| Page élève sur téléphone | 3 200 px de haut |
| Vidéoprojecteur 1024×768 | colonne de gauche au-dessus de l'écran projeté, classement du brawl sous l'écran, noms des tortues qui se chevauchent |
| Tortues types A, C, E | 0 nid dans 100 % des parties, « ✅ Code valide » |

## Annexe B. La base de données (à relancer dans Supabase après fusion)

| Chantier | Modification de `supabase.sql` |
|---|---|
| Déjà sur `main` | Ménage, compteurs, Panthéon, lagon personnalisé : **à relancer** si ce n'est pas encore fait |
| 3 | `codes_manche` (enseignant) ; option : table `etats` des brouillons |
| 4 | `pantheon_classe`, origine des entrées, `mon_entree_pantheon`, unicité des pseudos |
| 10 | consigne et date du devoir (dans les réglages de la manche, sans nouvelle table) |
