# Les migrations de la base de Lagon Arena

Chaque changement de la base est un fichier numéroté, avec son **inverse** (pour revenir en arrière). Le fichier contient `begin;` et `commit;` ; par `apply_migration`, on retire seulement ces deux lignes et on garde le nom du fichier comme nom de migration (`lagon_NNNN_…`). Le script complet, pour installer sa propre copie, est `supabase.sql` à la racine : il est fabriqué à partir des migrations par `python3 -I outils/supabase_sql.py`, dans le même commit que chaque migration.

Règles communes à toutes les applications : `architecture/regles-supabase.md` (projet « Site SNT-NSI ») ; plan du déménagement : `architecture/base-unique.md`, § 4.4 et n° 7 du § 3. **Le SQL exact est montré à l'enseignant avant d'être appliqué.** Aucun agent ne lit une valeur d'une table de données d'élèves, ni ne déplace de données d'élèves : le déménagement n'en a déplacé aucune (le Panthéon a repris à zéro, voir « Le jour du déménagement »).

## Où en est la base

| N° | Fichier (inverse) | Projet | Ce qu'elle fait | Appliquée |
|---|---|---|---|---|
| 0001 | `0001-pantheon-automatique.sql` (`0001-pantheon-automatique-inverse.sql`) | ancien projet `gkyvaugipddjqjvvpopw` | `pantheon_classe` (le Panthéon automatique, avec la limite des 1 000 meilleures tortues) et `pantheon_admin` avec la manche | ✅ le 10/11/2026 à 23 h 08 (heure de Mayotte), sous le nom `lagon_0001_pantheon_automatique` |
| 0002 | `0002-base-unique.sql` (`0002-base-unique-inverse.sql`) | base unique `cukahpyqkljiddmimpyi` | le schéma `lagon`, ses 9 tables **vides**, 8 fonctions internes et 30 fonctions d'entrée `public.lagon_…` | ✅ le 19/11/2026 à 13:36 (heure de Mayotte), sous le nom `lagon_0002_base_unique`, version `20261119103631` (SQL accepté par l'enseignant le 19/11 à 12:51) |
| 0003 | `0003-pantheon-importe.sql` (`0003-pantheon-importe-inverse.sql`) | base unique | sans import, sur le Panthéon vide : le compteur des identifiants à 1 et `id` « generated always » (son nom et ses commentaires parlent d'un import qui n'a pas eu lieu : le fichier est resté tel quel, pour garder le texte accepté) | ✅ le 19/11/2026 à 13:37 (heure de Mayotte), sous le nom `lagon_0003_pantheon_importe`, version `20261119103723` (même accord) |

**Avant ces fichiers**, dans l'ancien projet (appliquées par leur nom, sans fichier séparé ; leur SQL était dans l'ancien `supabase.sql`, visible dans l'historique) : `etablissement_facultatif`, `pantheon_classe_et_date`, `retrouver_session_par_code` (10/11), `chantier_3_codes_manche_et_entree_pantheon` (10/11). Le socle de la base unique a aussi fermé la séquence du Panthéon de l'ancien projet (`base_unique_0004_ancien_projet_sequence_pantheon`, dépôt du site).

**Le gel (12/11)** : plus aucune migration de Lagon Arena dans l'ancien projet. Toute migration vise désormais la base unique.

## Ce que change le déménagement

- **Les tables** quittent `public` de l'ancien projet pour le schéma `lagon` de la base unique, que l'API n'expose pas : `salles`, `salles_secrets` (ancienne `salles_secret`), `joueurs`, `joueurs_jetons` (ancienne `joueurs_secret`), `programmes` (ancienne `tortues`), `scores`, `compteurs`, `pantheon`, `pantheon_admin` (ancienne `admin_secret`). Mêmes colonnes qu'avant (celles du Panthéon dans le même ordre, prévu pour un import qui n'a finalement pas eu lieu), un commentaire sur chacune.
- **Les fonctions** prennent le préfixe `lagon_`, avec les mêmes paramètres et les mêmes réponses, sauf ce qui suit. Les fonctions internes (`verifier_prof`, `verifier_admin`, `compter`, `menage`, `nom_etablissement`, `nouveau_jeton_pantheon`) vont dans `lagon`, sans aucun droit.
- **Plus de lecture publique** (étapes 4a et 4b de la spécification des codes) : `lagon_salle`, `lagon_joueurs`, `lagon_scores` et `lagon_programmes` remplacent la lecture directe des 4 tables ; les programmes restent invisibles avant le brawl de leur manche.
- **Plus de plafond de 30 joueurs** par salle (règle 21).
- **Les listes sans borne** (joueurs, scores, programmes, codes de session, codes de la manche, dépôts) arrivent en un seul objet JSON : l'API ne les coupe plus à 1 000 lignes. La page reçoit le même tableau qu'avant.
- **Le mot de passe de l'administration du Panthéon** est gardé en empreinte bcrypt (`lagon.definir_mot_de_passe_admin`), plus en clair. L'ancien projet n'en avait aucun : il n'y a rien à déplacer.
- **Le Panthéon public** (décision du 12/11) affiche le pseudo, l'établissement s'il est connu, le score et la date ; la classe n'est plus renvoyée par `lagon_pantheon_top`. L'établissement vient de la salle, donné par l'enseignant·e : `lagon_proposer_pantheon` n'a plus de paramètre `p_lycee`, et `lagon_definir_etablissement` met à jour les tortues de la classe.
- **Petits durcissements** : le secret d'une salle et le code Panthéon sont tirés par `gen_random_bytes` (le code Panthéon sans biais) ; la taille des paramètres est bornée (couleur, nouveauté, scores, jetons).

**La page** (`js/db.js`) reconnaît toute seule la forme de la base au premier appel (`lagon_heure_serveur` existe ou non). Elle marche donc avec l'ancien projet comme avec la base unique : côté code, **la bascule ne change que l'adresse et la clé de `js/config.js`**, et le retour en arrière aussi.

## Le jour du déménagement : le 19/11/2026 (option C du plan : on repart de zéro, avec les seuls compteurs)

Les salles, les joueurs, les programmes, les scores **et le Panthéon ne sont pas déplacés**. Les salles finies seraient de toute façon effacées par le ménage (7 à 60 jours), et les codes de session ne servent plus une fois la salle finie. Pour le Panthéon, c'est la décision de l'enseignant du 19/11 à 12:55 : « On repart avec un panthéon de 0 ». **Le Panthéon de la base unique commence vide** : il n'y a ni export ni import. L'ancien Panthéon reste dans l'ancien projet, sans servir, jusqu'au retrait de ses objets (étape 8) ; il est alors effacé avec eux. Les codes Panthéon donnés avant ne retrouvent plus de tortue ; un·e élève peut reproposer la sienne, avec son ancien code s'il ou elle l'a gardé.

**Seuls les compteurs de l'accueil sont recopiés** (décision du 19/11 à 12:58) : les 4 lignes de `compteurs` (`parties`, `participants`, `salles`, `dernier_menage`). Ce ne sont pas des données d'élèves : ce sont les nombres publics de l'accueil et la date du dernier ménage.

Il faut **un moment sans salle en cours** (ni séance, ni devoir ouvert) : le 19/11 à 12:55, l'enseignant a confirmé qu'aucune salle n'était en cours, et il n'en ouvre pas avant la fin du déménagement.

| Étape | Qui | Quoi |
|---|---|---|
| 1 | enseignant | ✅ a vu le SQL exact de `0002-base-unique.sql` et de `0003-pantheon-importe.sql` (envoyés le 13/11) et l'a accepté le 19/11 à 12:51 (« Ok base lagon »). Empreintes du texte (`empreintes_migration.py` du Gardien) : `bbd3aa60…` pour `0002`, `3159dc3a…` pour `0003` ; elles n'ont pas changé depuis l'envoi |
| 2 | chef d'orchestre | ✅ a appliqué `0002` à la base unique le 19/11 à 13:36 (`apply_migration`, nom `lagon_0002_base_unique`, version `20261119103631`). Rien n'a changé pour les élèves : les tables étaient vides, la page utilisait encore l'ancien projet |
| 3 | chef d'orchestre | ✅ **a recopié les compteurs** à 13:37 : il a lu les 4 lignes de `public.compteurs` dans l'ancien projet (`select nom, valeur, maj from public.compteurs order by nom;`), puis les a écrites dans la base unique par un `insert` de 4 lignes, avec `on conflict (nom) do nothing` : un compteur déjà présent n'aurait pas été écrasé (modèle ci-dessous). Valeurs recopiées, avec leurs dates `maj` : `parties` 7, `participants` 109, `salles` 12, `dernier_menage` 64 |
| 4 | chef d'orchestre | ✅ a appliqué `0003` juste après, à 13:37 (`apply_migration`, nom `lagon_0003_pantheon_importe`, version `20261119103723`). Sur le Panthéon vide, il ne fait que deux choses : le compteur des identifiants est placé à 1 (la première tortue prendra l'identifiant 1) et la colonne `id` devient « generated always » (personne ne peut plus choisir un identifiant). Ses garde-fous passent (le rôle `postgres`, la table de `0002`, au plus 1 000 tortues), l'étape 1 du fichier (les cases vides d'un import) ne trouve aucune ligne, et son contrôle final passe ; aucune autre table, aucune fonction, aucun droit ne change |
| 5 | Gardien | vérifie, par les métadonnées seulement (requêtes ci-dessous, dont `count(*)` : 4 compteurs, 0 tortue ; et les conseillers), et l'inscrit au journal |
| 6 | Gardien | publie la bascule (branche `atelier/t42-lagon-bascule`) : `js/config.js` prend l'adresse et la clé « publishable » de la base unique, et les textes du dépôt disent l'état d'après le déménagement |
| 7 | enseignant | essaie : créer une salle, la rejoindre depuis un autre appareil, jouer une manche, voir le Panthéon (vide au départ ; la meilleure tortue de la manche y entre à la 1re place) et l'accueil (les nombres d'avant, recopiés). « Mes salles » oublie les anciennes salles quand il les ouvre (« Salle introuvable »). Pour vérifier les scores du Panthéon, il enregistre une fois le mot de passe de l'administration dans la base unique (« L'administration du Panthéon », plus bas) |
| 8 | 30 jours plus tard (vers le 19/12/2026) | une migration montrée à l'enseignant retire les objets de Lagon Arena de l'ancien projet, ancien Panthéon compris, sans toucher aux objets `guilde_*` (n° 9 du plan) ; la page perd alors sa compatibilité avec l'ancienne forme (`js/db.js`), et le retour en arrière n'est plus possible |

Le modèle de l'étape 3, celui qui a servi (les `…` sont les valeurs lues dans l'ancien projet ; `maj` est la date de la dernière mise à jour, pour `dernier_menage` la date du dernier ménage) :

```sql
insert into lagon.compteurs (nom, valeur, maj) values
  ('dernier_menage', …, '…'),
  ('participants',   …, '…'),
  ('parties',        …, '…'),
  ('salles',         …, '…')
on conflict (nom) do nothing;
```

## Vérifier, par les métadonnées seulement

Après `0002`, les compteurs et `0003`, dans la base unique :

```sql
-- le schéma est fermé (attendu : false, false)
select has_schema_privilege('anon', 'lagon', 'usage'), has_schema_privilege('authenticated', 'lagon', 'usage');
-- 9 tables, toutes avec la RLS, sans règle ni droit pour anon ou authenticated (attendu : 9 lignes, rls = true, droits vides)
select c.relname, c.relrowsecurity as rls,
  (select string_agg(privilege_type, ',') from information_schema.role_table_grants g
    where g.table_schema = 'lagon' and g.table_name = c.relname and g.grantee in ('anon', 'authenticated')) as droits
from pg_class c where c.relnamespace = 'lagon'::regnamespace and c.relkind = 'r' order by 1;
select count(*) from pg_policies where schemaname = 'lagon';                     -- attendu : 0
-- les fonctions d'entrée : attendu 30, toutes pour anon seul
select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'lagon\_%'
  and has_function_privilege('anon', p.oid, 'execute') and not has_function_privilege('authenticated', p.oid, 'execute');
-- les fonctions internes : attendu 8, aucune appelable par l'API
select p.proname, has_function_privilege('anon', p.oid, 'execute') from pg_proc p where p.pronamespace = 'lagon'::regnamespace;
-- le registre : attendu 9 lignes « lagon », données d'élèves oui pour joueurs, joueurs_jetons, programmes, scores, pantheon
select table_nom, donnees_eleves from commun.registre where application = 'lagon' order by 1;
-- après 0003 : attendu « a » (generated always)
select attidentity from pg_attribute where attrelid = 'lagon.pantheon'::regclass and attname = 'id';
-- les compteurs recopiés et le Panthéon vide : attendu 4, puis 0
select count(*) from lagon.compteurs;
select count(*) from lagon.pantheon;
-- le compteur des identifiants, avant la première tortue : attendu 1, false (la première tortue prendra l'identifiant 1)
select last_value, is_called from lagon.pantheon_id_seq;
```

**Les conseillers** (`get_advisors`, sécurité) : attendus, ce ne sont pas des erreurs, 0028 pour les 29 fonctions `security definer` de la liste ci-dessous (portes voulues) et 0008 (« RLS sans règle ») pour les 9 tables. À corriger : tout 0011, 0013, 0010, et tout 0028 hors de la liste.

**La page publiée** (règle M7) n'appelle que ces fonctions : `rpc("…")` dans `js/db.js`, préfixées `lagon_`.

## Les fonctions d'entrée attendues (30, `public`, appelables par `anon` seul)

- **Tout le monde** : `lagon_heure_serveur()` (la seule sans `security definer`), `lagon_statistiques()`, `lagon_creer_salle(text)`, `lagon_salle(text)`, `lagon_joueurs(text)`, `lagon_scores(text)`, `lagon_programmes(text)`, `lagon_etat_depots(text, int)`, `lagon_pantheon_top(int, text)`, `lagon_pantheon_lycees()`.
- **Enseignant·e, avec le secret de la salle** : `lagon_piloter_salle(text, text, int, text, int, int, text, text[])`, `lagon_retirer_joueur(text, text, text)`, `lagon_definir_config(text, text, jsonb)`, `lagon_definir_etablissement(text, text, text)`, `lagon_liberer_pseudo(text, text, text)`, `lagon_codes_session(text, text)`, `lagon_codes_manche(text, text, int)`, `lagon_enregistrer_scores(text, text, int, jsonb)`, `lagon_pantheon_classe(text, text, int, jsonb)`.
- **Élève, avec son jeton ou son code** : `lagon_rejoindre(text, text, text, text)`, `lagon_deposer_tortue(text, text, text, int, text)`, `lagon_changer_jeton(text, text, text, text)`, `lagon_ma_tortue(text, text, text)`, `lagon_retrouver_session(text)`, `lagon_proposer_pantheon(text, text, numeric, int, text, text, text)`, `lagon_ma_tortue_pantheon(text)`, `lagon_mon_entree_pantheon(text, text, text)`.
- **Administration du Panthéon, avec le mot de passe** : `lagon_pantheon_admin(text)`, `lagon_pantheon_valider(text, bigint, numeric)`, `lagon_pantheon_retirer(text, bigint)`.

## L'administration du Panthéon

Pour l'ouvrir (`pantheon.html?admin`), l'enseignant choisit un mot de passe d'au moins 12 caractères et lance **une fois**, dans l'éditeur SQL de la base unique : `select lagon.definir_mot_de_passe_admin('…');`. Seule son empreinte est gardée. Le mot de passe reste dans l'historique de l'éditeur SQL : ne le donner à personne, ne l'écrire dans aucun fichier ni aucun message.

## Revenir en arrière

- **Avant la bascule de la page** (étapes 2 à 5) : `0003-pantheon-importe-inverse.sql` (si `0003` est passée), puis `0002-base-unique-inverse.sql`. Sans risque : la page utilise encore l'ancien projet, où sont restés le Panthéon et les compteurs ; dans la base unique, le Panthéon est vide et les compteurs n'en sont qu'une copie.
- **Après la bascule** : republier l'ancienne `js/config.js` (l'adresse et la clé de l'ancien projet), avec les textes d'avant la bascule : le Gardien annule la fusion de la branche de bascule (`git revert`). La page reconnaît l'ancienne forme toute seule, et retrouve l'ancien Panthéon et les anciens compteurs tels qu'ils étaient le 19/11/2026 : l'ancien projet reste intact jusqu'au retrait de ses objets (étape 8, 30 jours après). Ce qui a été joué entre-temps dans la base unique n'est pas repris (les salles, les tortues entrées au Panthéon, ce que les compteurs ont gagné). `0002-base-unique-inverse.sql` n'est pas nécessaire ; il refuse d'ailleurs de passer tant qu'une salle existe dans `lagon.salles`, pour ne rien effacer par erreur.

## L'essai local

Toujours sur une reproduction locale de la base unique (rôles de Supabase, socle `0001` à `0003` du site, **données inventées**), jamais sur la base en ligne.

**Le 19/11, sans import** (le déroulé du jour du déménagement) : PostgreSQL 16 ; dans une copie d'essai de `0002` et du socle `0003`, le droit `maintain` (nouveau dans Postgres 17) est retiré des deux lignes de contrôle finales, seul écart avec les fichiers.

- `0002` comme `apply_migration`, puis relancé dans l'éditeur SQL, sans effet ; les 4 compteurs (valeurs inventées) par le même `insert` qu'au jour J, avec `on conflict (nom) do nothing` (relancé avec d'autres valeurs, il n'écrase rien) ; `0003` sur le Panthéon vide, relancé sans effet : il ne change que le compteur des identifiants (à 1) et la colonne `id` (« generated always ») ; rien ne change hors du schéma `lagon`, ni dans les compteurs ;
- les vérifications ci-dessus (métadonnées) : toutes au résultat attendu ;
- en `anon`, par les seules fonctions : l'accueil affiche les compteurs recopiés et un Panthéon à 0 ; la première tortue proposée entre à la 1re place avec l'identifiant 1, la tortue d'une classe (Panthéon automatique) avec l'identifiant 2 et l'établissement de la salle ; un code Panthéon d'avant ne retrouve rien ; personne ne peut choisir un identifiant ; les tables restent illisibles ;
- les inverses : `0003` inverse, puis `0003` de nouveau (la tortue suivante prend l'identifiant 3) ; `0002` inverse refusé tant qu'une salle existe, puis, sans salle, on retrouve exactement l'état d'avant ; l'aller-retour complet, et le retour en arrière d'avant la bascule (`0003` inverse, puis `0002` inverse) ;
- **37 contrôles, 0 échec** ;
- puis la page publiée avec la bascule (`js/config.js` de la base unique), dans le navigateur (Playwright), les appels à la base interceptés et un Panthéon vide : 7 pages (accueil, enseignant·e, bac à sable, Panthéon et son administration, les deux tutoriels) à 320, 768 et 1440 px, en clair et en obscur (le jeu n'a pas de thème obscur : il reste clair), soit 42 rendus, 0 erreur JavaScript, 0 débordement ; la clé « publishable » part dans l'en-tête `apikey`, sans en-tête `Authorization`, et aucun appel ne va à l'ancien projet. Le message du Panthéon vide (et celui d'une erreur) est sorti du tableau, qui défile dans son cadre sur un téléphone : il se lit en entier à 320, 768 et 1440 px (contraste 11,5:1, et 7,7:1 pour l'erreur).

**Le 13/11, avec un import imité** (l'option prévue alors) : PostgreSQL 17.

- `0002` comme `apply_migration` puis dans l'éditeur SQL, relancé sans effet ; rien ne change hors du schéma `lagon` et des fonctions `lagon_` ;
- une séance jouée en `anon` par les seules fonctions : 35 élèves (plus de plafond), codes de session, visibilité des programmes avant et après le brawl, scores, Panthéon automatique et proposé, établissement de la salle, administration (empreinte bcrypt), ménage ;
- l'import imité (un CSV inventé, avec des cases vides en texte vide), puis `0003`, relancé sans effet ; un ancien code Panthéon reste accepté ; la nouvelle tortue prend l'identifiant suivant ;
- les inverses et l'aller-retour (on retrouve exactement l'état d'avant, puis celui d'après) ; les garde-fous (ancien projet, schéma ou fonction venus d'ailleurs, autre rôle) ;
- `supabase.sql` dans un projet neuf donne exactement les mêmes objets que `0002` + `0003` ;
- **188 contrôles, 0 échec** ;
- puis les parcours de la page dans le navigateur (`outils/tests`, Playwright), contre un PostgREST local : **18 / 18** avec la nouvelle forme de la base, **18 / 18** avec l'ancienne (le `supabase.sql` d'avant), et en mode démo.
