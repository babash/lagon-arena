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
--     le jeton « prof » (donné à la création de la salle) ou le jeton de l'élève ;
--   * le code des tortues du Panthéon n'est jamais lisible (seulement par l'administrateur).
--
--  Ménage automatique (au plus une fois par heure, à la création d'une salle ou à l'affichage
--  de l'accueil) : séances terminées depuis 7 jours, salles jamais commencées depuis 7 jours,
--  salles sans aucune activité (enseignant ou élèves) depuis 60 jours. Les compteurs de
--  l'accueil (parties jouées, participants) sont gardés à part : le ménage ne les fait pas baisser.
--
--  Administrer le Panthéon (vérifier les scores, retirer un pseudo) : choisissez un mot de passe
--  d'au moins 12 caractères et exécutez UNE FOIS, dans le SQL Editor :
--    insert into public.admin_secret (secret) values ('votre-mot-de-passe')
--      on conflict (id) do update set secret = excluded.secret;
--  puis ouvrez pantheon.html?admin
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
alter table public.scores add column if not exists equipe int not null default 0;    -- 0 = chacun pour soi, sinon numéro d'équipe (1 = Bleue, 2 = Rouge, 3 = Verte…)
-- réglages de la manche (préparés par l'enseignant, visibles par les élèves AVANT la manche) :
--   { "mode": "solo" | "equipes", "nbEquipes": 2..6, "equipes": {"pseudo": 1..6}, "coef": 1|2|0, "bots": 8, "titre": "…" }
alter table public.salles add column if not exists config jsonb;
-- l'établissement de la classe (facultatif) : renseigné par l'enseignant en créant la salle ou le devoir.
-- La classe elle-même, c'est le code de la salle.
alter table public.salles add column if not exists etablissement text;
-- le lagon personnalisé de la manche (nombre de requins, de coraux…) : pour la rejouer à l'identique (null = lagon normal)
alter table public.scores add column if not exists lagon jsonb;

-- compteurs de l'accueil (gardés à part : le ménage des vieilles salles ne les fait pas baisser)
create table if not exists public.compteurs (
  nom    text primary key,
  valeur bigint not null default 0,
  maj    timestamptz not null default now()
);
-- première installation : on part de ce qui existe déjà
insert into public.compteurs (nom, valeur) select 'parties', count(*) from (select distinct salle, manche from public.scores) x on conflict (nom) do nothing;
insert into public.compteurs (nom, valeur) select 'participants', count(*) from public.joueurs on conflict (nom) do nothing;
insert into public.compteurs (nom, valeur) select 'salles', count(*) from public.salles on conflict (nom) do nothing;

-- le PANTHÉON : les meilleures tortues de tous les temps (moyenne de nids sur le banc d'essai :
-- 20 parties « chacun pour soi » contre les 5 tortues d'entraînement, toujours les mêmes lagons)
create table if not exists public.pantheon (
  id        bigint generated always as identity primary key,
  pseudo    text not null,
  lycee     text,                                 -- l'établissement (facultatif ; celui de la salle si elle vient d'une classe)
  moyenne   numeric(5,2) not null,
  banc      int not null default 1,               -- version du banc d'essai
  code      text not null,                        -- jamais lisible par le public
  empreinte text not null,                        -- md5 du code sans commentaires ni espaces : pas deux fois la même tortue
  jeton     text not null,                        -- le « code Panthéon » de l'élève : pour améliorer sa tortue plus tard
  verifie   boolean not null default false,       -- score recalculé par l'administrateur
  cree_le   timestamptz not null default now(),
  maj       timestamptz not null default now()
);
-- la classe d'où vient la tortue : le code de la salle (null = proposée hors classe, depuis le bac à sable).
-- Le Panthéon affiche « pseudo · classe · date » : un même pseudo peut exister dans deux classes.
alter table public.pantheon add column if not exists salle text;
create unique index if not exists pantheon_empreinte on public.pantheon (empreinte);
drop index if exists public.pantheon_pseudo;   -- (ancienne règle : un pseudo unique dans tout le Panthéon)
create unique index if not exists pantheon_jeton on public.pantheon (jeton);
create index if not exists pantheon_classement on public.pantheon (moyenne desc, cree_le);
-- la manche d'où vient une entrée automatique (null = proposée par l'élève lui-même)
alter table public.pantheon add column if not exists manche int;
create index if not exists pantheon_salle on public.pantheon (salle, lower(pseudo));

-- le mot de passe de l'administrateur du Panthéon (une seule ligne, voir l'en-tête)
create table if not exists public.admin_secret (
  id     int primary key default 1 check (id = 1),
  secret text not null
);

-- ---------- droits de lecture (Row Level Security) ----------
alter table public.salles         enable row level security;
alter table public.salles_secret  enable row level security;
alter table public.joueurs        enable row level security;
alter table public.joueurs_secret enable row level security;
alter table public.tortues        enable row level security;
alter table public.scores         enable row level security;
alter table public.compteurs      enable row level security;
alter table public.pantheon       enable row level security;
alter table public.admin_secret   enable row level security;

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
-- aucune politique sur salles_secret, joueurs_secret, compteurs, pantheon et admin_secret :
-- personne ne peut les lire directement (seulement par les fonctions ci-dessous).

revoke insert, update, delete on public.salles, public.joueurs, public.tortues, public.scores from anon, authenticated;
revoke all on public.salles_secret, public.joueurs_secret, public.compteurs, public.pantheon, public.admin_secret from anon, authenticated;

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

-- ajouter n à un compteur de l'accueil
create or replace function public.compter(p_nom text, p_n int default 1) returns void
language sql security definer set search_path = public as $$
  insert into compteurs (nom, valeur) values (p_nom, p_n)
  on conflict (nom) do update set valeur = compteurs.valeur + excluded.valeur, maj = now();
$$;

-- le ménage (au plus une fois par heure)
create or replace function public.menage() returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from compteurs where nom = 'dernier_menage' and maj > now() - interval '1 hour') then return; end if;
  insert into compteurs (nom, valeur) values ('dernier_menage', 0)
  on conflict (nom) do update set valeur = compteurs.valeur + 1, maj = now();
  -- séances terminées depuis 7 jours (le temps de revoir les résultats et d'exporter le CSV)
  delete from salles where phase = 'fin' and maj < now() - interval '7 days';
  -- salles jamais commencées depuis 7 jours, où personne n'est arrivé récemment
  delete from salles s where s.manche = 0 and greatest(s.cree_le, s.maj) < now() - interval '7 days'
    and not exists (select 1 from joueurs j where j.salle = s.code and j.rejoint_le > now() - interval '7 days');
  -- salles sans aucune activité depuis 60 jours (ni l'enseignant, ni un élève qui rejoint ou envoie sa tortue)
  delete from salles s where greatest(s.cree_le, s.maj,
      coalesce((select max(t.depose_le) from tortues t where t.salle = s.code), s.cree_le),
      coalesce((select max(j.rejoint_le) from joueurs j where j.salle = s.code), s.cree_le)) < now() - interval '60 days';
end $$;

-- les chiffres de l'accueil
create or replace function public.statistiques() returns json
language plpgsql security definer set search_path = public as $$
begin
  perform menage();
  return json_build_object(
    'parties',      coalesce((select valeur from compteurs where nom = 'parties'), 0),
    'participants', coalesce((select valeur from compteurs where nom = 'participants'), 0),
    'salles',       coalesce((select valeur from compteurs where nom = 'salles'), 0),
    'pantheon',     (select count(*) from pantheon));
end $$;

-- un nom d'établissement propre (espaces resserrés), ou null s'il est vide
create or replace function public.nom_etablissement(p text) returns text
language plpgsql immutable set search_path = public as $$
declare v text := nullif(regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g'), '');
begin
  if v is not null and (length(v) > 60 or v !~ '^[A-Za-z0-9À-ÿ ''’.,()&/-]+$') then
    raise exception 'Nom d''établissement invalide : 60 caractères au plus, lettres et chiffres.';
  end if;
  return v;
end $$;

drop function if exists public.creer_salle();   -- (ancienne version, sans établissement)
create or replace function public.creer_salle(p_etablissement text default null) returns json
language plpgsql security definer set search_path = public as $$
declare
  lettres constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_code text; v_secret text; i int;
  v_etab text := nom_etablissement(p_etablissement);
begin
  perform menage();
  loop
    v_code := '';
    for i in 1..4 loop
      v_code := v_code || substr(lettres, 1 + floor(random() * length(lettres))::int, 1);
    end loop;
    exit when not exists (select 1 from salles where code = v_code);
  end loop;
  v_secret := md5(random()::text || clock_timestamp()::text || v_code);
  insert into salles (code, graine, etablissement) values (v_code, 1 + floor(random() * 1000000)::int, v_etab);
  insert into salles_secret (code, secret) values (v_code, v_secret);
  perform compter('salles');
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

-- l'enseignant prépare la manche suivante (mode, équipes, points…) : publié tout de suite aux élèves
create or replace function public.definir_config(p_code text, p_secret text, p_config jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform verifier_prof(p_code, p_secret);
  if length(coalesce(p_config::text, '')) > 20000 then raise exception 'Réglages trop longs.'; end if;
  update salles set config = p_config, maj = now() where code = p_code;
end $$;

-- l'enseignant renseigne (ou corrige, ou efface) l'établissement de la salle
create or replace function public.definir_etablissement(p_code text, p_secret text, p_etablissement text) returns text
language plpgsql security definer set search_path = public as $$
declare v text := nom_etablissement(p_etablissement);
begin
  perform verifier_prof(p_code, p_secret);
  update salles set etablissement = v, maj = now() where code = p_code;
  return v;
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
    perform compter('participants');
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

-- l'élève remplace son jeton (ex. : par celui de son « code perso », pour continuer sur un autre ordinateur)
create or replace function public.changer_jeton(p_salle text, p_pseudo text, p_ancien text, p_nouveau text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if length(coalesce(p_nouveau, '')) < 16 then raise exception 'Jeton invalide.'; end if;
  update joueurs_secret set jeton = p_nouveau where salle = upper(p_salle) and pseudo = p_pseudo and jeton = p_ancien;
  if not found then raise exception 'Joueur inconnu : reconnecte-toi à la salle.'; end if;
end $$;

-- l'enseignant voit le code de session de chaque élève (pour le lui redonner s'il l'a oublié)
create or replace function public.codes_session(p_code text, p_secret text)
returns table (pseudo text, code text)
language plpgsql security definer set search_path = public as $$
begin
  perform verifier_prof(p_code, p_secret);
  return query select j.pseudo, case when j.jeton ~ '^perso-[A-Z0-9]{8}-lagon$' then substr(j.jeton, 7, 8) else null end
    from joueurs_secret j where j.salle = p_code order by j.pseudo;
end $$;

-- la dernière tortue envoyée par l'élève (même celle de la manche en cours) : pour la retrouver sur un autre ordinateur
create or replace function public.ma_tortue(p_salle text, p_pseudo text, p_jeton text)
returns table (manche int, code text, depose_le timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from joueurs_secret j where j.salle = p_salle and j.pseudo = p_pseudo and j.jeton = p_jeton) then
    raise exception 'Joueur inconnu : reconnecte-toi à la salle.';
  end if;
  return query select t.manche, t.code, t.depose_le from tortues t
    where t.salle = p_salle and t.pseudo = p_pseudo order by t.manche desc limit 1;
end $$;

-- l'enseignant voit la DERNIÈRE tortue envoyée par chaque élève (manche <= p_manche),
-- même pendant la programmation. Le public, lui, ne voit toujours rien avant le brawl.
create or replace function public.codes_manche(p_code text, p_secret text, p_manche int)
returns table (pseudo text, manche int, code text, depose_le timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform verifier_prof(p_code, p_secret);
  return query select distinct on (t.pseudo) t.pseudo, t.manche, t.code, t.depose_le from tortues t
    where t.salle = p_code and t.manche <= p_manche order by t.pseudo, t.manche desc;
end $$;

-- qui a verrouillé sa tortue (sans montrer le code)
create or replace function public.etat_depots(p_salle text, p_manche int)
returns table (pseudo text, depose_le timestamptz)
language sql security definer set search_path = public as $$
  select t.pseudo, t.depose_le from tortues t where t.salle = p_salle and t.manche = p_manche
$$;

-- p_scores : [{"pseudo": "...", "nids": 3, "rang": 1, "points": 25, "bonus": 3, "nouveaute": "calme|v2", "duel": false,
--             "equipe": 0, "lagon": {"requins": 4, …} (facultatif)}, ...]
create or replace function public.enregistrer_scores(p_code text, p_secret text, p_manche int, p_scores jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_nouvelle boolean;
begin
  perform verifier_prof(p_code, p_secret);
  v_nouvelle := not exists (select 1 from scores where salle = p_code and manche = p_manche);
  delete from scores where salle = p_code and manche = p_manche;
  insert into scores (salle, manche, pseudo, nids, rang, points, bonus, nouveaute, duel, equipe, lagon)
  select p_code, p_manche, left(x->>'pseudo', 20), (x->>'nids')::int, (x->>'rang')::int, (x->>'points')::int,
         coalesce((x->>'bonus')::int, 0), coalesce(left(x->>'nouveaute', 20), 'calme'), coalesce((x->>'duel')::boolean, false),
         coalesce((x->>'equipe')::int, 0),
         case when jsonb_typeof(x->'lagon') = 'object' and length((x->'lagon')::text) <= 500 then x->'lagon' end
  from jsonb_array_elements(p_scores) as x;
  if v_nouvelle and jsonb_array_length(p_scores) > 0 then perform compter('parties'); end if;
end $$;

-- ---------- le Panthéon ----------
-- l'élève propose sa tortue, avec la moyenne calculée par son navigateur sur le banc d'essai.
-- p_jeton : son « code Panthéon » (s'il a déjà une tortue au Panthéon, elle est remplacée si la nouvelle fait mieux).
-- proposer sa tortue. Depuis une salle, l'élève donne aussi son jeton de session (p_salle, p_jeton_salle) :
-- sa tortue est alors rattachée à sa classe, avec le pseudo de la salle et l'établissement donné par l'enseignant.
drop function if exists public.proposer_pantheon(text, text, text, numeric, int, text);   -- (ancienne version, sans la classe)
create or replace function public.proposer_pantheon(p_pseudo text, p_lycee text, p_code text, p_moyenne numeric, p_banc int, p_jeton text,
  p_salle text default null, p_jeton_salle text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_pseudo text := btrim(p_pseudo);
  v_lycee text := nom_etablissement(p_lycee);
  v_salle text := nullif(upper(btrim(coalesce(p_salle, ''))), '');
  v_empreinte text;
  v pantheon%rowtype;
  v_id bigint; v_statut text;
begin
  if p_banc is distinct from 1 then raise exception 'Ta page est trop ancienne : recharge-la (Ctrl+F5).'; end if;
  if length(v_pseudo) < 2 or length(v_pseudo) > 14 or v_pseudo !~ '^[A-Za-z0-9À-ÿ _-]+$' then
    raise exception 'Pseudo invalide : 2 à 14 lettres ou chiffres.';
  end if;
  if v_salle is not null then
    if not exists (select 1 from joueurs_secret where salle = v_salle and pseudo = v_pseudo and jeton = coalesce(p_jeton_salle, '')) then
      raise exception 'Pour entrer au Panthéon avec ta classe, garde le pseudo de la salle %.', v_salle;
    end if;
    select etablissement into v_lycee from salles where code = v_salle;   -- l'établissement, c'est celui que l'enseignant a donné
  end if;
  if length(coalesce(p_code, '')) < 10 or length(p_code) > 4000 then raise exception 'Programme vide ou trop long.'; end if;
  if p_moyenne is null or p_moyenne < 0 or p_moyenne > 30 then raise exception 'Moyenne impossible.'; end if;
  if length(coalesce(p_jeton, '')) < 16 then raise exception 'Jeton invalide.'; end if;
  if (select count(*) from pantheon where maj > now() - interval '1 minute') >= 30 then
    raise exception 'Beaucoup de tortues arrivent en ce moment : réessaie dans une minute.';
  end if;
  v_empreinte := md5(regexp_replace(regexp_replace(p_code, '#[^\n]*', '', 'g'), '\s+', '', 'g'));
  select * into v from pantheon where jeton = p_jeton;
  -- améliorée plus tard hors de la salle (même code Panthéon, même pseudo) : elle reste rattachée à sa classe
  if v_salle is null and v.id is not null and v.salle is not null and lower(v.pseudo) = lower(v_pseudo) then
    v_salle := v.salle; v_lycee := v.lycee;
  end if;
  if exists (select 1 from pantheon where empreinte = v_empreinte and jeton <> p_jeton) then
    raise exception 'Cette tortue est déjà au Panthéon (même programme) : invente ta propre stratégie !';
  end if;
  if v.id is null then
    insert into pantheon (pseudo, lycee, salle, moyenne, banc, code, empreinte, jeton)
      values (v_pseudo, v_lycee, v_salle, round(p_moyenne, 2), p_banc, p_code, v_empreinte, p_jeton) returning id into v_id;
    v_statut := 'nouveau';
  elsif v.maj > now() - interval '10 seconds' then
    raise exception 'Doucement : attends quelques secondes avant de reproposer ta tortue.';
  elsif round(p_moyenne, 2) > v.moyenne then
    update pantheon set pseudo = v_pseudo, lycee = v_lycee, salle = v_salle, moyenne = round(p_moyenne, 2), banc = p_banc, code = p_code,
      empreinte = v_empreinte, verifie = false, maj = now() where id = v.id;
    v_id := v.id; v_statut := 'ameliore';
  else
    update pantheon set pseudo = v_pseudo, lycee = v_lycee, salle = v_salle, maj = now() where id = v.id;
    v_id := v.id; v_statut := 'moins_bien';
  end if;
  -- on ne garde que les 1000 meilleures
  delete from pantheon where id in (select id from pantheon order by moyenne desc, cree_le offset 1000);
  return json_build_object('statut', v_statut,
    'moyenne', (select moyenne from pantheon where id = v_id),
    'rang', (select 1 + count(*) from pantheon p, pantheon m where m.id = v_id
              and (p.moyenne > m.moyenne or (p.moyenne = m.moyenne and p.cree_le < m.cree_le))));
end $$;

-- le classement public (sans le code) : tout le Panthéon, ou un seul établissement ;
-- chaque ligne : pseudo, classe (code de la salle), date d'entrée, établissement, moyenne
drop function if exists public.pantheon_top(int, text);   -- (le résultat a changé : on recrée la fonction)
create or replace function public.pantheon_top(p_limite int default 100, p_lycee text default null)
returns table (rang bigint, pseudo text, lycee text, salle text, moyenne numeric, verifie boolean, cree_le timestamptz)
language sql security definer set search_path = public as $$
  select * from (
    select row_number() over (order by p.moyenne desc, p.cree_le) as rang, p.pseudo, p.lycee, p.salle, p.moyenne, p.verifie, p.cree_le
    from pantheon p) x
  where p_lycee is null or lower(x.lycee) = lower(btrim(p_lycee))
  order by x.rang limit least(greatest(coalesce(p_limite, 100), 1), 1000)
$$;

-- les établissements déjà inscrits (pour proposer leur nom et filtrer le classement)
create or replace function public.pantheon_lycees()
returns table (lycee text, tortues bigint)
language sql security definer set search_path = public as $$
  select min(p.lycee), count(*) from pantheon p where p.lycee is not null group by lower(p.lycee) order by 2 desc, 1 limit 300
$$;

-- ma tortue au Panthéon (avec mon code Panthéon)
drop function if exists public.ma_tortue_pantheon(text);
create or replace function public.ma_tortue_pantheon(p_jeton text)
returns table (pseudo text, lycee text, salle text, cree_le timestamptz, moyenne numeric, verifie boolean, rang bigint)
language sql security definer set search_path = public as $$
  select m.pseudo, m.lycee, m.salle, m.cree_le, m.moyenne, m.verifie,
         (select 1 + count(*) from pantheon p where p.moyenne > m.moyenne or (p.moyenne = m.moyenne and p.cree_le < m.cree_le))
  from pantheon m where m.jeton = p_jeton
$$;

-- un code Panthéon tiré au hasard (8 caractères faciles à recopier, comme les codes de session)
create or replace function public.nouveau_jeton_pantheon() returns text
language plpgsql set search_path = public as $$
declare a text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; c text := '';
begin
  for i in 1..8 loop c := c || substr(a, 1 + floor(random() * length(a))::int, 1); end loop;
  return 'pantheon-' || c || '-lagon';
end $$;

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

-- l'élève retrouve SA tortue de la classe au Panthéon (et son code Panthéon) avec son jeton de session
create or replace function public.mon_entree_pantheon(p_salle text, p_pseudo text, p_jeton text)
returns table (pseudo text, salle text, manche int, moyenne numeric, verifie boolean, rang bigint, code text, cree_le timestamptz, maj timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from joueurs_secret j where j.salle = upper(p_salle) and j.pseudo = p_pseudo and j.jeton = p_jeton) then
    raise exception 'Joueur inconnu : reconnecte-toi à la salle.';
  end if;
  return query select m.pseudo, m.salle, m.manche, m.moyenne, m.verifie,
      (select 1 + count(*) from pantheon p where p.moyenne > m.moyenne or (p.moyenne = m.moyenne and p.cree_le < m.cree_le)),
      case when m.jeton ~ '^pantheon-[A-Z0-9]{8}-lagon$' then substr(m.jeton, 10, 8) else null end, m.cree_le, m.maj
    from pantheon m where m.salle = upper(p_salle) and lower(m.pseudo) = lower(p_pseudo)
    order by m.moyenne desc limit 1;
end $$;

-- ---------- l'administrateur du Panthéon ----------
create or replace function public.verifier_admin(p_secret text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from admin_secret where length(secret) >= 12 and secret = p_secret) then
    raise exception 'Mot de passe administrateur incorrect.';
  end if;
end $$;

drop function if exists public.pantheon_admin(text);
create or replace function public.pantheon_admin(p_secret text)
returns table (id bigint, pseudo text, lycee text, salle text, manche int, moyenne numeric, banc int, code text, verifie boolean, cree_le timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform verifier_admin(p_secret);
  return query select p.id, p.pseudo, p.lycee, p.salle, p.manche, p.moyenne, p.banc, p.code, p.verifie, p.cree_le
    from pantheon p order by p.moyenne desc, p.cree_le limit 1000;
end $$;


-- l'administrateur a recalculé le score : on le corrige et on le marque vérifié
create or replace function public.pantheon_valider(p_secret text, p_id bigint, p_moyenne numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform verifier_admin(p_secret);
  update pantheon set moyenne = round(p_moyenne, 2), verifie = true where id = p_id;
end $$;

create or replace function public.pantheon_retirer(p_secret text, p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform verifier_admin(p_secret);
  delete from pantheon where id = p_id;
end $$;

revoke execute on function public.verifier_prof(text, text), public.verifier_admin(text),
  public.compter(text, int), public.menage(), public.nom_etablissement(text), public.nouveau_jeton_pantheon() from public, anon, authenticated;
grant execute on function public.heure_serveur(), public.creer_salle(text), public.definir_etablissement(text, text, text),
  public.piloter_salle(text, text, int, text, int, int, text, text[]),
  public.retirer_joueur(text, text, text), public.liberer_pseudo(text, text, text), public.definir_config(text, text, jsonb),
  public.rejoindre(text, text, text, text),
  public.deposer_tortue(text, text, text, int, text), public.etat_depots(text, int),
  public.changer_jeton(text, text, text, text), public.ma_tortue(text, text, text), public.codes_session(text, text), public.codes_manche(text, text, int),
  public.enregistrer_scores(text, text, int, jsonb),
  public.statistiques(),
  public.proposer_pantheon(text, text, text, numeric, int, text, text, text), public.pantheon_top(int, text),
  public.pantheon_lycees(), public.ma_tortue_pantheon(text), public.pantheon_classe(text, text, int, jsonb), public.mon_entree_pantheon(text, text, text),
  public.pantheon_admin(text), public.pantheon_valider(text, bigint, numeric), public.pantheon_retirer(text, bigint)
to anon, authenticated;
