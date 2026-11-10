-- Lagon Arena · inverse de la migration 0001 (le Panthéon automatique)
-- Remet la base comme avant : plus de pantheon_classe, et pantheon_admin sans la colonne manche
-- (sa version de la migration pantheon_classe_et_date). Aucune donnée n'est touchée : les tortues déjà
-- entrées au Panthéon par la classe y restent. La page continue de marcher (elle affiche alors
-- « Panthéon automatique : bientôt disponible »).

begin;

drop function if exists public.pantheon_classe(text, text, int, jsonb);

drop function if exists public.pantheon_admin(text);
create or replace function public.pantheon_admin(p_secret text)
returns table (id bigint, pseudo text, lycee text, salle text, moyenne numeric, banc int, code text, verifie boolean, cree_le timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform verifier_admin(p_secret);
  return query select p.id, p.pseudo, p.lycee, p.salle, p.moyenne, p.banc, p.code, p.verifie, p.cree_le
    from pantheon p order by p.moyenne desc, p.cree_le limit 1000;
end $$;
grant execute on function public.pantheon_admin(text) to anon, authenticated;

commit;
