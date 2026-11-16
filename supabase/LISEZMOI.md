# Les migrations de la base de Lagon Arena

Chaque changement de la base est un fichier numéroté, avec son **inverse** (pour revenir en arrière). Le fichier contient `begin;` et `commit;` ; par `apply_migration`, on retire seulement ces deux lignes et on garde le nom du fichier comme nom de migration (`lagon_NNNN_…`). Le script complet, pour installer sa propre copie, est `supabase.sql` à la racine : il est fabriqué à partir des migrations par `python3 -I outils/supabase_sql.py`, dans le même commit que chaque migration.

Règles communes à toutes les applications : `architecture/regles-supabase.md` (projet « Site SNT-NSI ») ; plan du déménagement : `architecture/base-unique.md`, § 4.4 et n° 7 du § 3. **Le SQL exact est montré à l'enseignant avant d'être appliqué.** Aucun agent ne lit une valeur d'une table de données d'élèves, ni ne déplace de données : l'import du Panthéon est fait par l'enseignant lui-même.

## Où en est la base

| N° | Fichier (inverse) | Projet | Ce qu'elle fait | Appliquée |
|---|---|---|---|---|
| 0001 | `0001-pantheon-automatique.sql` (`0001-pantheon-automatique-inverse.sql`) | ancien projet `gkyvaugipddjqjvvpopw` | `pantheon_classe` (le Panthéon automatique, avec la limite des 1 000 meilleures tortues) et `pantheon_admin` avec la manche | ✅ le 10/11/2026 à 23 h 08 (heure de Mayotte), sous le nom `lagon_0001_pantheon_automatique` |
| 0002 | `0002-base-unique.sql` (`0002-base-unique-inverse.sql`) | base unique `cukahpyqkljiddmimpyi` | le schéma `lagon`, ses 9 tables **vides**, 8 fonctions internes et 30 fonctions d'entrée `public.lagon_…` | non : en attente de l'accord de l'enseignant |
| 0003 | `0003-pantheon-importe.sql` (`0003-pantheon-importe-inverse.sql`) | base unique | après l'import du Panthéon par l'enseignant : cases vides, compteur des identifiants, `id` « generated always » | non : le jour du déménagement |

**Avant ces fichiers**, dans l'ancien projet (appliquées par leur nom, sans fichier séparé ; leur SQL était dans l'ancien `supabase.sql`, visible dans l'historique) : `etablissement_facultatif`, `pantheon_classe_et_date`, `retrouver_session_par_code` (10/11), `chantier_3_codes_manche_et_entree_pantheon` (10/11). Le socle de la base unique a aussi fermé la séquence du Panthéon de l'ancien projet (`base_unique_0004_ancien_projet_sequence_pantheon`, dépôt du site).

**Le gel (12/11)** : plus aucune migration de Lagon Arena dans l'ancien projet. Toute migration vise désormais la base unique.

## Ce que change le déménagement

- **Les tables** quittent `public` de l'ancien projet pour le schéma `lagon` de la base unique, que l'API n'expose pas : `salles`, `salles_secrets` (ancienne `salles_secret`), `joueurs`, `joueurs_jetons` (ancienne `joueurs_secret`), `programmes` (ancienne `tortues`), `scores`, `compteurs`, `pantheon`, `pantheon_admin` (ancienne `admin_secret`). Même colonnes qu'avant (celles du Panthéon dans le même ordre, pour l'import), un commentaire sur chacune.
- **Les fonctions** prennent le préfixe `lagon_`, avec les mêmes paramètres et les mêmes réponses, sauf ce qui suit. Les fonctions internes (`verifier_prof`, `verifier_admin`, `compter`, `menage`, `nom_etablissement`, `nouveau_jeton_pantheon`) vont dans `lagon`, sans aucun droit.
- **Plus de lecture publique** (étapes 4a et 4b de la spécification des codes) : `lagon_salle`, `lagon_joueurs`, `lagon_scores` et `lagon_programmes` remplacent la lecture directe des 4 tables ; les programmes restent invisibles avant le brawl de leur manche.
- **Plus de plafond de 30 joueurs** par salle (règle 21).
- **Les listes sans borne** (joueurs, scores, programmes, codes de session, codes de la manche, dépôts) arrivent en un seul objet JSON : l'API ne les coupe plus à 1 000 lignes. La page reçoit le même tableau qu'avant.
- **Le mot de passe de l'administration du Panthéon** est gardé en empreinte bcrypt (`lagon.definir_mot_de_passe_admin`), plus en clair. L'ancien projet n'en avait aucun : il n'y a rien à déplacer.
- **Le Panthéon public** (décision du 12/11) affiche le pseudo, l'établissement s'il est connu, le score et la date ; la classe n'est plus renvoyée par `lagon_pantheon_top`. L'établissement vient de la salle, donné par l'enseignant·e : `lagon_proposer_pantheon` n'a plus de paramètre `p_lycee`, et `lagon_definir_etablissement` met à jour les tortues de la classe.
- **Petits durcissements** : le secret d'une salle et le code Panthéon sont tirés par `gen_random_bytes` (le code Panthéon sans biais) ; la taille des paramètres est bornée (couleur, nouveauté, scores, jetons).

**La page** (`js/db.js`) reconnaît toute seule la forme de la base au premier appel (`lagon_heure_serveur` existe ou non). Elle marche donc avec l'ancien projet comme avec la base unique : **la bascule ne change que l'adresse et la clé de `js/config.js`**, et le retour en arrière aussi.

## Le jour du déménagement (option C du plan : on repart de zéro, avec le Panthéon et les compteurs)

Les salles, les joueurs, les programmes et les scores **ne sont pas déplacés** : les salles finies seraient de toute façon effacées par le ménage (7 à 60 jours), et les codes de session ne servent plus une fois la salle finie. Il faut donc **un moment sans salle en cours** (ni séance, ni devoir ouvert), que l'enseignant confirme.

| Étape | Qui | Quoi |
|---|---|---|
| 1 | enseignant | voit le SQL exact de `0002-base-unique.sql` et l'accepte |
| 2 | chef d'orchestre | applique `0002` à la base unique (`apply_migration`, nom `lagon_0002_base_unique`). Rien ne change pour les élèves : les tables sont vides, la page utilise encore l'ancien projet |
| 3 | Gardien | vérifie (requêtes ci-dessous, conseillers) et l'inscrit au journal |
| 4 | enseignant | confirme qu'aucune salle n'est en cours, et ne crée plus de salle jusqu'à la fin |
| 5 | enseignant | **exporte** dans l'ancien projet « Lagon Arena » (Table Editor, schéma `public`) les tables `pantheon` et `compteurs`, en CSV ; puis les **importe** dans la base unique (Table Editor, schéma `lagon`, la même table, « Insert », « Import data from CSV ») en vérifiant que les colonnes correspondent une à une ; puis **supprime les deux fichiers** de l'ordinateur et de la corbeille (ils contiennent les programmes et les codes Panthéon des élèves) |
| 6 | chef d'orchestre | vérifie, sans lire de valeur : `select count(*) from lagon.pantheon;` (attendu : le même nombre que `select count(*) from public.pantheon;` dans l'ancien projet, 4 le 10/11) et `select count(*) from lagon.compteurs;` (4) |
| 7 | enseignant, puis chef d'orchestre | `0003-pantheon-importe.sql` : vu, accepté, appliqué (`lagon_0003_pantheon_importe`) |
| 8 | Gardien | publie la bascule : `js/config.js` prend l'adresse et la clé « publishable » de la base unique (branche `atelier/t42-lagon-bascule`) |
| 9 | enseignant | essaie : créer une salle, la rejoindre depuis un autre appareil, jouer une manche, voir le Panthéon. « Mes salles » oublie les anciennes salles quand il les ouvre (« Salle introuvable ») |
| 10 | 30 jours plus tard | une migration montrée à l'enseignant retire les objets de Lagon Arena de l'ancien projet, sans toucher aux objets `guilde_*` (n° 9 du plan) ; la page perd alors sa compatibilité avec l'ancienne forme |

Les compteurs ne sont pas des données d'élèves : ce sont les nombres publics de l'accueil. Si l'enseignant préfère, le chef d'orchestre peut les recopier à sa place par un petit `insert` montré avant (4 lignes).

## Vérifier, par les métadonnées seulement

Après `0002` (et de nouveau après `0003`), dans la base unique :

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

- **Avant la bascule de la page** : `0003-pantheon-importe-inverse.sql`, puis `0002-base-unique-inverse.sql`. Sans risque : l'original du Panthéon est resté dans l'ancien projet.
- **Après la bascule** : republier l'ancienne `js/config.js` (l'adresse et la clé de l'ancien projet) ; la page reconnaît l'ancienne forme toute seule. L'ancien projet est resté intact pendant 30 jours. Ce qui a été joué entre-temps dans la base unique n'est pas repris. `0002-base-unique-inverse.sql` n'est pas nécessaire ; il refuse d'ailleurs de passer tant qu'une salle existe dans `lagon.salles`, pour ne rien effacer par erreur.

## L'essai local

Les fichiers ont été essayés le 13/11 sur une reproduction locale de la base unique (PostgreSQL 17, rôles de Supabase, socle `0001` à `0003` du site, **données inventées**), jamais sur la base en ligne :

- `0002` comme `apply_migration` puis dans l'éditeur SQL, relancé sans effet ; rien ne change hors du schéma `lagon` et des fonctions `lagon_` ;
- une séance jouée en `anon` par les seules fonctions : 35 élèves (plus de plafond), codes de session, visibilité des programmes avant et après le brawl, scores, Panthéon automatique et proposé, établissement de la salle, administration (empreinte bcrypt), ménage ;
- l'import imité (un CSV inventé, avec des cases vides en texte vide), puis `0003`, relancé sans effet ; un ancien code Panthéon reste accepté ; la nouvelle tortue prend l'identifiant suivant ;
- les inverses et l'aller-retour (on retrouve exactement l'état d'avant, puis celui d'après) ; les garde-fous (ancien projet, schéma ou fonction venus d'ailleurs, autre rôle) ;
- `supabase.sql` dans un projet neuf donne exactement les mêmes objets que `0002` + `0003` ;
- **188 contrôles, 0 échec** ;
- puis les parcours de la page dans le navigateur (`outils/tests`, Playwright), contre un PostgREST local : **18 / 18** avec la nouvelle forme de la base, **18 / 18** avec l'ancienne (le `supabase.sql` d'avant), et en mode démo.
