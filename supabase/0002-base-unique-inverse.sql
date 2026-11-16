begin;
-- =============================================================================
--  Lagon Arena, inverse de la migration 0002 (le déménagement dans la base unique)
--  Projet Supabase cukahpyqkljiddmimpyi (« Babash - applications »)
--  Nom de migration : lagon_0002_base_unique_inverse
-- =============================================================================
--  ATTENTION : CE FICHIER EFFACE TOUT CE QUE LAGON ARENA A DANS LA BASE UNIQUE
--  (le schéma lagon, ses neuf tables et leurs lignes, et les trente fonctions
--  public.lagon_…). Il ne touche à rien d'autre.
--
--  Quand s'en servir :
--   - AVANT la bascule de la page (la page publiée utilise encore l'ancien
--     projet) : sans risque. Les tables sont vides, ou ne contiennent que la
--     copie du Panthéon et des compteurs : l'original reste dans l'ancien projet.
--   - APRÈS la bascule : pour revenir en arrière, il suffit de republier
--     l'ancienne page (LISEZMOI.md, « Revenir en arrière ») ; l'ancien projet
--     reste intact pendant 30 jours. Ce fichier n'est pas nécessaire, et il
--     effacerait les salles, les joueurs et les tortues créés depuis la bascule.
--     C'est pourquoi il s'arrête s'il trouve une salle dans lagon.salles.
--     Pour l'appliquer quand même : exporter d'abord ce qui doit être gardé
--     (règle M8), vider la table des salles dans l'éditeur SQL
--     (delete from lagon.salles;), puis relancer ce fichier.
--
--  Il ne change rien dans l'ancien projet gkyvaugipddjqjvvpopw, ni dans le
--  schéma commun, ni dans aucune autre application.
-- =============================================================================

do $$
begin
  if current_user <> 'postgres' then
    raise exception 'À lancer en postgres (éditeur SQL de Supabase ou apply_migration), pas en % : arrêt, rien n''a été modifié.', current_user;
  end if;
  if to_regnamespace('lagon') is null and not exists (select 1 from pg_catalog.pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'lagon\_%') then
    raise exception 'Rien à défaire : le schéma lagon et les fonctions public.lagon_… n''existent pas. Arrêt, rien n''a été modifié.';
  end if;
  if to_regnamespace('lagon') is not null
     and coalesce(obj_description(to_regnamespace('lagon'), 'pg_namespace'), '') not like 'Lagon Arena%' then
    raise exception 'Le schéma lagon ne vient pas de la migration 0002 : arrêt, rien n''a été modifié.';
  end if;
  if to_regclass('lagon.salles') is not null and exists (select 1 from lagon.salles) then
    raise exception 'Des salles existent dans lagon.salles : la page a déjà basculé vers la base unique, et ce fichier les effacerait. Pour revenir en arrière, republiez l''ancienne page (LISEZMOI.md). Arrêt, rien n''a été modifié.';
  end if;
end $$;

drop function if exists public.lagon_heure_serveur();
drop function if exists public.lagon_statistiques();
drop function if exists public.lagon_creer_salle(text);
drop function if exists public.lagon_piloter_salle(text, text, int, text, int, int, text, text[]);
drop function if exists public.lagon_retirer_joueur(text, text, text);
drop function if exists public.lagon_definir_config(text, text, jsonb);
drop function if exists public.lagon_definir_etablissement(text, text, text);
drop function if exists public.lagon_liberer_pseudo(text, text, text);
drop function if exists public.lagon_codes_session(text, text);
drop function if exists public.lagon_codes_manche(text, text, int);
drop function if exists public.lagon_enregistrer_scores(text, text, int, jsonb);
drop function if exists public.lagon_salle(text);
drop function if exists public.lagon_joueurs(text);
drop function if exists public.lagon_scores(text);
drop function if exists public.lagon_programmes(text);
drop function if exists public.lagon_etat_depots(text, int);
drop function if exists public.lagon_rejoindre(text, text, text, text);
drop function if exists public.lagon_deposer_tortue(text, text, text, int, text);
drop function if exists public.lagon_changer_jeton(text, text, text, text);
drop function if exists public.lagon_ma_tortue(text, text, text);
drop function if exists public.lagon_retrouver_session(text);
drop function if exists public.lagon_proposer_pantheon(text, text, numeric, int, text, text, text);
drop function if exists public.lagon_pantheon_top(int, text);
drop function if exists public.lagon_pantheon_lycees();
drop function if exists public.lagon_ma_tortue_pantheon(text);
drop function if exists public.lagon_pantheon_classe(text, text, int, jsonb);
drop function if exists public.lagon_mon_entree_pantheon(text, text, text);
drop function if exists public.lagon_pantheon_admin(text);
drop function if exists public.lagon_pantheon_valider(text, bigint, numeric);
drop function if exists public.lagon_pantheon_retirer(text, bigint);

-- le schéma, ses tables (et leurs lignes), ses index, sa séquence et ses fonctions internes
drop schema if exists lagon cascade;

do $$
begin
  if to_regnamespace('lagon') is not null
     or exists (select 1 from pg_catalog.pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'lagon\_%') then
    raise exception 'Il reste un objet de Lagon Arena : arrêt, rien n''a été modifié.';
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
