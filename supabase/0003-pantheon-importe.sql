begin;
-- =============================================================================
--  Lagon Arena, migration 0003 : après l'import du Panthéon
--  Projet Supabase cukahpyqkljiddmimpyi (« Babash - applications »)
--  Nom de migration : lagon_0003_pantheon_importe
-- =============================================================================
--  Quand : le jour du déménagement, APRÈS que l'enseignant a importé lui-même,
--  depuis le tableau de bord, le Panthéon (et les compteurs de l'accueil) de
--  l'ancien projet dans lagon.pantheon (et lagon.compteurs) ; AVANT la
--  publication de la page qui utilise la base unique. Voir LISEZMOI.md,
--  « Le jour du déménagement ».
--
--  Ce que ce fichier fait, et rien d'autre :
--   - les cases vides de l'import (lycee et salle) deviennent de vraies cases
--     vides (null) : un import par CSV peut y laisser un texte vide ;
--   - le compteur des identifiants du Panthéon repart après le plus grand
--     identifiant importé : la prochaine tortue ne prendra pas un numéro déjà pris ;
--   - la colonne id redevient « generated always » : plus personne ne peut
--     choisir un identifiant (l'import seul en avait besoin).
--  Il ne lit aucune valeur pour un agent, et ne change aucune autre colonne.
--
--  Ce que ce fichier ne change pas : aucune autre table, aucune fonction, aucun
--  droit, aucune page. Il passe aussi sans import (Panthéon vide).
--
--  Le fichier peut être relancé sans effet.
--  Retour en arrière : 0003-pantheon-importe-inverse.sql. Mode d'emploi : LISEZMOI.md.
-- =============================================================================

do $$
begin
  if current_user <> 'postgres' then
    raise exception 'À lancer en postgres (éditeur SQL de Supabase ou apply_migration), pas en % : arrêt, rien n''a été modifié.', current_user;
  end if;
  if to_regclass('lagon.pantheon') is null
     or coalesce(obj_description(to_regclass('lagon.pantheon'), 'pg_class'), '') not like 'Lagon Arena.%' then
    raise exception 'La table lagon.pantheon de la migration 0002 manque (lagon_0002_base_unique) : arrêt, rien n''a été modifié.';
  end if;
  if (select count(*) from lagon.pantheon) > 1000 then
    raise exception 'Plus de 1 000 tortues dans lagon.pantheon : l''import n''est pas celui attendu. Arrêt, rien n''a été modifié.';
  end if;
end $$;

-- 1. Les cases vides laissées par l'import deviennent null.
update lagon.pantheon p set lycee = nullif(btrim(p.lycee), ''), salle = nullif(upper(btrim(p.salle)), '')
where btrim(coalesce(p.lycee, 'x')) = '' or btrim(coalesce(p.salle, 'x')) = '';

-- 2. Le compteur des identifiants repart après le plus grand identifiant importé.
select setval(pg_catalog.pg_get_serial_sequence('lagon.pantheon', 'id'),
              coalesce((select max(p.id) from lagon.pantheon p), 0) + 1, false);

-- 3. La colonne id redevient « generated always ».
alter table lagon.pantheon alter column id set generated always;

-- 4. Contrôle.
do $$
begin
  if (select a.attidentity from pg_catalog.pg_attribute a where a.attrelid = 'lagon.pantheon'::regclass and a.attname = 'id') <> 'a' then
    raise exception 'La colonne id de lagon.pantheon n''est pas « generated always » : arrêt, rien n''a été modifié.';
  end if;
  if exists (select 1 from lagon.pantheon p, lagon.pantheon_id_seq s
             where p.id >= case when s.is_called then s.last_value + 1 else s.last_value end) then
    raise exception 'Le compteur des identifiants du Panthéon n''est pas au-delà des identifiants importés : arrêt, rien n''a été modifié.';
  end if;
end $$;

commit;
