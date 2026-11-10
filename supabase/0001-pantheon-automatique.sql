-- Lagon Arena · migration 0001 : le Panthéon automatique
-- Projet Supabase « Lagon Arena » (gkyvaugipddjqjvvpopw). Appliquée par apply_migration sous le nom
-- lagon_0001_pantheon_automatique (sans les lignes begin; et commit;). Inverse : 0001-pantheon-automatique-inverse.sql
--
-- Ce qu'elle fait :
--   • crée pantheon_classe(code, secret, manche, entrées) : à la fin d'une manche, le navigateur de
--     l'enseignant·e inscrit au Panthéon la ou les meilleures tortues de la classe (au plus 3) ;
--     elle garde ensuite seulement les 1 000 meilleures tortues du Panthéon (décision du 10/11) ;
--   • recrée pantheon_admin(secret) avec une colonne de plus, la manche (DROP puis CREATE :
--     le type du résultat change ; aucune donnée n'est touchée).
-- Prérequis (déjà en production le 10/11) : pantheon.salle, pantheon.manche, nouveau_jeton_pantheon(),
-- verifier_prof(), verifier_admin().

begin;

-- le PANTHÉON AUTOMATIQUE : à la fin d'une manche, le navigateur de l'enseignant inscrit la ou les
-- meilleures tortues de la classe (au plus 3), avec la moyenne qu'il a calculée sur le banc d'essai.
-- p_entrees : [{"pseudo": "Maki", "code": "def tour(): …", "moyenne": 4.35, "banc": 1}, …]
-- Le code doit être une tortue vraiment envoyée par cet élève dans cette salle.
-- Doublons : même programme déjà au Panthéon → rien ; même élève (même salle, même pseudo) → remplacée si meilleure.
-- Chaque entrée nouvelle reçoit un code Panthéon : l'élève le retrouve avec son jeton de session (mon_entree_pantheon).
create or replace function public.pantheon_classe(p_code text, p_secret text, p_manche int, p_entrees jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  x jsonb; v_pseudo text; v_src text; v_moy numeric; v_emp text; v_lycee text;
  v pantheon%rowtype; d pantheon%rowtype; v_id bigint; v_statut text;
  v_faits jsonb := '[]'::jsonb; v_res jsonb := '[]'::jsonb;
begin
  perform verifier_prof(p_code, p_secret);
  if jsonb_typeof(p_entrees) is distinct from 'array' or jsonb_array_length(p_entrees) > 3 then
    raise exception 'Trois tortues au plus par manche.';
  end if;
  select s.etablissement into v_lycee from salles s where s.code = p_code;
  for x in select * from jsonb_array_elements(p_entrees) loop
    v_pseudo := x->>'pseudo'; v_src := x->>'code'; v_moy := round((x->>'moyenne')::numeric, 2);
    v_id := null; v_statut := null;
    if (x->>'banc')::int is distinct from 1 then raise exception 'Votre page est trop ancienne : rechargez-la (Ctrl+F5).'; end if;
    if v_moy is null or v_moy < 0 or v_moy > 30 then raise exception 'Moyenne impossible.'; end if;
    if not exists (select 1 from tortues t where t.salle = p_code and t.pseudo = v_pseudo and t.manche <= p_manche and t.code = v_src) then
      v_statut := 'inconnue';
    else
      v_emp := md5(regexp_replace(regexp_replace(v_src, '#[^\n]*', '', 'g'), '\s+', '', 'g'));
      select * into v from pantheon p where p.salle = p_code and lower(p.pseudo) = lower(v_pseudo) order by p.moyenne desc limit 1;
      select * into d from pantheon p where p.empreinte = v_emp;
      if d.id is not null then
        -- même programme déjà au Panthéon : celui de cet élève, ou une copie
        v_statut := case when d.salle = p_code and lower(d.pseudo) = lower(v_pseudo) then 'deja' else 'copie' end;
        if v_statut = 'deja' then v_id := d.id; end if;
      elsif v.id is null then
        insert into pantheon (pseudo, lycee, salle, manche, moyenne, banc, code, empreinte, jeton)
          values (v_pseudo, v_lycee, p_code, p_manche, v_moy, 1, v_src, v_emp, nouveau_jeton_pantheon()) returning id into v_id;
        v_statut := 'nouveau';
      elsif v_moy > v.moyenne then
        update pantheon set moyenne = v_moy, banc = 1, code = v_src, empreinte = v_emp, manche = p_manche, lycee = coalesce(v_lycee, lycee),
          verifie = false, maj = now() where id = v.id;
        v_id := v.id; v_statut := 'ameliore';
      else
        v_id := v.id; v_statut := 'moins_bien';
      end if;
    end if;
    v_faits := v_faits || jsonb_build_object('pseudo', v_pseudo, 'statut', v_statut, 'id', v_id);
  end loop;
  -- on ne garde que les 1000 meilleures
  delete from pantheon where id in (select p.id from pantheon p order by p.moyenne desc, p.cree_le offset 1000);
  for x in select * from jsonb_array_elements(v_faits) loop
    select * into v from pantheon p where p.id = (x->>'id')::bigint;
    v_res := v_res || jsonb_build_object('pseudo', x->>'pseudo', 'statut', x->>'statut',
      'moyenne', v.moyenne,
      'rang', case when v.id is null then null else
        (select 1 + count(*) from pantheon p where p.moyenne > v.moyenne or (p.moyenne = v.moyenne and p.cree_le < v.cree_le)) end);
  end loop;
  return v_res;
end $$;

-- l'administrateur voit aussi la manche des entrées automatiques
drop function if exists public.pantheon_admin(text);
create or replace function public.pantheon_admin(p_secret text)
returns table (id bigint, pseudo text, lycee text, salle text, manche int, moyenne numeric, banc int, code text, verifie boolean, cree_le timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform verifier_admin(p_secret);
  return query select p.id, p.pseudo, p.lycee, p.salle, p.manche, p.moyenne, p.banc, p.code, p.verifie, p.cree_le
    from pantheon p order by p.moyenne desc, p.cree_le limit 1000;
end $$;

grant execute on function public.pantheon_classe(text, text, int, jsonb), public.pantheon_admin(text) to anon, authenticated;

commit;
