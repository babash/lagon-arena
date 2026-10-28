# 🎓 Pédagogie : pourquoi Lagon Arena marche, et où il bute

[← Retour au README](../README.md) · [Guide de l'enseignant](GUIDE-ENSEIGNANT.md) · [Règles](REGLES.md)

Ce document prend du recul sur le projet : le problème de départ, les idées qui le fondent (et la recherche sur laquelle elles s'appuient), ses points forts, ses limites honnêtes, et le discours pour le présenter.

---

## 1. Le problème de départ

Les **instructions conditionnelles** et les **expressions booléennes** sont au cœur du programme de 1re NSI. Sur le papier, c'est simple. En classe, les mêmes difficultés reviennent, bien documentées par la recherche en didactique de l'informatique (Qian et Lehman, 2017) :

- **la chaîne `if` / `elif` / `else`** : beaucoup d'élèves pensent que toutes les branches vraies s'exécutent, ou ne voient pas que **l'ordre** des conditions fixe les priorités ;
- **les opérateurs booléens** : `and` contre `or`, la place du `not`, les parenthèses ;
- **les blocs** : l'indentation vécue comme une contrainte de mise en page, pas comme une structure ;
- **`=` contre `==`**, les deux-points oubliés…

Et les exercices habituels (« si l'âge est supérieur à 18, afficher majeur ») ont deux défauts : on ne voit pas **pourquoi** on aurait besoin d'une condition, et le programme ne s'exécute **qu'une fois**, dans **une seule** situation. Une erreur de priorité passe inaperçue.

## 2. L'idée en une image

> **Le programme de l'élève est le cerveau d'une tortue.** À chaque tour, le jeu l'appelle ; la tortue fait la première action qu'elle rencontre. Un match, c'est 180 tours : **le même programme est confronté à des centaines de situations différentes**.

Trois conséquences :

1. **La chaîne de conditions devient une liste de priorités.** « Le premier vrai gagne » n'est plus une règle de syntaxe à apprendre : c'est ce qui fait que la tortue mange au lieu de fuir quand un requin arrive. (En intelligence artificielle, une chaîne `if`/`elif` est une *liste de décision* au sens de Rivest, 1987, et la tortue un *agent réactif* à la Brooks, 1986 : pas de plan, des règles par priorité.)
2. **Le jeu est un générateur de tests.** Chaque match essaie le programme dans des situations que l'élève n'avait pas imaginées : de nuit loin de la plage, épuisée sur des algues pleines de plastique, poursuivie par deux requins. Les erreurs de logique **se voient**.
3. **L'élève ne joue pas : il programme quelqu'un qui joue.** Pendant le match, il ne peut plus rien faire. Toute sa stratégie doit être **écrite**. C'est exactement la posture de la programmation.

La tortue n'est pas un hasard : c'est un clin d'œil à la tortue de **Logo** (Papert, 1980), l'« objet pour penser » qui a fondé l'idée qu'on apprend en programmant quelque chose qui vit à l'écran.

## 3. Les principes de conception

### 3.1. Un seul concept, et il est nécessaire

Le jeu ne demande **que des conditions** : pas de boucle, pas de liste, pas de variable qui survit d'un tour à l'autre. Toute la charge cognitive va au concept visé (Sweller, 1988). Et chaque construction a une **raison d'être dans le jeu** :

| Construction | Pourquoi on en a besoin dans le lagon | Où l'élève la découvre |
|---|---|---|
| `if` | manger seulement s'il y a des algues | tutoriel, mission 1 |
| ordre des `elif` | fuir **avant** de manger quand un requin arrive | mission 2 |
| `and` | pondre = sur la plage **et** la nuit **et** assez d'énergie | mission 3 |
| `not` | manger, mais **pas** un sac plastique | mission 4, manche « Invasion de plastique » |
| comparaisons | `energie() >= 6`, `heure() >= 17` | énergie, nuits courtes |
| `or`, parenthèses | `requin_proche() or (est_la_nuit() and energie() < 6)` | tutoriel avancé |
| conditions imbriquées | stratégies d'équipe, choix des algues | niveaux expert et équipe |

Le point de départ est volontairement **incomplet** : la tortue fournie mange, mais **ne pond jamais**. Sans rien changer, l'élève marque zéro. Le besoin de comprendre le code précède l'explication.

### 3.2. Un plancher bas, un plafond haut, des murs larges

La formule vient de Papert, reprise par Resnick (2009) pour Scratch :

- **Plancher bas** : un tutoriel par l'exemple (on manipule avant de lire), l'autocomplétion qui comprend le français (*si*, *sinon*, *nuit*…), la boîte à outils cliquable, le coup de pouce gradué, des messages d'erreur en français qui proposent la correction.
- **Plafond haut** : des primitives avancées **cachées par défaut** (divulgation progressive), trois niveaux de tutoriel avancé, la lecture du lagon (où sont les algues sûres ?), le jeu en équipes, l'estimation statistique.
- **Murs larges** : plusieurs stratégies gagnent. Se cacher dans les algues, fuir vers la plage, anticiper la nuit, choisir des algues loin des requins, pousser les rivales, nourrir ses équipières… Deux bonnes tortues ne se ressemblent pas.

### 3.3. Utiliser, modifier, créer

Le parcours suit la progression *Utiliser → Modifier → Créer* (Lee et al., 2011), proche de la démarche PRIMM (*Predict, Run, Investigate, Modify, Make* ; Sentance et al., 2019) :

1. **Prédire et observer** : dans le tutoriel, un interrupteur True/False montre l'effet d'une condition ; un quiz demande « Devine ce que fait la tortue ».
2. **Examiner** : la « pensée de la tortue » montre quelles conditions sont vraies à chaque tour.
3. **Modifier** : les missions « Répare la tortue » donnent un code presque juste, avec une seule erreur à trouver.
4. **Créer** : sa propre tortue, en compétition.

Les exemples travaillés précèdent les problèmes, l'aide s'efface progressivement (indice, puis solution après deux essais), comme le recommande la théorie de la charge cognitive.

### 3.4. Rendre l'exécution visible

Les débutants n'ont pas de « machine notionnelle » : ils ne se représentent pas ce que fait l'ordinateur ligne par ligne (du Boulay, 1986). Lagon Arena la **montre** :

- **« Dans la tête de ta tortue »** : à chaque tour du rejeu, les conditions vraies en vert, les fausses en rouge, l'action exécutée en jaune (dans l'esprit de Python Tutor ; Guo, 2013) ;
- **la frise** du match place les événements (nid, capture, plastique, épuisement) et permet d'y sauter ;
- **le rapport** relie l'événement à la ligne : « Attrapée 1 fois. À chaque fois, elle exécutait la ligne 11 : `aller_vers_algue()` ».

### 3.5. Des retours à trois vitesses

Un retour efficace dit où on va, où on en est, et **quoi faire ensuite** (Hattie et Timperley, 2007). Lagon Arena en donne à trois échelles de temps :

| Vitesse | Outil | Ce qu'il apprend à l'élève |
|---|---|---|
| **secondes** | éditeur (erreurs en français), exercices vérifiés, ▶ Tester dans le bac à sable | « mon code est correct », « ma tortue fait ce que je voulais » |
| **minutes** | 📊 Estimer (10 à 50 parties), rapport et conseils après le match | « ma stratégie est meilleure qu'avant », « voici la ligne à ajouter » |
| **manche** | brawl projeté, classement, rematch avec une nouveauté | « où j'en suis face aux autres », « ma tortue résiste-t-elle à un lagon plus dur ? » |

Les conseils du rapport ne donnent pas une note : ils donnent **la prochaine ligne à écrire** (« Mets tout en haut : `if requin_proche():` puis `fuir()` »).

### 3.6. Le contrefactuel : « Et si… ? »

Le moteur est **déterministe** : même graine et mêmes programmes donnent exactement le même match. L'élève peut donc **rejouer le match qu'il vient de perdre avec son code corrigé**, toutes choses égales par ailleurs. C'est une démarche expérimentale (une seule variable change) appliquée au débogage. Le déterminisme est autant un choix pédagogique qu'un choix technique.

### 3.7. Le hasard, maîtrisé

- **Un lagon différent à chaque partie** (corail, algues, départs) : impossible d'apprendre un trajet par cœur. Il faut écrire des **règles générales**, pas une solution taillée pour une carte.
- **Un seul match ne prouve rien** : la meilleure tortue d'entraînement finit sans nid dans environ une partie sur cinq quand les requins sont affamés. Le bouton **📊 Estimer** fait jouer 10 à 50 parties et donne la moyenne, la pire et la meilleure partie, la part des parties à zéro. L'élève découvre, sans le formuler ainsi, l'**espérance** et la **dispersion**, et apprend à ne pas sur-interpréter un résultat.

### 3.8. La motivation : une compétition encadrée

Selon la théorie de l'autodétermination (Ryan et Deci, 2000), la motivation tient à trois besoins : **autonomie**, **compétence**, **appartenance**. Le jeu les sert ainsi :

- **autonomie** : sa propre stratégie, sa couleur, son pseudo ; aucune solution unique ;
- **compétence** : des progrès visibles (nids, estimation, « avant / après ») et un **bonus de progression** (+3 points si on pond plus qu'à la manche précédente), qui récompense le progrès et pas seulement le rang (Ames, 1992) ;
- **appartenance** : le brawl projeté est un **moment collectif** (on commente, on rit, on encourage sa tortue), et les **équipes** créent une interdépendance positive (Johnson et Johnson, 2009) : seul le rang de l'équipe compte, aider une équipière rapporte autant que pondre.

Les garde-fous contre les effets pervers de la compétition : des pseudos, des manches **hors classement**, des tortues d'entraînement 🤖 qui donnent des repères (« battre la Prudente » est un objectif atteignable), et des équipes **équilibrées** automatiquement.

### 3.9. L'enseignant orchestre, la machine gère

Une séance réussie dépend de la capacité de l'enseignant à **piloter la classe**, pas seulement de l'outil (Dillenbourg, 2013, parle d'*orchestration*). D'où :

- un déroulé de 55 minutes clé en main, piloté par **un bouton par phase** ;
- un écran projeté qui s'adapte à la phase (code de la salle, chrono géant, ✅ / ⏳ de chaque élève, match animé, podium) ;
- des réglages pour **différencier** sans tout préparer : nouveautés, équipes équilibrées, points doubles, manches longues, devoir à la maison ;
- **rien à installer**, aucun compte : un navigateur suffit, sur les ordinateurs du lycée.

### 3.10. Sobriété et respect des élèves

Un pseudo, une couleur, du code et des scores : **aucune donnée personnelle**, pas de compte, pas de traceur. Le site est statique, la base minuscule, l'hébergement gratuit. Une salle disparaît 60 jours après sa dernière utilisation.

### 3.11. Un ancrage local

Le lagon, les tortues vertes qui viennent pondre **la nuit** sur les plages, les herbiers dont elles se nourrissent, les sacs plastique qu'elles avalent : le thème parle aux élèves de **Mayotte**, où le jeu est né (les élèves fictifs du mode démo portent des noms de communes de l'île). Il ouvre aussi une porte vers l'éducation au développement durable et les SVT, à condition de rappeler que le jeu **simplifie** beaucoup la réalité.

## 4. Les points forts, en résumé

1. **Ciblé** : un concept du programme, travaillé en profondeur, avec une raison d'être pour chaque construction.
2. **Le besoin avant l'explication** : la tortue de départ marque zéro ; c'est l'élève qui veut comprendre.
3. **L'exécution rendue visible** : la pensée de la tortue, la frise, le rapport qui pointe la ligne.
4. **Des retours rapides et utiles**, du bac à sable (secondes) au rematch (minutes), avec des conseils qui disent quoi écrire.
5. **« Et si… ? »** : rejouer le même match avec son code corrigé, grâce au déterminisme.
6. **Pour tous les niveaux** : du grand débutant (tutoriel, coup de pouce, français) à l'élève à l'aise (expert, équipes, estimation).
7. **Un moment de classe** : le brawl projeté, le podium, les équipes ; la progression récompensée.
8. **Sans friction** : rien à installer, pas de compte, gratuit, des pseudos ; une séance prête en une minute, un devoir en trois clics.
9. **Robuste** : moteur vérifié automatiquement (missions, déterminisme, 3 000 cartes sans blocage, équilibrage) ; les anciennes séances se rejouent à l'identique.

## 5. Les limites, les risques et les pistes

Ce qui suit est volontairement franc : un outil pédagogique s'améliore en regardant ses angles morts.

| Limite | Pourquoi c'est un problème | Ce qui atténue déjà | Piste |
|---|---|---|---|
| **Périmètre étroit** : seulement des conditions | ni boucles, ni fonctions, ni listes, ni état : le reste du programme de NSI n'est pas travaillé | c'est un choix assumé (un concept, bien) | une « mémoire » (variables qui survivent d'un tour à l'autre) pour introduire l'état ; des fonctions à écrire soi-même au niveau expert |
| **Transfert vers le « vrai » Python** | l'élève manipule une API de jeu, sans `print`, `input` ni environnement réel | la syntaxe est du vrai Python | une fiche « de la tortue à Python » ; un module `lagon.py` pour faire tourner sa tortue dans Thonny ou Capytale |
| **La compétition peut décourager** | un classement public met en scène les derniers | pseudos, bonus de progression, équipes, manches hors classement | n'afficher que le haut du classement au tableau ; mettre en avant la meilleure progression ; objectifs personnels (« bats la Prudente ») |
| **Un seul brawl est bruité** | le rang dépend en partie de la chance | 📊 Estimer montre la moyenne | classer sur plusieurs lagons (calcul instantané en mode léger), n'en projeter qu'un |
| **Copier sans comprendre** | le coup de pouce montre un programme complet ; les boutons 📋 Copier existent partout | le coup de pouce demande de recopier les lignes en vert | retirer la copie dans le coup de pouce ; après le brawl, demander à l'élève d'**expliquer** un moment de la frise |
| **Les plus rapides attendent, les plus lents décrochent** | 15 minutes de tutoriel ne suffisent pas à tous | niveaux avancés, bac à sable, devoir à la maison | faire faire le tutoriel **avant** la séance (devoir) ; défis optionnels pendant l'attente |
| **Accessibilité non auditée** | lagon dessiné (canvas), information portée par les couleurs, lecteurs d'écran non testés | les équipes ont aussi une icône et un nom | audit RGAA de base, navigation au clavier, mode contrasté |
| **Fracture numérique** | le devoir suppose un ordinateur et une connexion à la maison ; l'éditeur est peu pratique sur téléphone | le bac à sable marche hors salle, n'importe quand | créneaux au CDI ; un éditeur « tactile » fondé sur la boîte à outils |
| **Dépendances techniques** | le projet Supabase gratuit se met en pause après une semaine sans activité ; les salles sont lisibles par l'API publique (n'importe qui peut lister les codes et rejoindre une salle) | aucune donnée personnelle ; l'enseignant peut retirer un élève (✕) | ménage automatique et compteurs ; un code de salle plus long pour les devoirs |
| **Pas d'évaluation mesurée** | les choix s'appuient sur la recherche, mais aucun gain d'apprentissage n'a été mesuré | — | un test court avant / après (prédire le résultat de chaînes `if`/`elif` et d'expressions booléennes), comparé à une séance classique |
| **Maintenance** | un seul mainteneur ; tests de navigateur hors du dépôt | code commenté en français, documentation, vérificateur automatique | tests de bout en bout et intégration continue dans le dépôt ; ouvrir aux contributions |
| **Pas de licence** | sans licence, personne n'a juridiquement le droit de réutiliser ou d'adapter le code | — | choisir une licence libre (par exemple AGPL ou MIT pour le code, CC BY-SA pour la documentation) |

## 6. Le discours

### En une phrase

> **Lagon Arena transforme le chapitre des conditions en Python en tournoi de tortues marines : chaque élève écrit le cerveau de sa tortue avec des `if`, toute la classe plonge dans le même lagon projeté au tableau, puis chacun revoit ce que sa tortue a « pensé » pour l'améliorer avant le rematch.**

### En 30 secondes (à un collègue)

> « Tu sais comme les élèves s'ennuient sur les `if` / `elif` / `else` ? Avec Lagon Arena, chacun programme une tortue de mer : elle doit manger, éviter les requins et pondre la nuit sur la plage. Ils n'ont que des conditions pour ça. Ensuite, toutes les tortues de la classe nagent en même temps au tableau. Ça crie, ça rit, et surtout, après le match, chacun revoit sa tortue ligne par ligne, comprend pourquoi elle s'est fait manger, corrige… et on fait un rematch. C'est un site gratuit, sans compte, rien à installer : tu crées la salle, ils tapent le code. »

### En 2 minutes (réunion d'équipe, inspection, formation)

> **Le problème.** Les conditions sont au cœur de la 1re NSI, mais les exercices classiques ne s'exécutent qu'une fois, dans une seule situation : une erreur de priorité ou de `and` passe inaperçue, et les élèves ne voient pas à quoi ça sert.
>
> **L'idée.** Dans Lagon Arena, le programme de l'élève est le cerveau d'une tortue. À chaque tour, le jeu l'appelle ; la tortue fait la première action qu'elle rencontre. Un match, c'est 180 tours : le même programme affronte des centaines de situations. L'ordre des `elif` devient une question de survie : si la tortue mange avant de regarder les requins, elle se fait manger. La tortue de départ ne pond jamais : sans rien changer, c'est zéro.
>
> **La séance.** Quinze minutes de tutoriel par l'exemple, puis trois manches : huit minutes de programmation, un match projeté où toutes les tortues de la classe nagent ensemble, trois minutes de rapport. Chaque élève revoit le match en suivant sa tortue, avec ce qu'elle « pensait » à chaque tour : les conditions vraies en vert, les fausses en rouge. Il corrige, et peut rejouer exactement le même match pour vérifier. Puis rematch, avec une nouveauté : une invasion de plastique qui oblige à écrire `not`, des nuits courtes qui obligent à anticiper avec `heure()`.
>
> **Pour tous.** Les débutants ont l'autocomplétion en français, un coup de pouce gradué, des messages d'erreur qui proposent la correction. Les plus à l'aise ont des niveaux avancés : lire le lagon pour choisir ses algues, jouer en équipes, estimer statistiquement leur stratégie sur cinquante parties.
>
> **En pratique.** Un site web gratuit, sans compte ni donnée personnelle, rien à installer. On peut aussi en faire un devoir à la maison. Le code est ouvert sur GitHub.

### Aux élèves, en début de séance

Voir le texte prêt à dire dans le [guide de l'enseignant](GUIDE-ENSEIGNANT.md#ce-quon-peut-dire-aux-élèves-pour-lancer-la-séance-1-minute).

### Les questions qu'on vous posera

- **« Et ceux qui n'ont jamais programmé ? »** Le tutoriel part de zéro, par l'exemple, en quinze minutes. L'éditeur complète les mots, comprend le français et explique les erreurs. Le coup de pouce donne la prochaine idée. Un élève qui ajoute seulement deux conditions à la tortue de départ (pondre sur la plage la nuit, aller vers la plage la nuit) passe de 0 à près de 4 nids en moyenne dans le bac à sable (mesuré sur 60 lagons) : la première victoire arrive vite.
- **« C'est un jeu : qu'est-ce qu'ils apprennent vraiment ? »** À écrire, lire et **déboguer** des chaînes de conditions et des expressions booléennes, dans des centaines de situations. Le jeu ne fait que fournir les situations et le retour. Demandez à un élève d'expliquer sa tortue : vous entendrez « le premier vrai gagne ».
- **« La compétition, ça ne décourage pas les plus faibles ? »** C'est le risque principal. Les pseudos, le bonus de progression, les équipes équilibrées et les manches hors classement le limitent ; à vous de choisir ce que vous projetez.
- **« Et les données des élèves ? »** Aucune : un pseudo, une couleur, le code de la tortue et les scores. Pas de compte, pas d'e-mail. Les salles sont effacées après 60 jours.
- **« Ça marche sur les ordinateurs du lycée ? »** Il faut un navigateur récent (Firefox, Chrome, Edge) et une connexion. Rien à installer.

## 7. Références

- Ames, C. (1992). Classrooms: Goals, structures, and student motivation. *Journal of Educational Psychology*, 84(3), 261-271.
- Brooks, R. (1986). A robust layered control system for a mobile robot. *IEEE Journal of Robotics and Automation*, 2(1), 14-23.
- Dillenbourg, P. (2013). Design for classroom orchestration. *Computers & Education*, 69, 485-492.
- du Boulay, B. (1986). Some difficulties of learning to program. *Journal of Educational Computing Research*, 2(1), 57-73.
- Guo, P. J. (2013). Online Python Tutor: embeddable web-based program visualization for CS education. *SIGCSE '13*.
- Hattie, J., et Timperley, H. (2007). The power of feedback. *Review of Educational Research*, 77(1), 81-112.
- Johnson, D. W., et Johnson, R. T. (2009). An educational psychology success story: social interdependence theory and cooperative learning. *Educational Researcher*, 38(5), 365-379.
- Lee, I., et al. (2011). Computational thinking for youth in practice. *ACM Inroads*, 2(1), 32-37.
- Papert, S. (1980). *Mindstorms: Children, Computers, and Powerful Ideas*. Basic Books.
- Qian, Y., et Lehman, J. (2017). Students' misconceptions and other difficulties in introductory programming: a literature review. *ACM Transactions on Computing Education*, 18(1).
- Resnick, M., et al. (2009). Scratch: programming for all. *Communications of the ACM*, 52(11), 60-67.
- Rivest, R. L. (1987). Learning decision lists. *Machine Learning*, 2(3), 229-246.
- Ryan, R. M., et Deci, E. L. (2000). Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being. *American Psychologist*, 55(1), 68-78.
- Sentance, S., Waite, J., et Kallia, M. (2019). Teaching computer programming with PRIMM: a sociocultural perspective. *Computer Science Education*, 29(2-3), 136-176.
- Sweller, J. (1988). Cognitive load during problem solving: effects on learning. *Cognitive Science*, 12(2), 257-285.
