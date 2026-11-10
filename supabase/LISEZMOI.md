# Les migrations de la base de Lagon Arena

Chaque changement de la base est un fichier numéroté, avec son **inverse** (pour revenir en arrière). Le fichier contient `begin;` et `commit;` ; par `apply_migration`, on les retire et on garde le nom du fichier (`lagon_NNNN_…`). Le script complet, pour installer sa propre copie, reste `supabase.sql` à la racine : il change dans le même commit que chaque migration.

Règles communes à toutes les applications : `architecture/regles-supabase.md` (projet « Site SNT-NSI »). Le SQL exact est montré à l'enseignant·e avant d'être appliqué.

| N° | Fichier | Ce qu'elle fait | Appliquée |
|---|---|---|---|
| 0001 | `0001-pantheon-automatique.sql` (inverse : `0001-pantheon-automatique-inverse.sql`) | `pantheon_classe` (le Panthéon automatique, avec la limite des 1 000 meilleures tortues) et `pantheon_admin` avec la manche | voir le journal du projet |

**Avant ces fichiers** (appliquées par leur nom, sans fichier séparé ; leur SQL est dans `supabase.sql`) : `etablissement_facultatif`, `pantheon_classe_et_date`, `retrouver_session_par_code` (10/11), `chantier_3_codes_manche_et_entree_pantheon` (10/11).

**La suite prévue** : le déménagement dans la base unique (`0002-base-unique.sql`, plan `architecture/base-unique.md` du projet).
