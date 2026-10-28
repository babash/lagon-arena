# 🧭 Repenser les interfaces, de zéro

[← Retour au README](../README.md) · [TODO](../TODO.md) · [Pédagogie](PEDAGOGIE.md)

*Réflexion du 28 octobre 2026, après l'arrivée sur `dev` du Panthéon, des lagons personnalisés, des compteurs, de l'aide en deux onglets, des primitives par thème, des nouvelles questions `debut_nuit()`, `fin_nuit()` et `vision_requin()`, et des données d'un jour.*

## La méthode

On oublie les pages telles qu'elles existent (`index.html`, `eleve.html`, `prof.html`…). Elles sont découpées comme le code, pas comme la vie de la classe. On repart des **moments** que vivent un élève et un enseignant. Pour chacun, on se pose quatre questions :

1. De quoi la personne a-t-elle besoin, **là, maintenant** ?
2. Que lui montre l'écran aujourd'hui ?
3. Qu'est-ce qui manque, ou qui existe mais reste **caché** ?
4. Que faudrait-il améliorer, ajouter ou rendre visible ?

Les propositions sont marquées **[TODO n]** quand elles font déjà partie d'un chantier du [TODO](../TODO.md), et **[nouveau]** sinon.

## Trois idées qui traversent tout

Avant d'entrer dans le détail, trois constats reviennent à chaque moment.

**1. À chaque instant, une seule prochaine action évidente.** L'élève passe sans cesse de « écrire » à « tester », « envoyer », « regarder », « comprendre » et « corriger ». L'enseignant enchaîne « créer », « lancer », « brawl », « résultats » et « manche suivante ». Aujourd'hui, ces boutons existent tous, mais ils ont souvent le même poids visuel. L'interface devrait toujours **mettre en avant la prochaine action** (un seul bouton plein, les autres discrets) et dire en une phrase où l'on en est.

**2. Le lagon de la manche doit se voir.** Avec les lagons personnalisés et les nouvelles questions, une manche n'est plus seulement « calme » ou « tempête ». Elle a ses heures de nuit, sa vue des requins, son nombre de requins, de sacs, de coraux, d'algues. Or tout cela tient aujourd'hui en une ligne de texte (« lagon personnalisé : 2 requins, 0 sac… »). Il manque une **fiche du lagon**, toujours la même, qui relie chaque règle à la question qui la lit :

| | Cette manche | La question qui le dit |
|---|---|---|
| 🌙 Nuit | 20 h → 5 h | `debut_nuit()` = 20, `fin_nuit()` = 5 |
| 👁️ Vue des requins | 5 cases | `vision_requin()` = 5 |
| 🦈 Requins | 5, rapides | |
| 🛍️ Plastique | 22 sacs, sur les algues | `plastique_ici()` |

Cette fiche apparaîtrait chez l'élève (programmer, tester), au tableau (pendant la programmation) et dans le panneau de préparation de l'enseignant (avec un aperçu de la carte). C'est le pont entre « les règles changent » et « mon code peut s'adapter ». **[nouveau]**

**3. Le parcours de l'élève doit se voir.** Le tutoriel, les trois niveaux avancés, l'estimation, le rang en classe et le Panthéon forment une **progression**, mais elle est éparpillée sur cinq pages. Et depuis que les données ne vivent qu'un jour, une partie de cette progression s'efface (les étoiles des tutoriels). Il faut à la fois la **montrer** et décider **comment la garder** (voir le moment 6).

---

## Les moments de l'élève

### 1. Première visite, en classe

**Besoin** : entrer dans la salle le plus vite possible, sans être bloqué par « je ne sais pas programmer ».

**Aujourd'hui** : l'accueil propose « Rejoindre la partie » et « Première fois ? Le tutoriel » côte à côte. L'enseignant dit « faites d'abord le tutoriel », et l'élève ne rejoint la salle qu'ensuite. Pendant 15 minutes, l'enseignant ne voit donc **personne** dans sa salle, et ne sait pas qui avance au tutoriel.

**Propositions** :
- **Rejoindre d'abord, puis faire le tutoriel dans la salle.** L'élève tape le code et son pseudo, puis sa page lui propose le tutoriel pendant l'attente. Au tableau, la liste des élèves affiche leur progression (⭐ 6 / 10). L'enseignant sait quand lancer la manche 1. **[nouveau]**
- **Un pseudo au hasard** (🎲 « Tortue_Zen », « Maki_Rapide »…) : moins de vrais prénoms, moins de temps perdu. **[nouveau]**
- **Les compteurs de l'accueil** donnent envie : « 🎬 1 234 parties jouées, 🐢 5 678 joueurs ». On peut leur ajouter une touche personnelle à l'arrivée : « Bienvenue, tu es le 5 679e joueur ! ». **[nouveau]**

### 2. Programmer pendant une manche

**Besoin** : savoir quoi faire (la règle de la manche, le temps qui reste), écrire, vérifier que ça marche, envoyer à temps.

**Aujourd'hui** :
- l'éditeur et le bac à sable sont côte à côte ;
- la nouveauté s'affiche dans une carte, le chrono dans la barre du haut, l'état d'envoi sous les boutons ;
- les avertissements se limitent à « un capteur seul ne fait rien » et « aucune action ».

**Propositions** :
- **Séparer ✍️ Programmer et 🧪 Tester**, avec **❓ Aide** et **💡 Conseils** en onglets principaux. **[TODO 3]**
- **La fiche du lagon** en tête de « Programmer », à la place de la carte « nouveauté » et de la ligne « lagon personnalisé ». **[nouveau]**
- **Les 4 actions clés** (pondre, aller vers la plage, manger, aller vers les algues) cochées sous l'éditeur, puis les **erreurs de logique** (ligne jamais atteinte…). **[TODO 4]**
- **Un objectif pour la manche, tiré de l'historique de l'élève** : « Ta dernière estimation : 2,4 nids. Fais mieux pour gagner le bonus de progression (+3) ». Le bonus existe, mais l'élève ne le découvre qu'après coup. **[nouveau]**
- **Un état d'envoi impossible à rater** : le bouton lui-même devient « ✅ Envoyée à 14 h 05 », ou « ⚠️ Modifiée, pas encore envoyée ». Aujourd'hui, l'information est sous le bouton, en petit. **[nouveau]**
- **Le Panthéon en retrait pendant une manche chronométrée** (pour ne pas distraire), et bien visible le reste du temps. **[nouveau]**

### 3. Pendant le brawl

**Besoin** : vivre le moment collectif, au tableau.

**Aujourd'hui** : l'écran de l'élève affiche « Brawl en cours : regarde le tableau ». C'est un bon choix pédagogique : tout le monde regarde la même chose.

**Propositions** :
- **Garder ce choix**, mais rendre l'attente utile pour les retardataires qui ne voient pas le tableau. Par exemple, un rappel de sa propre tortue (« tu as envoyé la version de 14 h 05, avec 4 règles »). **[nouveau]**
- **Au tableau**, voir le moment 9.

### 4. Après le brawl : comprendre

**Besoin** : savoir ce qui s'est passé, **pourquoi**, et quoi corriger.

**Aujourd'hui** : à gauche, le rang, les nids, les points, le rapport, les conseils, « Et si… ? » et le classement. À droite, le rejeu avec la frise et « Dans la tête de ta tortue ». Tout y est, mais la pensée est loin, et les moments importants sont de petites icônes sur la frise.

**Propositions** :
- **Commencer par l'histoire du match** : 3 vignettes cliquables, les moments qui ont compté (« 🦈 Tour 103 : attrapée en mangeant. Ligne 8 », « 🥚 Tour 61 : premier nid »). Un clic ouvre le rejeu à ce moment, avec la pensée de la tortue en grand. **[nouveau, avec TODO 3]**
- **« ✏️ Corriger ici »** depuis une ligne de la pensée, puis « Et si… ? » en un clic. **[TODO 3]**
- **La progression d'une manche à l'autre** : une petite courbe des nids M1 → M2 → M3, et le bonus de progression gagné ou manqué. **[nouveau]**
- **La galerie des gagnantes**, avec « Et si j'avais sa ligne 3 ? ». **[TODO 5]**
- **Le pont vers le Panthéon en fin de séance** : « Ta tortue ferait 3,2 nids au Panthéon (la Championne : 5,5) ». **[nouveau]**

### 5. À la maison : devoir et manche longue

**Besoin** : retrouver sa tortue, comprendre la consigne, savoir jusqu'à quand.

**Aujourd'hui** :
- un encadré « Tu es invité·e » accueille l'élève, et son code de session s'affiche à la première visite ;
- la manche est « illimitée », sans date ;
- les données de l'ordinateur s'effacent au bout d'un jour, **sans que l'élève le sache**.

**Propositions** :
- **La consigne du devoir sur la page de l'élève** : l'enseignant l'écrit en préparant la manche, et elle s'affiche en tête (« 📋 Pour jeudi : ta tortue doit éviter le plastique »). Aujourd'hui, elle ne vit que dans le message envoyé par la messagerie de l'établissement. **[nouveau]**
- **Une date de brawl prévue** (facultative) : « 🎬 Brawl prévu jeudi à 9 h, dans 2 jours ». Le temps reste illimité ; c'est juste un repère. **[nouveau]**
- **Rendre visible la durée d'un jour** : « Sur cet ordinateur, ta tortue est gardée jusqu'à demain 18 h. Pour revenir plus tard : ton code K7PQ-2XMA ». Et un rappel « seule la tortue **envoyée** est gardée dans la salle ». **[nouveau]**
- **Le téléphone** : onglets en bas de l'écran, éditeur au doigt. **[TODO 1]**

### 6. Progresser seul (bac à sable, tutoriels, Panthéon)

**Besoin** : savoir quoi faire ensuite pour devenir meilleur.

**Aujourd'hui** :
- le bac à sable, le tutoriel avancé (une page par niveau) et le Panthéon sont trois portes séparées ;
- le bouton « Proposer au Panthéon » est tout en bas du bac à sable, sous l'estimation ;
- les étoiles des tutoriels s'effacent au bout d'un jour.

**Propositions** :
- **Une carte de progression** : une seule page « Mon parcours » qui montre les étapes comme des îles du lagon. **[nouveau]**
  - 📘 Tutoriel ⭐ 10 / 10
  - 🥈 Intermédiaire ⭐ 3 / 5
  - 🥇 Expert ⭐ 0 / 4
  - 👥 Équipe
  - 🏛️ Panthéon : bats la Prudente (2,05), puis la Maline (4,25), puis la Championne (5,50)
- **Les repères du Panthéon comme objectifs**, jusque dans le résultat de l'estimation : « 3,2 nids : tu bats la Prudente, plus que 1,05 pour la Maline ». **[nouveau]**
- **Garder sa progression au-delà d'un jour, si l'élève le veut** : le même code personnel retrouve aussi les étoiles. Ce qui mène au point suivant. **[nouveau]**
- **Un seul code par élève.** Aujourd'hui, il en existe deux : un code de session par salle, et un code Panthéon. C'est confus. Une rubrique « 🔑 Mes codes », voire un seul code personnel, simplifierait tout. **[nouveau, à étudier]**

---

## Les moments de l'enseignant

### 7. Découvrir le jeu

**Besoin** : comprendre en 2 minutes si ça vaut une séance.

**Aujourd'hui** : la vue enseignant de l'accueil (pitch, capture, 3 étapes, boutons), puis le mode démo, où il faut tout faire soi-même (créer, ajouter des élèves fictifs, lancer).

**Propositions** :
- **Une démo qui se joue toute seule** : un clic, et une séance fictive se déroule sous les yeux en 2 minutes (salle, élèves fictifs qui arrivent, manche 1, brawl, résultats, rematch). On peut la mettre en pause et reprendre la main. **[nouveau]**
- **Une courte vidéo ou animation** sur l'accueil, à côté de la capture. **[nouveau]**

### 8. Préparer une séance ou un devoir

**Besoin** : régler vite, sans se tromper, et prévoir la suite.

**Aujourd'hui** : on prépare **une manche à la fois**, dans un panneau long (raccourcis, titre, nouveauté, durée, points, tortues d'entraînement, qui joue, équipes, lagon personnalisé). Et ce panneau est **projeté** : il s'affiche sous le code géant pendant l'attente, et sous les résultats entre deux manches. Les élèves voient l'enseignant régler les équipes.

**Propositions** :
- **Séparer l'écran projeté et le pupitre.** Un bouton « 📽️ Ouvrir l'écran de projection » ouvre une fenêtre propre, à mettre sur le vidéoprojecteur : code, chrono, brawl, podium, sans aucun réglage. Pendant ce temps, la fenêtre de l'ordinateur devient le pupitre : réglages, liste des élèves, boutons. Les deux restent synchronisées. Le mode « écran dupliqué » actuel resterait possible. **[nouveau, important]**
- **Prévoir toute la séance d'un coup** : une frise des manches (M1 calme 8 min → M2 plastique 6 min → M3 équipes, finale → duel), modifiable. Entre deux manches, un seul bouton « ▶ Manche suivante » suit le plan. La frise reste visible dans la barre du haut : tout le monde sait où on en est. **[nouveau]**
- **Un aperçu du lagon** dans le panneau : une miniature de la carte (corail, algues) et la fiche du lagon, avant de lancer. **[nouveau]**
- **Pour le devoir** : la consigne, la date de brawl prévue, et le message prêt à envoyer qui les reprend. **[nouveau]**

### 9. Animer en direct

**Besoin** : savoir qui a besoin d'aide, tenir le rythme, faire vivre le brawl.

**Aujourd'hui** :
- la liste des élèves affiche ✅ / ⏳, et le chrono est géant ;
- pendant le brawl, le classement en direct et le fil du match ;
- en 1024×768, le classement passe sous l'écran.

**Propositions** :
- **La mise en page vidéoprojecteur.** **[TODO 1 et 2]**
- **Un état par élève pendant la programmation, sans lire leur code** : ✅ envoyée, ✏️ en train d'écrire, 🐞 erreur de syntaxe, 🥚 ne pond pas encore. Ces états découlent directement du repérage des actions clés. On voit d'un coup d'œil vers qui aller. **[nouveau, s'appuie sur TODO 4]**
- **Pendant le brawl** :
  - de vrais commentaires (« Maki_Rapide pond son 3e nid et passe en tête ! ») ;
  - un zoom sur les moments forts ;
  - les étiquettes des tortues lisibles ;
  - une transition animée vers le podium.
  **[TODO 2]**
- **Aux résultats** : le bouton « 🏆 Galerie » **[TODO 5]**, et la meilleure progression mise en valeur dès la manche 2, pas seulement en fin de séance. **[nouveau]**

### 10. Après la séance

**Besoin** : garder une trace, savoir ce que la classe a compris, enchaîner.

**Aujourd'hui** :
- un podium final, la meilleure progression et l'export CSV ;
- la séance terminée est effacée au bout de 7 jours (ménage), **sans que l'enseignant en soit prévenu**.

**Propositions** :
- **Prévenir du ménage** au moment de terminer : « Cette séance sera effacée dans 7 jours. Exportez le CSV maintenant ». **[nouveau]**
- **Un bilan pédagogique** tiré des derniers programmes des élèves (lisibles après le brawl) : combien de tortues pondent correctement (plage + nuit + énergie), mettent la fuite avant de manger, évitent le plastique, utilisent `elif` ; et les erreurs de logique les plus fréquentes. C'est une évaluation formative, imprimable, que l'enseignant n'a aujourd'hui aucun moyen d'obtenir. **[nouveau, s'appuie sur TODO 4]**
- **« Continuer en devoir »** : transformer la séance terminée en devoir, avec les mêmes élèves et leurs tortues. **[nouveau]**

### 11. Administrer le Panthéon

**Aujourd'hui** : `pantheon.html?admin`, un mot de passe, la vérification des scores et le retrait des tortues.

**Propositions** :
- **Un compteur « à vérifier »** visible sur la page publique quand on est connecté en administrateur. **[nouveau]**
- **Le signalement** d'un pseudo ou d'un lycée par les enseignants (un bouton 🚩, qui ne retire rien tout seul). **[nouveau]**

### 12. Le Panthéon, côté public

**Aujourd'hui** : un tableau, un filtre par lycée, les repères 🤖, et « retrouver ma tortue ».

**Propositions** :
- **Un podium** des 3 premières en tête de page.
- **Un classement des lycées** (moyenne de leurs 5 meilleures tortues).
- **Un encadré « Comment entrer au Panthéon ? »** en 3 étapes.
- **Les 20 lagons du banc d'essai** en miniatures : les élèves voient sur quoi leur tortue est jugée.

**[nouveau]**

---

## Ce qu'il faut rendre visible en priorité

En reprenant tous les moments, voici ce qui **existe déjà mais reste caché**, du plus important au moins important :

1. **Les règles de la manche** (lagon personnalisé, nouvelles questions) → la fiche du lagon.
2. **« Dans la tête de ta tortue »** → la page « Tester » **[TODO 3]**.
3. **L'oubli au bout d'un jour** (élève) et **l'effacement au bout de 7 jours** (enseignant) → des messages au bon moment.
4. **Le bonus de progression** → un objectif annoncé avant la manche, pas découvert après.
5. **Le Panthéon et ses repères** → des objectifs dans l'estimation et une carte de progression.
6. **L'état de chaque élève** pour l'enseignant → des états simples, sans lire le code.

## Ce qu'il faudrait ajouter, en résumé

| Idée | Pour qui | Intérêt | Effort |
|---|---|---|---|
| 📽️ Écran de projection séparé du pupitre | enseignant | ⭐⭐⭐ | moyen |
| 🗺️ Fiche du lagon (règles + questions qui les lisent) | tous | ⭐⭐⭐ | faible |
| Rejoindre d'abord, tutoriel dans la salle, progression visible | élève, enseignant | ⭐⭐⭐ | moyen |
| États des élèves pendant la programmation | enseignant | ⭐⭐ | moyen (après TODO 4) |
| Bilan pédagogique de fin de séance | enseignant | ⭐⭐ | moyen (après TODO 4) |
| Frise de la séance, « manche suivante » en un clic | enseignant | ⭐⭐ | moyen |
| Consigne et date du devoir | élève, enseignant | ⭐⭐ | faible |
| Objectif de progression avant la manche | élève | ⭐⭐ | faible |
| Histoire du match en 3 vignettes | élève | ⭐⭐ | faible |
| Carte de progression « Mon parcours » | élève | ⭐⭐ | moyen |
| Démo qui se joue toute seule | enseignant | ⭐⭐ | moyen |
| Messages « oubli dans 1 jour » et « effacement dans 7 jours » | tous | ⭐⭐ | faible |
| Un seul code par élève | élève | ⭐ | à étudier |
| Panthéon : podium, lycées, comment entrer, banc d'essai | élève | ⭐ | faible |
| Pseudo au hasard | élève | ⭐ | faible |
