# 🛠️ TODO : prochains chantiers

Chantiers retenus après l'audit du 28 octobre 2026 (design, fluidité, pédagogie). Ils se développent sur la branche `dev`, puis sont fusionnés dans `main`.

**Règles communes à tous les chantiers**

- **Aucune fonctionnalité perdue.** Tout ce qui existe aujourd'hui doit encore marcher après le chantier, sur ordinateur comme sur téléphone.
- **Les séances en cours continuent.** Les anciennes manches se rejouent à l'identique, et la base reste compatible avec les pages déjà ouvertes.
- **Vérifié avant fusion** : `node outils/verifier.mjs`, les parcours du chantier 0, et des captures aux tailles 360, 390, 768, 1024×768 (vidéoprojecteur) et 1366×768.

**Mesures de départ** (audit, PC 4× plus lent et connexion « 3G ») :

| Mesure | Valeur |
|---|---|
| Page élève | 37 modules JavaScript chargés en cascade : 0,6 s normalement, **3,3 s** en connexion lente |
| Brawl de 30 tortues | **2 s** de page figée au calcul, chez l'enseignant puis chez chaque élève |
| Estimation sur 50 parties | 4,2 s |
| Animation du lagon | 54 images/s |
| Page élève sur téléphone | 3 200 px de haut |
| Vidéoprojecteur en 1024×768 | colonne de gauche au-dessus de l'écran projeté, classement du brawl sous l'écran, noms des tortues qui se chevauchent |

**Ordre conseillé** : 0 → 1 + 2 + 3 (ils touchent les mêmes écrans) → 4 → 5 → 6.

---

## 0. Le filet de sécurité : les tests de bout en bout dans le dépôt

*Pour garantir « aucune fonctionnalité perdue » pendant les chantiers suivants.*

- [ ] Ranger dans `outils/tests/` les parcours Playwright utilisés jusqu'ici (hors dépôt) :
  - [ ] séance en démo ;
  - [ ] équipes ;
  - [ ] manche longue et code de session ;
  - [ ] devoir ;
  - [ ] bac à sable et estimation ;
  - [ ] tutoriels (3 niveaux) ;
  - [ ] Panthéon et son administration ;
  - [ ] lagon personnalisé ;
  - [ ] accueil ;
  - [ ] aide ;
  - [ ] stockage d'un jour.
- [ ] Un script unique `node outils/tests/tout.mjs` : il démarre un petit serveur, lance les parcours en mode démo et, si une base locale est disponible, ceux qui ont besoin de la base.
- [ ] Les captures de référence aux 5 tailles d'écran, pour comparer avant et après.
- [ ] (Plus tard) Lancement automatique sur GitHub à chaque envoi (GitHub Actions).

**C'est fini quand** une seule commande vérifie tout, et qu'elle passe sur `main`.

## 1. Le site entièrement adapté aux téléphones (et au vidéoprojecteur)

*Les élèves font le devoir sur leur téléphone ; le tableau est souvent en 1024×768.*

- [ ] **Page élève**, sur téléphone, en onglets **✍️ Programmer / 🧪 Tester / 📊 Résultats / ❓ Aide** (voir le chantier 3), barre d'onglets fixée en bas de l'écran.
- [ ] **Éditeur au doigt** :
  - [ ] la boîte à outils devient un « clavier de primitives » sous l'éditeur : un appui insère `if`, une question, un ordre, avec l'indentation ;
  - [ ] des boutons « → » (indenter) et « ← » (désindenter) ;
  - [ ] une autocomplétion utilisable au doigt.
- [ ] **Lagon** : il occupe toute la largeur, et les contrôles du rejeu sont adaptés au doigt (gros boutons, frise qu'on fait glisser).
- [ ] **Tutoriels** : les exemples et les exercices passent les uns sous les autres, sans débordement horizontal.
- [ ] **Accueil, Panthéon, aide** : les tableaux défilent dans leur cadre, rien ne déborde de l'écran.
- [ ] **Espace enseignant sur téléphone** : surveiller la salle et lancer le brawl (la projection reste prévue pour un grand écran).
- [ ] **Vidéoprojecteur 1024×768** :
  - [ ] en dessous de 1200 px de large, la colonne de gauche se replie automatiquement (le code de la salle reste dans la barre du haut) ;
  - [ ] pendant le brawl, le classement en direct s'affiche par-dessus le lagon au lieu de passer sous l'écran.

**C'est fini quand** rien ne déborde horizontalement à 360 px, toutes les actions sont faisables au doigt, et en 1024×768 l'écran projeté montre le code géant (attente) et le classement (brawl) sans faire défiler.

## 2. Un rendu graphique plus soigné, surtout l'accueil

- [ ] **Accueil** :
  - [ ] un en-tête vivant : un petit match de démonstration qui tourne en fond, ou des tortues et des vagues animées (désactivé si le système demande moins d'animations) ;
  - [ ] des boutons d'action plus visibles, et des compteurs mis en valeur ;
  - [ ] une vue enseignant qui donne envie (captures, « en 3 étapes »).
- [ ] **Une identité cohérente** :
  - [ ] une seule famille d'icônes, ou des emojis utilisés de façon homogène ;
  - [ ] des cartes, des ombres et des espacements identiques partout ;
  - [ ] une hiérarchie des titres claire.
- [ ] **Polices hébergées sur le site** (woff2, sous-ensemble latin), qui ne bloquent plus l'affichage.
- [ ] **Lisibilité au tableau** :
  - [ ] les noms des tortues ne se chevauchent plus (étiquettes qui s'écartent, ou pastilles numérotées avec une légende) ;
  - [ ] les 3 premières sont mises en valeur, la tortue suivie laisse une trace ;
  - [ ] le texte est assez grand pour le fond de la salle.
- [ ] **Moments de fête** : un podium animé, des confettis pour la meilleure progression, des sons au choix au tableau (désactivés par défaut).
- [ ] **Accessibilité de base** :
  - [ ] des contrastes suffisants ;
  - [ ] une navigation au clavier ;
  - [ ] l'information jamais portée par la couleur seule ;
  - [ ] le respect du réglage « moins d'animations ».

**C'est fini quand** les captures avant et après des 5 tailles d'écran sont validées par l'enseignant.

## 3. Séparer « Programmer » et « Tester » pour voir la tête de la tortue

*Aujourd'hui, le bac à sable partage l'écran avec l'éditeur : « Dans la tête de ta tortue » est petit et loin, alors que c'est l'outil qui fait comprendre.*

- [ ] **✍️ Programmer** : l'éditeur, la boîte à outils, le coup de pouce, les avertissements (chantier 4), les boutons **▶ Tester** et **📤 Envoyer**.
- [ ] **🧪 Tester** : le lagon et **« Dans la tête de ta tortue »** côte à côte, en grand et synchronisés. On y trouve :
  - le code avec ses lignes vraies, fausses et exécutées ;
  - le tableau des capteurs ;
  - la frise des moments importants ;
  - le pas à pas (◀ 1 tour / 1 tour ▶).
- [ ] **Navigation** :
  - [ ] **▶ Tester** bascule vers « Tester » et lance la partie ;
  - [ ] un clic sur une ligne de la « pensée » ramène à cette ligne dans l'éditeur (« ✏️ corriger ici ») ;
  - [ ] **🔁 Rejouer ce lagon** revient sur « Tester ».
- [ ] **Tout est conservé** : nouveau lagon à chaque test, rejouer le même lagon, 📊 Estimer, 🏛️ Panthéon, choix de la nouveauté en bac à sable libre, lagon personnalisé de la manche, rapport et conseils du test.
- [ ] Sur un grand écran, garder la possibilité de voir le code et le test ensemble (option « côte à côte »), à la place de l'actuel « ◀ Réduire ».
- [ ] Même logique dans l'onglet 📊 Résultats (rejeu du brawl) et dans « Et si… ? ».

**C'est fini quand** un élève peut tester, suivre sa tortue pas à pas avec sa pensée bien visible, et revenir corriger la bonne ligne en un clic, sur ordinateur comme sur téléphone.

## 4. Détecter les erreurs de logique avant même de tester

*Aujourd'hui, l'éditeur ne signale que 2 cas (« un capteur seul ne fait rien », « aucune action »). C'est le cœur du chapitre : « le premier vrai gagne ».*

- [ ] **Explorer les situations possibles** :
  - [ ] pour les questions de débutant, essayer toutes les combinaisons (5 questions vrai/faux, l'énergie de 0 à 10, l'heure de 0 à 23 : au plus 8 500 situations), en respectant les liens évidents : `est_la_nuit()` dépend de l'heure (et de la nouveauté) ;
  - [ ] pour les questions avancées, utiliser des **situations réelles** relevées dans des parties simulées, pour ne pas inventer des cas impossibles (`sur_plage()` vrai avec `distance_plage()` à 5, par exemple).
- [ ] **Les messages, en français, avec la ligne concernée** :
  - [ ] « La ligne 6 n'est **jamais atteinte** : la condition de la ligne 2 attrape déjà tous ces cas. » (avec un exemple de situation) ;
  - [ ] « Cette condition est **toujours vraie** » ou « **jamais vraie** » (par exemple `energie() > 10`, `sur_plage() and not sur_plage()`) ;
  - [ ] « `pondre()` ici est **toujours refusé** : il faut être sur la plage, la nuit, avec 6 ⚡ ou plus. » (même idée pour `manger()` sans `algue_ici()`) ;
  - [ ] « Deux conditions identiques : la seconde ne sert jamais. » ;
  - [ ] « Le `else` ne s'exécute jamais. ».
- [ ] **Affichage** : ⚠️ dans la barre sous l'éditeur, la ligne soulignée, un clic montre une situation qui pose problème. Ce n'est jamais bloquant : la tortue peut quand même être testée et envoyée.
- [ ] **Les mêmes analyses** nourrissent le 💡 coup de pouce et le rapport après le match.
- [ ] **Rapide** : moins de 50 ms par analyse, relancée quand l'élève s'arrête de taper.
- [ ] **Vérifié** : des cas de test dans `outils/verifier.mjs` (codes avec erreur, et codes corrects sans fausse alerte, dont les tortues d'entraînement et les solutions des tutoriels).

**C'est fini quand** les erreurs classiques sont signalées clairement, sans fausse alerte sur les bons programmes.

## 5. La galerie des gagnantes

*Après le brawl, les meilleures tortues de la classe deviennent des exemples à étudier.*

- [ ] **Au tableau**, dans les résultats de la manche, une **🏆 Galerie** :
  - [ ] le code des 3 premières (ou de celles que l'enseignant choisit) ;
  - [ ] pour chacune, les lignes les plus souvent exécutées (« 42 % du temps : `aller_vers_algue()` ») et ses moments forts.
- [ ] **Des questions pour lancer la discussion** : « Quelle ligne fait la différence ? », « Qu'est-ce que la 1re fait que la 3e ne fait pas ? ».
- [ ] **Chez les élèves**, la galerie dans l'onglet 📊 Résultats après le brawl :
  - [ ] **comparer** son code avec celui d'une gagnante, côte à côte ;
  - [ ] **« Et si j'avais sa ligne 3 ? »**, qui rejoue le même match avec une ligne empruntée.
- [ ] **L'enseignant décide** : galerie affichée ou non, avec ou sans les pseudos (« Tortue A, B, C »).
- [ ] **Côté base** : le code des tortues est déjà lisible après le brawl ; vérifier que rien n'est montré pendant la programmation.

**C'est fini quand** l'enseignant peut projeter et commenter le code des gagnantes, et que chaque élève peut comparer et emprunter une idée.

## 6. Fluidité, sans perte de fonctionnalité

- [ ] **Calculs en arrière-plan (Web Worker)** : le brawl (pendant le compte à rebours 3-2-1), le rejeu chez les élèves, « Et si… ? », l'estimation, le banc d'essai du Panthéon. La page ne se fige plus. Si le navigateur ne le permet pas, le calcul se fait comme aujourd'hui.
- [ ] **Chargement** :
  - [ ] préchargement des modules (`<link rel="modulepreload">`, liste générée par un petit script, toujours sans étape de construction) ;
  - [ ] polices locales (chantier 2) ;
  - [ ] images au bon format.
- [ ] **Hors ligne** (service worker) :
  - [ ] le tutoriel, le bac à sable et l'aide marchent sans réseau ;
  - [ ] l'envoi de la tortue est mis en attente et réessayé au retour du réseau ;
  - [ ] les réponses de la base ne sont jamais gardées en cache ;
  - [ ] un message « nouvelle version disponible » invite à recharger.
- [ ] **Interrogation de la base** : toutes les 2 s pendant les phases vivantes (programmation chronométrée, brawl), plus rarement pendant une manche illimitée ou un devoir. Option : abonnement temps réel Supabase.
- [ ] **Transitions** : changements de phase en douceur, compte à rebours « le brawl commence dans 3… » aussi chez les élèves.

**C'est fini quand** les mesures de départ sont battues (objectifs : page élève en moins de 1,5 s en connexion lente, plus aucune page figée plus de 100 ms), et que tous les tests du chantier 0 passent.
