-- =====================================================================
--  Lagon Arena — base de données Supabase
--  À copier-coller tel quel dans Supabase > SQL Editor > New query > Run.
--  On peut le relancer sans risque (il recrée les fonctions).
--
--  Principe de sécurité :
--   * tout le monde peut LIRE les salles, les joueurs et les scores ;
--   * le code des tortues n'est lisible qu'une fois le brawl lancé (pas de copie
--     pendant la phase de programmation) ;
--   * on ne peut ÉCRIRE que par des fonctions qui vérifient un jeton secret :
--     le jeton « prof » (donné à la création de la salle) ou le jeton de l'élève.
-- =====================================================================

create table if not exists public.salles (
  code        text primary key,
  cree_le     timestamptz not null default now(),
  manche      int  not null default 0,
  phase       text not null default 'attente' check (phase in ('attente', 'prog', 'brawl', 'resultats', 'fin')),
  fin_chrono  timestamptz,
  graine      int  not null default 1,
  nouveaute   text not null default 'calme',
  duel        text[],
  maj         timestamptz not null default now()
);
create table if not exists public.salles_secret (
  code   text primary key references public.salles (code) on delete cascade,
  secret text not null
);
create table if not exists public.joueurs (
  salle      text not null references public.salles (code) on delete cascade,
  pseudo     text not null,
  couleur    text not null,
  rejoint_le timestamptz not null default now(),
  primary key (salle, pseudo)
);
create table if not exists public.joueurs_secret (
  salle  text not null,
  pseudo text not null,
  jeton  text not null,
  primary key (salle, pseudo),
  foreign key (salle, pseudo) references public.joueurs (salle, pseudo) on delete cascade
);
create table if not exists public.tortues (
  salle     text not null,
  pseudo    text not null,
  manche    int  not null,
  code      text not null,
  depose_le timestamptz not null default now(),
  primary key (salle, pseudo, manche),
  foreign key (salle, pseudo) references public.joueurs (salle, pseudo) on delete cascade
);
create table if not exists public.scores (
  salle  text not null references public.salles (code) on delete cascade,
  manche int  not null,
  pseudo text not null,
  nids   int  not null,
  rang   int  not null,
  points int  not null,
  bonus  int  not null default 0,
  nouveaute text not null default 'calme',   -- la nouveauté jouée (pour rejouer le match)
  duel   boolean not null default false,     -- manche « duel des champions » (hors classement)
  primary key (salle, manche, pseudo)
);
-- (mise à jour d'une installation plus ancienne : on ajoute les colonnes manquantes)
alter table public.scores add column if not exists nouveaute text not null default 'calme';
alter table public.scores add column if not exists duel boolean not null default false;

-- ---------- droits de lecture (Row Level Security) ----------
alter table public.salles         enable row level security;
alter table public.salles_secret  enable row level security;
alter table public.joueurs        enable row level security;
alter table public.joueurs_secret enable row level security;
alter table public.tortues        enable row level security;
alter table public.scores         enable row level security;

drop policy if exists lecture on public.salles;
create policy lecture on public.salles for select using (true);
drop policy if exists lecture on public.joueurs;
create policy lecture on public.joueurs for select using (true);
drop policy if exists lecture on public.scores;
create policy lecture on public.scores for select using (true);
drop policy if exists lecture on public.tortues;
create policy lecture on public.tortues for select using (
  exists (select 1 from public.salles s
          where s.code = tortues.salle
            and (s.manche > tortues.manche
                 or (s.manche = tortues.manche and s.phase in ('brawl', 'resultats', 'fin'))))
);
-- aucune politique sur salles_secret et joueurs_secret : personne ne peut les lire.

revoke insert, update, delete on public.salles, public.joueurs, public.tortues, public.scores from anon, authenticated;
revoke all on public.salles_secret, public.joueurs_secret from anon, authenticated;

-- ---------- fonctions ----------
create or replace function public.heure_serveur() returns timestamptz
language sql stable as $$ select now() $$;

create or replace function public.verifier_prof(p_code text, p_secret text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from salles_secret where code = p_code and secret = p_secret) then
    raise exception 'Accès refusé : cette salle appartient à un autre enseignant.';
  end if;
end $$;

create or replace function public.creer_salle() returns json
language plpgsql security definer set search_path = public as $$
declare
  lettres constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_code text; v_secret text; i int;
begin
  -- ménage : les salles de plus de 7 jours sont supprimées
  delete from salles where cree_le < now() - interval '7 days';
  loop
    v_code := '';
    for i in 1..4 loop
      v_code := v_code || substr(lettres, 1 + floor(random() * length(lettres))::int, 1);
    end loop;
    exit when not exists (select 1 from salles where code = v_code);
  end loop;
  v_secret := md5(random()::text || clock_timestamp()::text || v_code);
  insert into salles (code, graine) values (v_code, 1 + floor(random() * 1000000)::int);
  insert into salles_secret (code, secret) values (v_code, v_secret);
  return json_build_object('code', v_code, 'secret', v_secret);
end $$;

-- p_duree : nombre de secondes du chrono (null = ne pas toucher au chrono)
create or replace function public.piloter_salle(p_code text, p_secret text, p_manche int, p_phase text,
                                                p_duree int, p_graine int, p_nouveaute text, p_duel text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  perform verifier_prof(p_code, p_secret);
  update salles set
    manche     = p_manche,
    phase      = p_phase,
    fin_chrono = case when p_duree is null then fin_chrono else now() + make_interval(secs => p_duree) end,
    graine     = coalesce(p_graine, graine),
    nouveaute  = coalesce(p_nouveaute, nouveaute),
    duel       = p_duel,
    maj        = now()
  where code = p_code;
end $$;

create or replace function public.retirer_joueur(p_code text, p_secret text, p_pseudo text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform verifier_prof(p_code, p_secret);
  delete from joueurs where salle = p_code and pseudo = p_pseudo;
end $$;

-- l'enseignant « débloque » un pseudo : l'élève pourra le reprendre depuis un autre appareil
create or replace function public.liberer_pseudo(p_code text, p_secret text, p_pseudo text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform verifier_prof(p_code, p_secret);
  delete from joueurs_secret where salle = p_code and pseudo = p_pseudo;
end $$;

create or replace function public.rejoindre(p_salle text, p_pseudo text, p_jeton text, p_couleur text) returns text
language plpgsql security definer set search_path = public as $$
declare v_pseudo text := btrim(p_pseudo); v_jeton text;
begin
  if not exists (select 1 from salles where code = upper(p_salle)) then
    raise exception 'Salle introuvable : vérifie le code affiché au tableau.';
  end if;
  if length(v_pseudo) < 2 or length(v_pseudo) > 14 or v_pseudo !~ '^[A-Za-z0-9À-ÿ _-]+$' then
    raise exception 'Pseudo invalide : 2 à 14 lettres ou chiffres.';
  end if;
  if length(coalesce(p_jeton, '')) < 16 then raise exception 'Jeton invalide.'; end if;
  -- on peut rejoindre une salle à tout moment (même pendant une manche)
  select jeton into v_jeton from joueurs_secret where salle = upper(p_salle) and pseudo = v_pseudo;
  if v_jeton is null then
    if exists (select 1 from joueurs where salle = upper(p_salle) and pseudo = v_pseudo) then
      -- pseudo « débloqué » par l'enseignant : l'élève le récupère (autre appareil), avec ses tortues
      insert into joueurs_secret (salle, pseudo, jeton) values (upper(p_salle), v_pseudo, p_jeton);
      update joueurs set couleur = p_couleur where salle = upper(p_salle) and pseudo = v_pseudo;
      return v_pseudo;
    end if;
    if (select count(*) from joueurs where salle = upper(p_salle)) >= 30 then
      raise exception 'La salle est pleine (30 joueurs maximum).';
    end if;
    insert into joueurs (salle, pseudo, couleur) values (upper(p_salle), v_pseudo, p_couleur);
    insert into joueurs_secret (salle, pseudo, jeton) values (upper(p_salle), v_pseudo, p_jeton);
  elsif v_jeton <> p_jeton then
    raise exception 'Ce pseudo est déjà pris dans cette salle. Si c''est le tien (autre ordinateur), demande à ton enseignant de le débloquer.';
  else
    update joueurs set couleur = p_couleur where salle = upper(p_salle) and pseudo = v_pseudo;
  end if;
  return v_pseudo;
end $$;

create or replace function public.deposer_tortue(p_salle text, p_pseudo text, p_jeton text, p_manche int, p_code text)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare s salles%rowtype;
begin
  if not exists (select 1 from joueurs_secret where salle = p_salle and pseudo = p_pseudo and jeton = p_jeton) then
    raise exception 'Joueur inconnu : reconnecte-toi à la salle.';
  end if;
  select * into s from salles where code = p_salle;
  if s.phase <> 'prog' or s.manche <> p_manche then
    raise exception 'Trop tard : la programmation de cette manche est terminée.';
  end if;
  if s.fin_chrono is not null and now() > s.fin_chrono + interval '10 seconds' then
    raise exception 'Trop tard : le chrono est terminé.';
  end if;
  if s.duel is not null and not (p_pseudo = any (s.duel)) then
    raise exception 'Seuls les finalistes jouent le duel : regarde le match au tableau !';
  end if;
  if length(p_code) > 4000 then raise exception 'Programme trop long.'; end if;
  insert into tortues (salle, pseudo, manche, code) values (p_salle, p_pseudo, p_manche, p_code)
  on conflict (salle, pseudo, manche) do update set code = excluded.code, depose_le = now();
  return now();
end $$;

-- qui a verrouillé sa tortue (sans montrer le code)
create or replace function public.etat_depots(p_salle text, p_manche int)
returns table (pseudo text, depose_le timestamptz)
language sql security definer set search_path = public as $$
  select t.pseudo, t.depose_le from tortues t where t.salle = p_salle and t.manche = p_manche
$$;

-- p_scores : [{"pseudo": "...", "nids": 3, "rang": 1, "points": 25, "bonus": 3, "nouveaute": "calme", "duel": false}, ...]
create or replace function public.enregistrer_scores(p_code text, p_secret text, p_manche int, p_scores jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform verifier_prof(p_code, p_secret);
  delete from scores where salle = p_code and manche = p_manche;
  insert into scores (salle, manche, pseudo, nids, rang, points, bonus, nouveaute, duel)
  select p_code, p_manche, left(x->>'pseudo', 20), (x->>'nids')::int, (x->>'rang')::int, (x->>'points')::int,
         coalesce((x->>'bonus')::int, 0), coalesce(left(x->>'nouveaute', 20), 'calme'), coalesce((x->>'duel')::boolean, false)
  from jsonb_array_elements(p_scores) as x;
end $$;

revoke execute on function public.verifier_prof(text, text) from public, anon, authenticated;
grant execute on function public.heure_serveur(), public.creer_salle(),
  public.piloter_salle(text, text, int, text, int, int, text, text[]),
  public.retirer_joueur(text, text, text), public.liberer_pseudo(text, text, text), public.rejoindre(text, text, text, text),
  public.deposer_tortue(text, text, text, int, text), public.etat_depots(text, int),
  public.enregistrer_scores(text, text, int, jsonb)
to anon, authenticated;
