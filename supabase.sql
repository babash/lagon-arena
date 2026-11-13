-- =====================================================================
--  Lagon Arena — le script complet de la base de données (Supabase)
--  Fabriqué par outils/supabase_sql.py à partir des migrations de supabase/ :
--  ne pas le modifier à la main.
--
--  Pour installer sa propre copie : créer un projet Supabase gratuit (région Europe),
--  puis copier-coller ce fichier tel quel dans SQL Editor > New query > Run.
--  On peut le relancer sans risque : il ne crée que ce qui manque.
--  Ensuite, mettre l'adresse du projet et sa clé « publishable » dans js/config.js.
--
--  Ce qu'il crée : le schéma lagon (jamais exposé à l'API), ses 9 tables, toutes
--  avec la RLS et sans aucun droit direct, et les fonctions d'entrée public.lagon_…,
--  seules portes de la page (security definer, search_path vide, anon seul).
--  Personne ne lit ni n'écrit une table directement : la page passe par les fonctions,
--  qui vérifient le secret de la salle (enseignant·e) ou le jeton de l'élève.
--
--  Ménage automatique (au plus une fois par heure, à la création d'une salle ou à
--  l'affichage de l'accueil) : séances terminées depuis 7 jours, salles jamais commencées
--  depuis 7 jours, salles sans aucune activité depuis 60 jours. Les compteurs de l'accueil
--  sont gardés à part : le ménage ne les fait pas baisser.
--
--  Administrer le Panthéon (vérifier les scores, retirer une tortue) : choisir un mot de
--  passe d'au moins 12 caractères et lancer UNE FOIS, dans le SQL Editor :
--    select lagon.definir_mot_de_passe_admin('votre-mot-de-passe');
--  (seule son empreinte est gardée), puis ouvrir pantheon.html?admin
--
--  Règles communes des bases : architecture/regles-supabase.md (projet « Site SNT-NSI »).
-- =====================================================================
begin;

-- Garde-fou : le bon rôle, pgcrypto, et aucun objet « lagon » venu d'ailleurs.
-- Sinon, arrêt avant toute modification.
do $$
declare o text;
begin
  if current_user <> 'postgres' then
    raise exception 'À lancer en postgres (éditeur SQL de Supabase), pas en % : arrêt, rien n''a été modifié.', current_user;
  end if;
  if to_regprocedure('extensions.gen_random_bytes(integer)') is null or to_regprocedure('extensions.crypt(text, text)') is null
     or to_regprocedure('extensions.gen_salt(text, integer)') is null then
    raise exception 'L''extension pgcrypto manque dans le schéma extensions (Database > Extensions) : arrêt, rien n''a été modifié.';
  end if;
  if to_regnamespace('lagon') is not null
     and (pg_catalog.pg_get_userbyid((select nspowner from pg_catalog.pg_namespace where nspname = 'lagon')) <> 'postgres'
          or coalesce(obj_description(to_regnamespace('lagon'), 'pg_namespace'), '') not like 'Lagon Arena%') then
    raise exception 'Un schéma lagon existe déjà et ne vient pas de Lagon Arena : arrêt, rien n''a été modifié.';
  end if;
  foreach o in array array['lagon.salles', 'lagon.salles_secrets', 'lagon.joueurs', 'lagon.joueurs_jetons', 'lagon.programmes',
                           'lagon.scores', 'lagon.compteurs', 'lagon.pantheon', 'lagon.pantheon_admin'] loop
    if to_regclass(o) is not null and coalesce(obj_description(to_regclass(o), 'pg_class'), '') not like 'Lagon Arena.%' then
      raise exception '% existe déjà et ne vient pas de Lagon Arena : arrêt, rien n''a été modifié.', o;
    end if;
  end loop;
  if exists (select 1 from pg_catalog.pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'lagon\_%'
             and coalesce(obj_description(p.oid, 'pg_proc'), '') not like 'Lagon Arena%') then
    raise exception 'Une fonction public.lagon_… existe déjà et ne vient pas de Lagon Arena : arrêt, rien n''a été modifié.';
  end if;
end $$;

-- ===== d'après supabase/0002-base-unique.sql =====
-- -----------------------------------------------------------------------------
-- 1. Le schéma
-- -----------------------------------------------------------------------------
create schema if not exists lagon authorization postgres;
revoke all on schema lagon from public, anon, authenticated;
comment on schema lagon is
  'Lagon Arena (jeu de programmation de tortues en Python, NSI et SNT) : les salles, les joueurs, les programmes, les scores et le Panthéon. Jamais exposé à l''API ; aucun droit pour anon ni pour authenticated.';

-- -----------------------------------------------------------------------------
-- 2. Les tables (vides au départ), dans l'ordre des clés étrangères
-- -----------------------------------------------------------------------------
create table if not exists lagon.salles (
  code          text primary key check (code ~ '^[A-Z]{4}$'),
  cree_le       timestamptz not null default now(),
  manche        int  not null default 0,
  phase         text not null default 'attente' check (phase in ('attente', 'prog', 'brawl', 'resultats', 'fin')),
  fin_chrono    timestamptz,
  graine        int  not null default 1,
  nouveaute     text not null default 'calme',
  duel          text[],
  maj           timestamptz not null default now(),
  config        jsonb,
  etablissement text check (char_length(etablissement) <= 60)
);
comment on table lagon.salles is
  'Lagon Arena. Les salles de jeu : code (il identifie la classe), manche, phase, chrono, nouveauté, duel, réglages de la manche, établissement. Données d''élèves : non.';
comment on column lagon.salles.code is 'Le code de la salle : 4 lettres sans I ni O, projeté au tableau (public). C''est lui qui identifie la classe.';
comment on column lagon.salles.cree_le is 'La date de création de la salle.';
comment on column lagon.salles.manche is 'Le numéro de la manche en cours (0 avant la première).';
comment on column lagon.salles.phase is 'La phase de la manche : attente, prog (programmation), brawl, resultats ou fin.';
comment on column lagon.salles.fin_chrono is 'La fin du chrono de programmation (vide : pas de chrono).';
comment on column lagon.salles.graine is 'La graine du hasard de la salle : la même graine donne le même match sur tous les navigateurs.';
comment on column lagon.salles.nouveaute is 'La nouveauté de la manche (calme, plastique, tempête…).';
comment on column lagon.salles.duel is 'Les pseudos des finalistes d''un duel des champion·ne·s (vide : tout le monde joue).';
comment on column lagon.salles.maj is 'La date du dernier changement fait par l''enseignant·e (pour le ménage).';
comment on column lagon.salles.config is 'Les réglages de la manche préparée par l''enseignant·e (mode, équipes, points, titre…), en JSON, visibles par les élèves avant la manche.';
comment on column lagon.salles.etablissement is 'L''établissement de la classe, facultatif, donné par l''enseignant·e (60 caractères au plus). Il s''affiche au Panthéon.';

create table if not exists lagon.salles_secrets (
  code   text primary key references lagon.salles (code) on delete cascade,
  secret text not null check (char_length(secret) between 16 and 100)
);
comment on table lagon.salles_secrets is
  'Lagon Arena. Le secret de pilotage de chaque salle, donné à l''enseignant·e à la création (et dans son lien enseignant). Secret. Données d''élèves : non.';
comment on column lagon.salles_secrets.code is 'Le code de la salle (lagon.salles).';
comment on column lagon.salles_secrets.secret is 'Le secret de pilotage : 32 caractères hexadécimaux tirés au hasard. Il ne se lit jamais par l''API.';

create table if not exists lagon.joueurs (
  salle      text not null references lagon.salles (code) on delete cascade,
  pseudo     text not null check (char_length(pseudo) between 1 and 24),
  couleur    text not null check (char_length(couleur) <= 30),
  rejoint_le timestamptz not null default now(),
  primary key (salle, pseudo)
);
comment on table lagon.joueurs is
  'Lagon Arena. Les joueurs d''une salle : pseudo, couleur, date d''arrivée. Effacés avec leur salle (ménage : 7 jours après la fin, 60 jours sans activité). Données d''élèves : oui.';
comment on column lagon.joueurs.salle is 'Le code de la salle (lagon.salles).';
comment on column lagon.joueurs.pseudo is 'Le pseudo choisi par l''élève dans cette salle (2 à 14 lettres ou chiffres). Jamais le nom de famille.';
comment on column lagon.joueurs.couleur is 'La couleur de sa tortue (code de couleur CSS).';
comment on column lagon.joueurs.rejoint_le is 'La date où l''élève a rejoint la salle (pour le ménage).';

create table if not exists lagon.joueurs_jetons (
  salle  text not null,
  pseudo text not null,
  jeton  text not null check (char_length(jeton) between 16 and 100),
  primary key (salle, pseudo),
  foreign key (salle, pseudo) references lagon.joueurs (salle, pseudo) on delete cascade
);
create index if not exists joueurs_jetons_jeton on lagon.joueurs_jetons (jeton);
comment on table lagon.joueurs_jetons is
  'Lagon Arena. Le jeton secret de chaque joueur ; il contient son code de session (perso-K7PQ2XMA-lagon), qui suffit pour revenir depuis un autre appareil. Secret. Données d''élèves : oui.';
comment on column lagon.joueurs_jetons.salle is 'Le code de la salle.';
comment on column lagon.joueurs_jetons.pseudo is 'Le pseudo du joueur dans la salle (lagon.joueurs).';
comment on column lagon.joueurs_jetons.jeton is 'Le jeton secret : perso-CODE-lagon, où CODE est le code de session de 8 caractères (ou un jeton hexadécimal tiré par la page). Seuls l''élève et l''enseignant·e de la salle voient le code.';

create table if not exists lagon.programmes (
  salle     text not null,
  pseudo    text not null,
  manche    int  not null,
  code      text not null check (char_length(code) <= 4000),
  depose_le timestamptz not null default now(),
  primary key (salle, pseudo, manche),
  foreign key (salle, pseudo) references lagon.joueurs (salle, pseudo) on delete cascade
);
comment on table lagon.programmes is
  'Lagon Arena. Les programmes des tortues envoyés par les élèves, manche par manche (l''ancienne table tortues). Lisibles seulement après le brawl de leur manche. Données d''élèves : oui.';
comment on column lagon.programmes.salle is 'Le code de la salle.';
comment on column lagon.programmes.pseudo is 'Le pseudo de l''élève (lagon.joueurs).';
comment on column lagon.programmes.manche is 'Le numéro de la manche.';
comment on column lagon.programmes.code is 'Le programme Python de la tortue, 4 000 caractères au plus.';
comment on column lagon.programmes.depose_le is 'La date du dernier envoi.';

create table if not exists lagon.scores (
  salle     text not null references lagon.salles (code) on delete cascade,
  manche    int  not null,
  pseudo    text not null,
  nids      int  not null,
  rang      int  not null,
  points    int  not null,
  bonus     int  not null default 0,
  nouveaute text not null default 'calme',
  duel      boolean not null default false,
  equipe    int  not null default 0,
  lagon     jsonb,
  primary key (salle, manche, pseudo)
);
comment on table lagon.scores is
  'Lagon Arena. Les résultats des manches, calculés par le navigateur de l''enseignant·e : nids, rang, points, bonus, équipe. Données d''élèves : oui (pseudo).';
comment on column lagon.scores.salle is 'Le code de la salle.';
comment on column lagon.scores.manche is 'Le numéro de la manche.';
comment on column lagon.scores.pseudo is 'Le pseudo de l''élève.';
comment on column lagon.scores.nids is 'Le nombre de nids pondus pendant le brawl.';
comment on column lagon.scores.rang is 'Le rang de l''élève dans la manche.';
comment on column lagon.scores.points is 'Les points gagnés (selon le rang et le coefficient de la manche).';
comment on column lagon.scores.bonus is 'Le bonus de progression.';
comment on column lagon.scores.nouveaute is 'La nouveauté jouée, avec la version de la carte (pour rejouer le match à l''identique).';
comment on column lagon.scores.duel is 'Vrai pour une manche « duel des champion·ne·s » (hors classement).';
comment on column lagon.scores.equipe is 'Le numéro d''équipe (0 : chacun pour soi ; 1 Bleue, 2 Rouge, 3 Verte…).';
comment on column lagon.scores.lagon is 'Le lagon personnalisé de la manche (requins, coraux…), en JSON (vide : lagon normal).';

create table if not exists lagon.compteurs (
  nom    text primary key,
  valeur bigint not null default 0,
  maj    timestamptz not null default now()
);
comment on table lagon.compteurs is
  'Lagon Arena. Les nombres affichés sur l''accueil (parties jouées, participants, salles) et la date du dernier ménage, gardés à part : le ménage ne les fait pas baisser. Données d''élèves : non.';
comment on column lagon.compteurs.nom is 'Le nom du compteur : parties, participants, salles ou dernier_menage.';
comment on column lagon.compteurs.valeur is 'La valeur du compteur.';
comment on column lagon.compteurs.maj is 'La date de la dernière mise à jour (pour dernier_menage : la date du dernier ménage).';

-- (Dans le projet de l'enseignant, la colonne id a été créée « generated by default »
-- pour l'import du Panthéon, puis remise « generated always » : migrations 0002 et 0003.)
create table if not exists lagon.pantheon (
  id        bigint generated always as identity primary key,
  pseudo    text not null,
  lycee     text,
  moyenne   numeric(5,2) not null,
  banc      int not null default 1,
  code      text not null,
  empreinte text not null,
  jeton     text not null,
  verifie   boolean not null default false,
  cree_le   timestamptz not null default now(),
  maj       timestamptz not null default now(),
  salle     text,
  manche    int
);
create unique index if not exists pantheon_empreinte on lagon.pantheon (empreinte);
create unique index if not exists pantheon_jeton on lagon.pantheon (jeton);
create index if not exists pantheon_classement on lagon.pantheon (moyenne desc, cree_le);
create index if not exists pantheon_salle on lagon.pantheon (salle, lower(pseudo));
comment on table lagon.pantheon is
  'Lagon Arena. Le Panthéon : les meilleures tortues de tous les temps (1 000 au plus), jugées sur le même banc d''essai. Le public voit le pseudo, l''établissement, la moyenne et la date, jamais le programme. Données d''élèves : oui.';
comment on column lagon.pantheon.id is 'L''identifiant de la tortue au Panthéon.';
comment on column lagon.pantheon.pseudo is 'Le pseudo de l''élève (celui de la salle, ou choisi dans le bac à sable). Jamais le nom de famille.';
comment on column lagon.pantheon.lycee is 'L''établissement : celui de la salle, donné par l''enseignant·e (vide hors classe).';
comment on column lagon.pantheon.moyenne is 'Le score : le nombre moyen de nids sur les 20 lagons du banc d''essai.';
comment on column lagon.pantheon.banc is 'La version du banc d''essai.';
comment on column lagon.pantheon.code is 'Le programme Python de la tortue. Jamais lisible par le public (seulement par l''administration du Panthéon).';
comment on column lagon.pantheon.empreinte is 'Le md5 du programme sans commentaires ni espaces : pas deux fois la même tortue.';
comment on column lagon.pantheon.jeton is 'Le code Panthéon de l''élève (pantheon-K7PQ2XMA-lagon), pour améliorer sa tortue plus tard. Secret.';
comment on column lagon.pantheon.verifie is 'Vrai quand l''administration a recalculé et validé le score.';
comment on column lagon.pantheon.cree_le is 'La date d''entrée au Panthéon (affichée).';
comment on column lagon.pantheon.maj is 'La date de la dernière mise à jour.';
comment on column lagon.pantheon.salle is 'Le code de la salle d''où vient la tortue (vide : proposée hors classe, depuis le bac à sable). Il n''est pas affiché au public.';
comment on column lagon.pantheon.manche is 'La manche d''où vient une entrée automatique (vide : proposée par l''élève).';

create table if not exists lagon.pantheon_admin (
  seule_ligne boolean primary key default true check (seule_ligne),
  empreinte   text not null check (empreinte like '$2%'),
  cree_le     timestamptz not null default now()
);
comment on table lagon.pantheon_admin is
  'Lagon Arena. L''empreinte (bcrypt) du mot de passe de l''administration du Panthéon : une seule ligne, vide tant que l''enseignant n''a pas choisi de mot de passe (lagon.definir_mot_de_passe_admin). Secret. Données d''élèves : non.';
comment on column lagon.pantheon_admin.seule_ligne is 'Toujours vrai : garantit que la table n''a qu''une ligne.';
comment on column lagon.pantheon_admin.empreinte is 'L''empreinte bcrypt du mot de passe ; le mot de passe lui-même n''est gardé nulle part.';
comment on column lagon.pantheon_admin.cree_le is 'La date où le mot de passe a été choisi.';

alter table lagon.salles         enable row level security;
alter table lagon.salles_secrets enable row level security;
alter table lagon.joueurs        enable row level security;
alter table lagon.joueurs_jetons enable row level security;
alter table lagon.programmes     enable row level security;
alter table lagon.scores         enable row level security;
alter table lagon.compteurs      enable row level security;
alter table lagon.pantheon       enable row level security;
alter table lagon.pantheon_admin enable row level security;
revoke all on lagon.salles, lagon.salles_secrets, lagon.joueurs, lagon.joueurs_jetons, lagon.programmes,
  lagon.scores, lagon.compteurs, lagon.pantheon, lagon.pantheon_admin from public, anon, authenticated;
revoke all on sequence lagon.pantheon_id_seq from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Les fonctions internes : aucun droit pour personne. Seules les fonctions
--    d'entrée (security definer, propriété de postgres) les appellent.
-- -----------------------------------------------------------------------------

-- Le secret de la salle, ou une erreur.
create or replace function lagon.verifier_prof(p_code text, p_secret text)
returns void
language plpgsql stable
set search_path = ''
as $$
begin
  if not exists (select 1 from lagon.salles_secrets s where s.code = p_code and s.secret = p_secret) then
    raise exception 'Accès refusé : cette salle appartient à un autre enseignant.';
  end if;
end $$;

-- Le mot de passe de l'administration du Panthéon, comparé à son empreinte bcrypt.
create or replace function lagon.verifier_admin(p_secret text)
returns void
language plpgsql stable
set search_path = ''
as $$
begin
  if char_length(coalesce(p_secret, '')) not between 12 and 200
     or not exists (select 1 from lagon.pantheon_admin a where a.empreinte = extensions.crypt(p_secret, a.empreinte)) then
    raise exception 'Mot de passe administrateur incorrect.';
  end if;
end $$;

-- Choisir (ou changer) le mot de passe de l'administration du Panthéon.
-- À lancer par l'enseignant dans l'éditeur SQL : select lagon.definir_mot_de_passe_admin('…');
create or replace function lagon.definir_mot_de_passe_admin(p_mot text)
returns text
language plpgsql volatile
set search_path = ''
as $$
begin
  if char_length(coalesce(p_mot, '')) not between 12 and 200 then
    raise exception 'Le mot de passe doit avoir de 12 à 200 caractères.';
  end if;
  insert into lagon.pantheon_admin (seule_ligne, empreinte, cree_le)
  values (true, extensions.crypt(p_mot, extensions.gen_salt('bf', 10)), now())
  on conflict (seule_ligne) do update set empreinte = excluded.empreinte, cree_le = excluded.cree_le;
  return 'Mot de passe enregistré (en empreinte). Ouvrez pantheon.html?admin.';
end $$;

-- Ajouter n à un compteur de l'accueil.
create or replace function lagon.compter(p_nom text, p_n int default 1)
returns void
language sql volatile
set search_path = ''
as $$
  insert into lagon.compteurs as c (nom, valeur) values (p_nom, p_n)
  on conflict (nom) do update set valeur = c.valeur + excluded.valeur, maj = now();
$$;

-- Le ménage, au plus une fois par heure : séances terminées depuis 7 jours, salles
-- jamais commencées depuis 7 jours, salles sans aucune activité depuis 60 jours.
create or replace function lagon.menage()
returns void
language plpgsql volatile
set search_path = ''
as $$
begin
  if exists (select 1 from lagon.compteurs c where c.nom = 'dernier_menage' and c.maj > now() - interval '1 hour') then return; end if;
  insert into lagon.compteurs as c (nom, valeur) values ('dernier_menage', 0)
  on conflict (nom) do update set valeur = c.valeur + 1, maj = now();
  delete from lagon.salles s where s.phase = 'fin' and s.maj < now() - interval '7 days';
  delete from lagon.salles s where s.manche = 0 and greatest(s.cree_le, s.maj) < now() - interval '7 days'
    and not exists (select 1 from lagon.joueurs j where j.salle = s.code and j.rejoint_le > now() - interval '7 days');
  delete from lagon.salles s where greatest(s.cree_le, s.maj,
      coalesce((select max(t.depose_le) from lagon.programmes t where t.salle = s.code), s.cree_le),
      coalesce((select max(j.rejoint_le) from lagon.joueurs j where j.salle = s.code), s.cree_le)) < now() - interval '60 days';
end $$;

-- Un nom d'établissement propre (espaces resserrés), ou null s'il est vide.
create or replace function lagon.nom_etablissement(p text)
returns text
language plpgsql immutable
set search_path = ''
as $$
declare v text := nullif(regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g'), '');
begin
  if v is not null and (char_length(v) > 60 or v !~ '^[A-Za-z0-9À-ÿ ''’.,()&/-]+$') then
    raise exception 'Nom d''établissement invalide : 60 caractères au plus, lettres et chiffres.';
  end if;
  return v;
end $$;

-- Un code Panthéon neuf : 8 caractères faciles à recopier, tirés sans biais
-- (un octet est rejeté au-delà de 248 = 8 × 31), jamais un code déjà pris.
create or replace function lagon.nouveau_jeton_pantheon()
returns text
language plpgsql volatile
set search_path = ''
as $$
declare a constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; c text; b int;
begin
  loop
    c := '';
    while char_length(c) < 8 loop
      b := get_byte(extensions.gen_random_bytes(1), 0);
      continue when b >= 248;
      c := c || substr(a, 1 + b % 31, 1);
    end loop;
    exit when not exists (select 1 from lagon.pantheon p where p.jeton = 'pantheon-' || c || '-lagon');
  end loop;
  return 'pantheon-' || c || '-lagon';
end $$;

-- Le rang d'une moyenne au Panthéon (1 = la meilleure ; à égalité, la plus ancienne d'abord).
create or replace function lagon.rang_pantheon(p_moyenne numeric, p_cree_le timestamptz)
returns bigint
language sql stable
set search_path = ''
as $$
  select 1 + count(*) from lagon.pantheon p where p.moyenne > p_moyenne or (p.moyenne = p_moyenne and p.cree_le < p_cree_le)
$$;

revoke all on function lagon.verifier_prof(text, text), lagon.verifier_admin(text), lagon.definir_mot_de_passe_admin(text),
  lagon.compter(text, int), lagon.menage(), lagon.nom_etablissement(text), lagon.nouveau_jeton_pantheon(),
  lagon.rang_pantheon(numeric, timestamptz)
  from public, anon, authenticated;
comment on function lagon.verifier_prof(text, text) is
  'Lagon Arena, interne. Vérifie le secret de pilotage d''une salle ; sinon, erreur « Accès refusé ».';
comment on function lagon.verifier_admin(text) is
  'Lagon Arena, interne. Vérifie le mot de passe de l''administration du Panthéon contre son empreinte bcrypt ; sinon, erreur.';
comment on function lagon.definir_mot_de_passe_admin(text) is
  'Lagon Arena, pour l''enseignant dans l''éditeur SQL (aucun droit pour l''API). Enregistre l''empreinte bcrypt du mot de passe de l''administration du Panthéon (12 caractères au moins).';
comment on function lagon.compter(text, int) is
  'Lagon Arena, interne. Ajoute n à un compteur de l''accueil.';
comment on function lagon.menage() is
  'Lagon Arena, interne. Au plus une fois par heure : efface les séances terminées depuis 7 jours, les salles jamais commencées depuis 7 jours et les salles sans activité depuis 60 jours (avec leurs joueurs, programmes et scores).';
comment on function lagon.nom_etablissement(text) is
  'Lagon Arena, interne. Un nom d''établissement propre (60 caractères au plus), ou null s''il est vide.';
comment on function lagon.nouveau_jeton_pantheon() is
  'Lagon Arena, interne. Tire un code Panthéon neuf (8 caractères, sans biais) qu''aucune tortue n''a encore.';
comment on function lagon.rang_pantheon(numeric, timestamptz) is
  'Lagon Arena, interne. Le rang qu''a une moyenne au Panthéon.';

-- -----------------------------------------------------------------------------
-- 4. Les fonctions d'entrée : public, préfixe lagon_, appelables par anon seul.
--    Mêmes paramètres et mêmes réponses qu'avant, sauf ce que dit l'en-tête.
-- -----------------------------------------------------------------------------

-- ---------- l'heure et l'accueil ----------
create or replace function public.lagon_heure_serveur()
returns timestamptz
language sql stable
set search_path = ''
as $$ select now() $$;

create or replace function public.lagon_statistiques()
returns json
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  perform lagon.menage();
  return json_build_object(
    'parties',      coalesce((select c.valeur from lagon.compteurs c where c.nom = 'parties'), 0),
    'participants', coalesce((select c.valeur from lagon.compteurs c where c.nom = 'participants'), 0),
    'salles',       coalesce((select c.valeur from lagon.compteurs c where c.nom = 'salles'), 0),
    'pantheon',     (select count(*) from lagon.pantheon));
end $$;

-- ---------- l'enseignant·e : la salle ----------
create or replace function public.lagon_creer_salle(p_etablissement text default null)
returns json
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  lettres constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_code text; v_secret text; i int;
  v_etab text := lagon.nom_etablissement(left(p_etablissement, 200));
begin
  perform lagon.menage();
  loop
    v_code := '';
    for i in 1..4 loop
      v_code := v_code || substr(lettres, 1 + floor(random() * 24)::int, 1);
    end loop;
    exit when not exists (select 1 from lagon.salles s where s.code = v_code);
  end loop;
  v_secret := encode(extensions.gen_random_bytes(16), 'hex');
  insert into lagon.salles (code, graine, etablissement) values (v_code, 1 + floor(random() * 1000000)::int, v_etab);
  insert into lagon.salles_secrets (code, secret) values (v_code, v_secret);
  perform lagon.compter('salles');
  return json_build_object('code', v_code, 'secret', v_secret);
end $$;

-- p_duree : nombre de secondes du chrono (null = ne pas toucher au chrono)
create or replace function public.lagon_piloter_salle(p_code text, p_secret text, p_manche int, p_phase text,
                                                      p_duree int, p_graine int, p_nouveaute text, p_duel text[])
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  perform lagon.verifier_prof(p_code, p_secret);
  if char_length(coalesce(p_nouveaute, '')) > 40 or length(coalesce(array_to_string(p_duel, ','), '')) > 20000 then
    raise exception 'Réglages trop longs.';
  end if;
  update lagon.salles s set
    manche     = p_manche,
    phase      = p_phase,
    fin_chrono = case when p_duree is null then s.fin_chrono else now() + make_interval(secs => p_duree) end,
    graine     = coalesce(p_graine, s.graine),
    nouveaute  = coalesce(p_nouveaute, s.nouveaute),
    duel       = p_duel,
    maj        = now()
  where s.code = p_code;
end $$;

create or replace function public.lagon_retirer_joueur(p_code text, p_secret text, p_pseudo text)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  perform lagon.verifier_prof(p_code, p_secret);
  delete from lagon.joueurs j where j.salle = p_code and j.pseudo = p_pseudo;
end $$;

-- l'enseignant·e prépare la manche suivante (mode, équipes, points…) : publié tout de suite aux élèves
create or replace function public.lagon_definir_config(p_code text, p_secret text, p_config jsonb)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  perform lagon.verifier_prof(p_code, p_secret);
  if length(coalesce(p_config::text, '')) > 20000 then raise exception 'Réglages trop longs.'; end if;
  update lagon.salles s set config = p_config, maj = now() where s.code = p_code;
end $$;

-- l'enseignant·e renseigne (ou corrige, ou efface) l'établissement de la salle ;
-- les tortues de cette classe déjà au Panthéon le suivent.
create or replace function public.lagon_definir_etablissement(p_code text, p_secret text, p_etablissement text)
returns text
language plpgsql volatile security definer
set search_path = ''
as $$
declare v text := lagon.nom_etablissement(left(p_etablissement, 200)); v_cree timestamptz;
begin
  perform lagon.verifier_prof(p_code, p_secret);
  update lagon.salles s set etablissement = v, maj = now() where s.code = p_code returning s.cree_le into v_cree;
  update lagon.pantheon p set lycee = v where p.salle = p_code and p.cree_le >= v_cree;
  return v;
end $$;

-- l'enseignant·e « débloque » un pseudo : l'élève pourra le reprendre depuis un autre appareil
create or replace function public.lagon_liberer_pseudo(p_code text, p_secret text, p_pseudo text)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  perform lagon.verifier_prof(p_code, p_secret);
  delete from lagon.joueurs_jetons j where j.salle = p_code and j.pseudo = p_pseudo;
end $$;

-- l'enseignant·e voit le code de session de chaque élève (pour le lui redonner s'il l'a oublié)
create or replace function public.lagon_codes_session(p_code text, p_secret text)
returns json
language plpgsql stable security definer
set search_path = ''
as $$
begin
  perform lagon.verifier_prof(p_code, p_secret);
  return coalesce((select json_agg(json_build_object('pseudo', j.pseudo,
      'code', case when j.jeton ~ '^perso-[A-Z0-9]{8}-lagon$' then substr(j.jeton, 7, 8) end) order by j.pseudo)
    from lagon.joueurs_jetons j where j.salle = p_code), '[]'::json);
end $$;

-- l'enseignant·e voit la DERNIÈRE tortue envoyée par chaque élève (manche <= p_manche),
-- même pendant la programmation. Le public, lui, ne voit toujours rien avant le brawl.
create or replace function public.lagon_codes_manche(p_code text, p_secret text, p_manche int)
returns json
language plpgsql stable security definer
set search_path = ''
as $$
begin
  perform lagon.verifier_prof(p_code, p_secret);
  return coalesce((select json_agg(json_build_object('pseudo', d.pseudo, 'manche', d.manche, 'code', d.code, 'depose_le', d.depose_le) order by d.pseudo)
    from (select distinct on (t.pseudo) t.pseudo, t.manche, t.code, t.depose_le from lagon.programmes t
          where t.salle = p_code and t.manche <= p_manche order by t.pseudo, t.manche desc) d), '[]'::json);
end $$;

-- p_scores : [{"pseudo": "...", "nids": 3, "rang": 1, "points": 25, "bonus": 3, "nouveaute": "calme|v2", "duel": false,
--             "equipe": 0, "lagon": {"requins": 4, …} (facultatif)}, ...]
create or replace function public.lagon_enregistrer_scores(p_code text, p_secret text, p_manche int, p_scores jsonb)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare v_nouvelle boolean;
begin
  perform lagon.verifier_prof(p_code, p_secret);
  if jsonb_typeof(p_scores) is distinct from 'array' or length(p_scores::text) > 1000000 then
    raise exception 'Scores invalides.';
  end if;
  v_nouvelle := not exists (select 1 from lagon.scores s where s.salle = p_code and s.manche = p_manche);
  delete from lagon.scores s where s.salle = p_code and s.manche = p_manche;
  insert into lagon.scores (salle, manche, pseudo, nids, rang, points, bonus, nouveaute, duel, equipe, lagon)
  select p_code, p_manche, left(x->>'pseudo', 20), (x->>'nids')::int, (x->>'rang')::int, (x->>'points')::int,
         coalesce((x->>'bonus')::int, 0), coalesce(left(x->>'nouveaute', 20), 'calme'), coalesce((x->>'duel')::boolean, false),
         coalesce((x->>'equipe')::int, 0),
         case when jsonb_typeof(x->'lagon') = 'object' and length((x->'lagon')::text) <= 500 then x->'lagon' end
  from jsonb_array_elements(p_scores) as x;
  if v_nouvelle and jsonb_array_length(p_scores) > 0 then perform lagon.compter('parties'); end if;
end $$;

-- ---------- les lectures (elles remplacent la lecture publique des tables) ----------
-- la salle : son état (manche, phase, chrono, réglages, établissement), ou null
create or replace function public.lagon_salle(p_code text)
returns json
language sql stable security definer
set search_path = ''
as $$
  select to_json(s) from lagon.salles s where s.code = left(p_code, 10)
$$;

-- les joueurs de la salle (pseudo, couleur), par ordre d'arrivée
create or replace function public.lagon_joueurs(p_code text)
returns json
language sql stable security definer
set search_path = ''
as $$
  select coalesce(json_agg(json_build_object('pseudo', j.pseudo, 'couleur', j.couleur) order by j.rejoint_le, j.pseudo), '[]'::json)
  from lagon.joueurs j where j.salle = left(p_code, 10)
$$;

-- les scores de la salle, manche par manche
create or replace function public.lagon_scores(p_code text)
returns json
language sql stable security definer
set search_path = ''
as $$
  select coalesce(json_agg(to_json(s) order by s.manche, s.rang, s.pseudo), '[]'::json)
  from lagon.scores s where s.salle = left(p_code, 10)
$$;

-- les programmes de la salle, SEULEMENT après le brawl de leur manche (la règle de l'ancienne lecture publique)
create or replace function public.lagon_programmes(p_code text)
returns json
language sql stable security definer
set search_path = ''
as $$
  select coalesce(json_agg(json_build_object('pseudo', t.pseudo, 'manche', t.manche, 'code', t.code) order by t.manche, t.pseudo), '[]'::json)
  from lagon.programmes t join lagon.salles s on s.code = t.salle
  where t.salle = left(p_code, 10)
    and (s.manche > t.manche or (s.manche = t.manche and s.phase in ('brawl', 'resultats', 'fin')))
$$;

-- qui a verrouillé sa tortue (sans montrer le programme)
create or replace function public.lagon_etat_depots(p_salle text, p_manche int)
returns json
language sql stable security definer
set search_path = ''
as $$
  select coalesce(json_agg(json_build_object('pseudo', t.pseudo, 'depose_le', t.depose_le) order by t.pseudo), '[]'::json)
  from lagon.programmes t where t.salle = left(p_salle, 10) and t.manche = p_manche
$$;

-- ---------- l'élève ----------
-- rejoindre une salle (ou revenir avec le même jeton), à tout moment. Aucun plafond du nombre de joueurs.
create or replace function public.lagon_rejoindre(p_salle text, p_pseudo text, p_jeton text, p_couleur text)
returns text
language plpgsql volatile security definer
set search_path = ''
as $$
declare v_salle text := upper(left(coalesce(p_salle, ''), 10)); v_pseudo text := btrim(left(coalesce(p_pseudo, ''), 100)); v_jeton text;
begin
  if not exists (select 1 from lagon.salles s where s.code = v_salle) then
    raise exception 'Salle introuvable : vérifie le code affiché au tableau.';
  end if;
  if char_length(v_pseudo) < 2 or char_length(v_pseudo) > 14 or v_pseudo !~ '^[A-Za-z0-9À-ÿ _-]+$' then
    raise exception 'Pseudo invalide : 2 à 14 lettres ou chiffres.';
  end if;
  if char_length(coalesce(p_jeton, '')) not between 16 and 100 then raise exception 'Jeton invalide.'; end if;
  if char_length(coalesce(p_couleur, '')) > 30 then raise exception 'Couleur invalide.'; end if;
  select j.jeton into v_jeton from lagon.joueurs_jetons j where j.salle = v_salle and j.pseudo = v_pseudo;
  if v_jeton is null then
    if exists (select 1 from lagon.joueurs j where j.salle = v_salle and j.pseudo = v_pseudo) then
      -- pseudo « débloqué » par l'enseignant·e : l'élève le récupère (autre appareil), avec ses tortues
      insert into lagon.joueurs_jetons (salle, pseudo, jeton) values (v_salle, v_pseudo, p_jeton);
      update lagon.joueurs j set couleur = p_couleur where j.salle = v_salle and j.pseudo = v_pseudo;
      return v_pseudo;
    end if;
    insert into lagon.joueurs (salle, pseudo, couleur) values (v_salle, v_pseudo, p_couleur);
    insert into lagon.joueurs_jetons (salle, pseudo, jeton) values (v_salle, v_pseudo, p_jeton);
    perform lagon.compter('participants');
  elsif v_jeton <> p_jeton then
    raise exception 'Ce pseudo est déjà pris dans cette salle. Si c''est le tien (autre ordinateur), demande à ton enseignant de le débloquer.';
  else
    update lagon.joueurs j set couleur = p_couleur where j.salle = v_salle and j.pseudo = v_pseudo;
  end if;
  return v_pseudo;
end $$;

create or replace function public.lagon_deposer_tortue(p_salle text, p_pseudo text, p_jeton text, p_manche int, p_code text)
returns timestamptz
language plpgsql volatile security definer
set search_path = ''
as $$
declare s lagon.salles%rowtype;
begin
  if not exists (select 1 from lagon.joueurs_jetons j where j.salle = p_salle and j.pseudo = p_pseudo and j.jeton = p_jeton) then
    raise exception 'Joueur inconnu : reconnecte-toi à la salle.';
  end if;
  select * into s from lagon.salles x where x.code = p_salle;
  if s.phase <> 'prog' or s.manche <> p_manche then
    raise exception 'Trop tard : la programmation de cette manche est terminée.';
  end if;
  if s.fin_chrono is not null and now() > s.fin_chrono + interval '10 seconds' then
    raise exception 'Trop tard : le chrono est terminé.';
  end if;
  if s.duel is not null and not (p_pseudo = any (s.duel)) then
    raise exception 'Seuls les finalistes jouent le duel : regarde le match au tableau !';
  end if;
  if char_length(coalesce(p_code, '')) > 4000 then raise exception 'Programme trop long.'; end if;
  insert into lagon.programmes as t (salle, pseudo, manche, code) values (p_salle, p_pseudo, p_manche, coalesce(p_code, ''))
  on conflict (salle, pseudo, manche) do update set code = excluded.code, depose_le = now();
  return now();
end $$;

-- l'élève remplace son jeton (par celui de son « code de session », pour continuer sur un autre appareil)
create or replace function public.lagon_changer_jeton(p_salle text, p_pseudo text, p_ancien text, p_nouveau text)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  if char_length(coalesce(p_nouveau, '')) not between 16 and 100 then raise exception 'Jeton invalide.'; end if;
  update lagon.joueurs_jetons j set jeton = p_nouveau where j.salle = upper(left(p_salle, 10)) and j.pseudo = p_pseudo and j.jeton = p_ancien;
  if not found then raise exception 'Joueur inconnu : reconnecte-toi à la salle.'; end if;
end $$;

-- la dernière tortue envoyée par l'élève (même celle de la manche en cours) : pour la retrouver sur un autre appareil
create or replace function public.lagon_ma_tortue(p_salle text, p_pseudo text, p_jeton text)
returns table (manche int, code text, depose_le timestamptz)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from lagon.joueurs_jetons j where j.salle = p_salle and j.pseudo = p_pseudo and j.jeton = p_jeton) then
    raise exception 'Joueur inconnu : reconnecte-toi à la salle.';
  end if;
  return query select t.manche, t.code, t.depose_le from lagon.programmes t
    where t.salle = p_salle and t.pseudo = p_pseudo order by t.manche desc limit 1;
end $$;

-- l'élève revient avec son seul CODE DE SESSION (8 caractères) : on retrouve sa salle et son pseudo.
-- Le code est secret (comme un mot de passe) : sans lui, on ne peut rien retrouver.
create or replace function public.lagon_retrouver_session(p_jeton text)
returns table (salle text, pseudo text, couleur text)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if coalesce(p_jeton, '') !~ '^perso-[A-Z0-9]{8}-lagon$' then raise exception 'Code de session incorrect.'; end if;
  return query select j.salle, j.pseudo, j.couleur
    from lagon.joueurs_jetons s join lagon.joueurs j on j.salle = s.salle and j.pseudo = s.pseudo
    join lagon.salles sa on sa.code = s.salle
    where s.jeton = p_jeton order by sa.maj desc nulls last, j.rejoint_le desc limit 1;
end $$;

-- ---------- le Panthéon ----------
-- l'élève propose sa tortue, avec la moyenne calculée par son navigateur sur le banc d'essai.
-- p_jeton : son « code Panthéon » (s'il a déjà une tortue au Panthéon, elle est remplacée si la nouvelle fait mieux).
-- Depuis une salle, l'élève donne aussi son jeton de session (p_salle, p_jeton_salle) : sa tortue est alors
-- rattachée à sa classe, avec le pseudo de la salle et l'établissement donné par l'enseignant·e.
-- Hors classe, la tortue n'a pas d'établissement : ce n'est pas une donnée de l'élève (décision du 12/11).
create or replace function public.lagon_proposer_pantheon(p_pseudo text, p_code text, p_moyenne numeric, p_banc int, p_jeton text,
  p_salle text default null, p_jeton_salle text default null)
returns json
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_pseudo text := btrim(left(coalesce(p_pseudo, ''), 100));
  v_lycee text;
  v_salle text := nullif(upper(btrim(left(coalesce(p_salle, ''), 10))), '');
  v_empreinte text;
  v lagon.pantheon%rowtype;
  v_id bigint; v_statut text;
begin
  if p_banc is distinct from 1 then raise exception 'Ta page est trop ancienne : recharge-la (Ctrl+F5).'; end if;
  if char_length(v_pseudo) < 2 or char_length(v_pseudo) > 14 or v_pseudo !~ '^[A-Za-z0-9À-ÿ _-]+$' then
    raise exception 'Pseudo invalide : 2 à 14 lettres ou chiffres.';
  end if;
  if v_salle is not null then
    if not exists (select 1 from lagon.joueurs_jetons j where j.salle = v_salle and j.pseudo = v_pseudo and j.jeton = coalesce(p_jeton_salle, '')) then
      raise exception 'Pour entrer au Panthéon avec ta classe, garde le pseudo de la salle %.', v_salle;
    end if;
    select s.etablissement into v_lycee from lagon.salles s where s.code = v_salle;   -- l'établissement, c'est celui que l'enseignant·e a donné
  end if;
  if char_length(coalesce(p_code, '')) < 10 or char_length(p_code) > 4000 then raise exception 'Programme vide ou trop long.'; end if;
  if p_moyenne is null or p_moyenne < 0 or p_moyenne > 30 then raise exception 'Moyenne impossible.'; end if;
  if char_length(coalesce(p_jeton, '')) not between 16 and 100 then raise exception 'Jeton invalide.'; end if;
  if (select count(*) from lagon.pantheon p where p.maj > now() - interval '1 minute') >= 30 then
    raise exception 'Beaucoup de tortues arrivent en ce moment : réessaie dans une minute.';
  end if;
  v_empreinte := md5(regexp_replace(regexp_replace(p_code, '#[^\n]*', '', 'g'), '\s+', '', 'g'));
  select * into v from lagon.pantheon p where p.jeton = p_jeton;
  -- améliorée plus tard hors de la salle (même code Panthéon, même pseudo) : elle reste rattachée à sa classe
  if v_salle is null and v.id is not null and v.salle is not null and lower(v.pseudo) = lower(v_pseudo) then
    v_salle := v.salle; v_lycee := v.lycee;
  end if;
  if exists (select 1 from lagon.pantheon p where p.empreinte = v_empreinte and p.jeton <> p_jeton) then
    raise exception 'Cette tortue est déjà au Panthéon (même programme) : invente ta propre stratégie !';
  end if;
  if v.id is null then
    insert into lagon.pantheon (pseudo, lycee, salle, moyenne, banc, code, empreinte, jeton)
      values (v_pseudo, v_lycee, v_salle, round(p_moyenne, 2), p_banc, p_code, v_empreinte, p_jeton) returning id into v_id;
    v_statut := 'nouveau';
  elsif v.maj > now() - interval '10 seconds' then
    raise exception 'Doucement : attends quelques secondes avant de reproposer ta tortue.';
  elsif round(p_moyenne, 2) > v.moyenne then
    update lagon.pantheon p set pseudo = v_pseudo, lycee = v_lycee, salle = v_salle, moyenne = round(p_moyenne, 2), banc = p_banc, code = p_code,
      empreinte = v_empreinte, verifie = false, maj = now() where p.id = v.id;
    v_id := v.id; v_statut := 'ameliore';
  else
    update lagon.pantheon p set pseudo = v_pseudo, lycee = v_lycee, salle = v_salle, maj = now() where p.id = v.id;
    v_id := v.id; v_statut := 'moins_bien';
  end if;
  -- on ne garde que les 1000 meilleures
  delete from lagon.pantheon p where p.id in (select q.id from lagon.pantheon q order by q.moyenne desc, q.cree_le offset 1000);
  -- (une tortue sortie des 1 000 meilleures reçoit le rang qu'elle aurait eu)
  select * into v from lagon.pantheon p where p.id = v_id;
  return json_build_object('statut', v_statut, 'moyenne', coalesce(v.moyenne, round(p_moyenne, 2)),
    'rang', lagon.rang_pantheon(coalesce(v.moyenne, round(p_moyenne, 2)), coalesce(v.cree_le, now())));
end $$;

-- le classement public (sans le programme ni la classe) : tout le Panthéon, ou un seul établissement.
-- Chaque ligne : le rang, le pseudo, l'établissement, la moyenne, vérifiée ou non, et la date d'entrée.
create or replace function public.lagon_pantheon_top(p_limite int default 100, p_lycee text default null)
returns table (rang bigint, pseudo text, lycee text, moyenne numeric, verifie boolean, cree_le timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select x.rang, x.pseudo, x.lycee, x.moyenne, x.verifie, x.cree_le from (
    select row_number() over (order by p.moyenne desc, p.cree_le) as rang, p.pseudo, p.lycee, p.moyenne, p.verifie, p.cree_le
    from lagon.pantheon p) x
  where p_lycee is null or lower(x.lycee) = lower(btrim(left(p_lycee, 100)))
  order by x.rang limit least(greatest(coalesce(p_limite, 100), 1), 1000)
$$;

-- les établissements déjà inscrits (pour le filtre du classement)
create or replace function public.lagon_pantheon_lycees()
returns table (lycee text, tortues bigint)
language sql stable security definer
set search_path = ''
as $$
  select min(p.lycee), count(*) from lagon.pantheon p where p.lycee is not null group by lower(p.lycee) order by 2 desc, 1 limit 300
$$;

-- ma tortue au Panthéon (avec mon code Panthéon)
create or replace function public.lagon_ma_tortue_pantheon(p_jeton text)
returns table (pseudo text, lycee text, salle text, cree_le timestamptz, moyenne numeric, verifie boolean, rang bigint)
language sql stable security definer
set search_path = ''
as $$
  select m.pseudo, m.lycee, m.salle, m.cree_le, m.moyenne, m.verifie, lagon.rang_pantheon(m.moyenne, m.cree_le)
  from lagon.pantheon m where m.jeton = left(p_jeton, 100)
$$;

-- le PANTHÉON AUTOMATIQUE : à la fin d'une manche, le navigateur de l'enseignant·e inscrit la ou les
-- meilleures tortues de la classe (au plus 3), avec la moyenne qu'il a calculée sur le banc d'essai.
-- p_entrees : [{"pseudo": "Maki", "code": "def tour(): …", "moyenne": 4.35, "banc": 1}, …]
-- Le code doit être une tortue vraiment envoyée par cet élève dans cette salle.
-- Doublons : même programme déjà au Panthéon → rien ; même élève (même salle, même pseudo) → remplacée si meilleure.
-- Chaque entrée nouvelle reçoit un code Panthéon : l'élève le retrouve avec son jeton de session (lagon_mon_entree_pantheon).
create or replace function public.lagon_pantheon_classe(p_code text, p_secret text, p_manche int, p_entrees jsonb)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  x jsonb; v_pseudo text; v_src text; v_moy numeric; v_emp text; v_lycee text;
  v lagon.pantheon%rowtype; d lagon.pantheon%rowtype; v_id bigint; v_statut text;
  v_faits jsonb := '[]'::jsonb; v_res jsonb := '[]'::jsonb;
begin
  perform lagon.verifier_prof(p_code, p_secret);
  if jsonb_typeof(p_entrees) is distinct from 'array' or jsonb_array_length(p_entrees) > 3 then
    raise exception 'Trois tortues au plus par manche.';
  end if;
  select s.etablissement into v_lycee from lagon.salles s where s.code = p_code;
  for x in select * from jsonb_array_elements(p_entrees) loop
    v_pseudo := x->>'pseudo'; v_src := x->>'code'; v_moy := round((x->>'moyenne')::numeric, 2);
    v_id := null; v_statut := null;
    if (x->>'banc')::int is distinct from 1 then raise exception 'Votre page est trop ancienne : rechargez-la (Ctrl+F5).'; end if;
    if v_moy is null or v_moy < 0 or v_moy > 30 then raise exception 'Moyenne impossible.'; end if;
    if not exists (select 1 from lagon.programmes t where t.salle = p_code and t.pseudo = v_pseudo and t.manche <= p_manche and t.code = v_src) then
      v_statut := 'inconnue';
    else
      v_emp := md5(regexp_replace(regexp_replace(v_src, '#[^\n]*', '', 'g'), '\s+', '', 'g'));
      select * into v from lagon.pantheon p where p.salle = p_code and lower(p.pseudo) = lower(v_pseudo) order by p.moyenne desc limit 1;
      select * into d from lagon.pantheon p where p.empreinte = v_emp;
      if d.id is not null then
        -- même programme déjà au Panthéon : celui de cet élève, ou une copie
        v_statut := case when d.salle = p_code and lower(d.pseudo) = lower(v_pseudo) then 'deja' else 'copie' end;
        if v_statut = 'deja' then v_id := d.id; end if;
      elsif v.id is null then
        insert into lagon.pantheon (pseudo, lycee, salle, manche, moyenne, banc, code, empreinte, jeton)
          values (v_pseudo, v_lycee, p_code, p_manche, v_moy, 1, v_src, v_emp, lagon.nouveau_jeton_pantheon()) returning id into v_id;
        v_statut := 'nouveau';
      elsif v_moy > v.moyenne then
        update lagon.pantheon p set moyenne = v_moy, banc = 1, code = v_src, empreinte = v_emp, manche = p_manche, lycee = coalesce(v_lycee, p.lycee),
          verifie = false, maj = now() where p.id = v.id;
        v_id := v.id; v_statut := 'ameliore';
      else
        v_id := v.id; v_statut := 'moins_bien';
      end if;
    end if;
    v_faits := v_faits || jsonb_build_object('pseudo', v_pseudo, 'statut', v_statut, 'id', v_id);
  end loop;
  -- on ne garde que les 1000 meilleures
  delete from lagon.pantheon p where p.id in (select q.id from lagon.pantheon q order by q.moyenne desc, q.cree_le offset 1000);
  for x in select * from jsonb_array_elements(v_faits) loop
    select * into v from lagon.pantheon p where p.id = (x->>'id')::bigint;
    v_res := v_res || jsonb_build_object('pseudo', x->>'pseudo', 'statut', x->>'statut',
      'moyenne', v.moyenne,
      'rang', case when v.id is null then null else lagon.rang_pantheon(v.moyenne, v.cree_le) end);
  end loop;
  return v_res;
end $$;

-- l'élève retrouve SA tortue de la classe au Panthéon (et son code Panthéon) avec son jeton de session
create or replace function public.lagon_mon_entree_pantheon(p_salle text, p_pseudo text, p_jeton text)
returns table (pseudo text, salle text, manche int, moyenne numeric, verifie boolean, rang bigint, code text, cree_le timestamptz, maj timestamptz)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from lagon.joueurs_jetons j where j.salle = upper(left(p_salle, 10)) and j.pseudo = p_pseudo and j.jeton = p_jeton) then
    raise exception 'Joueur inconnu : reconnecte-toi à la salle.';
  end if;
  return query select m.pseudo, m.salle, m.manche, m.moyenne, m.verifie, lagon.rang_pantheon(m.moyenne, m.cree_le),
      case when m.jeton ~ '^pantheon-[A-Z0-9]{8}-lagon$' then substr(m.jeton, 10, 8) end, m.cree_le, m.maj
    from lagon.pantheon m where m.salle = upper(left(p_salle, 10)) and lower(m.pseudo) = lower(p_pseudo)
    order by m.moyenne desc limit 1;
end $$;

-- ---------- l'administration du Panthéon ----------
create or replace function public.lagon_pantheon_admin(p_secret text)
returns table (id bigint, pseudo text, lycee text, salle text, manche int, moyenne numeric, banc int, code text, verifie boolean, cree_le timestamptz)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  perform lagon.verifier_admin(p_secret);
  return query select p.id, p.pseudo, p.lycee, p.salle, p.manche, p.moyenne, p.banc, p.code, p.verifie, p.cree_le
    from lagon.pantheon p order by p.moyenne desc, p.cree_le limit 1000;
end $$;

-- l'administration a recalculé le score : on le corrige et on le marque vérifié
create or replace function public.lagon_pantheon_valider(p_secret text, p_id bigint, p_moyenne numeric)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  perform lagon.verifier_admin(p_secret);
  if p_moyenne is null or p_moyenne < 0 or p_moyenne > 30 then raise exception 'Moyenne impossible.'; end if;
  update lagon.pantheon p set moyenne = round(p_moyenne, 2), verifie = true where p.id = p_id;
end $$;

create or replace function public.lagon_pantheon_retirer(p_secret text, p_id bigint)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  perform lagon.verifier_admin(p_secret);
  delete from lagon.pantheon p where p.id = p_id;
end $$;

-- -----------------------------------------------------------------------------
-- 5. Les droits et les commentaires des fonctions d'entrée
-- -----------------------------------------------------------------------------
revoke all on function public.lagon_heure_serveur(), public.lagon_statistiques(), public.lagon_creer_salle(text),
  public.lagon_piloter_salle(text, text, int, text, int, int, text, text[]), public.lagon_retirer_joueur(text, text, text),
  public.lagon_definir_config(text, text, jsonb), public.lagon_definir_etablissement(text, text, text),
  public.lagon_liberer_pseudo(text, text, text), public.lagon_codes_session(text, text), public.lagon_codes_manche(text, text, int),
  public.lagon_enregistrer_scores(text, text, int, jsonb), public.lagon_salle(text), public.lagon_joueurs(text),
  public.lagon_scores(text), public.lagon_programmes(text), public.lagon_etat_depots(text, int),
  public.lagon_rejoindre(text, text, text, text), public.lagon_deposer_tortue(text, text, text, int, text),
  public.lagon_changer_jeton(text, text, text, text), public.lagon_ma_tortue(text, text, text), public.lagon_retrouver_session(text),
  public.lagon_proposer_pantheon(text, text, numeric, int, text, text, text), public.lagon_pantheon_top(int, text),
  public.lagon_pantheon_lycees(), public.lagon_ma_tortue_pantheon(text), public.lagon_pantheon_classe(text, text, int, jsonb),
  public.lagon_mon_entree_pantheon(text, text, text), public.lagon_pantheon_admin(text),
  public.lagon_pantheon_valider(text, bigint, numeric), public.lagon_pantheon_retirer(text, bigint)
  from public, anon, authenticated;
grant execute on function public.lagon_heure_serveur(), public.lagon_statistiques(), public.lagon_creer_salle(text),
  public.lagon_piloter_salle(text, text, int, text, int, int, text, text[]), public.lagon_retirer_joueur(text, text, text),
  public.lagon_definir_config(text, text, jsonb), public.lagon_definir_etablissement(text, text, text),
  public.lagon_liberer_pseudo(text, text, text), public.lagon_codes_session(text, text), public.lagon_codes_manche(text, text, int),
  public.lagon_enregistrer_scores(text, text, int, jsonb), public.lagon_salle(text), public.lagon_joueurs(text),
  public.lagon_scores(text), public.lagon_programmes(text), public.lagon_etat_depots(text, int),
  public.lagon_rejoindre(text, text, text, text), public.lagon_deposer_tortue(text, text, text, int, text),
  public.lagon_changer_jeton(text, text, text, text), public.lagon_ma_tortue(text, text, text), public.lagon_retrouver_session(text),
  public.lagon_proposer_pantheon(text, text, numeric, int, text, text, text), public.lagon_pantheon_top(int, text),
  public.lagon_pantheon_lycees(), public.lagon_ma_tortue_pantheon(text), public.lagon_pantheon_classe(text, text, int, jsonb),
  public.lagon_mon_entree_pantheon(text, text, text), public.lagon_pantheon_admin(text),
  public.lagon_pantheon_valider(text, bigint, numeric), public.lagon_pantheon_retirer(text, bigint)
  to anon;

comment on function public.lagon_heure_serveur() is 'Lagon Arena, entrée (tout le monde). L''heure du serveur, pour synchroniser les chronos.';
comment on function public.lagon_statistiques() is 'Lagon Arena, entrée (accueil). Les nombres de l''accueil : parties, participants, salles, tortues au Panthéon ; lance le ménage (au plus une fois par heure).';
comment on function public.lagon_creer_salle(text) is 'Lagon Arena, entrée (enseignant·e). Crée une salle (établissement facultatif) ; renvoie son code et son secret de pilotage.';
comment on function public.lagon_piloter_salle(text, text, int, text, int, int, text, text[]) is 'Lagon Arena, entrée (enseignant·e, avec le secret). Change de manche, de phase, de chrono, de nouveauté, de duel.';
comment on function public.lagon_retirer_joueur(text, text, text) is 'Lagon Arena, entrée (enseignant·e, avec le secret). Retire un·e élève de la salle, avec ses programmes.';
comment on function public.lagon_definir_config(text, text, jsonb) is 'Lagon Arena, entrée (enseignant·e, avec le secret). Publie les réglages de la manche préparée (20 000 caractères au plus).';
comment on function public.lagon_definir_etablissement(text, text, text) is 'Lagon Arena, entrée (enseignant·e, avec le secret). Renseigne, corrige ou efface l''établissement de la salle ; les tortues de la classe au Panthéon le suivent.';
comment on function public.lagon_liberer_pseudo(text, text, text) is 'Lagon Arena, entrée (enseignant·e, avec le secret). Débloque un pseudo : l''élève le reprend depuis un autre appareil.';
comment on function public.lagon_codes_session(text, text) is 'Lagon Arena, entrée (enseignant·e, avec le secret). Le code de session de chaque élève de la salle, en un seul objet JSON.';
comment on function public.lagon_codes_manche(text, text, int) is 'Lagon Arena, entrée (enseignant·e, avec le secret). La dernière tortue envoyée par chaque élève (manche <= p_manche), même pendant la programmation, en un seul objet JSON.';
comment on function public.lagon_enregistrer_scores(text, text, int, jsonb) is 'Lagon Arena, entrée (enseignant·e, avec le secret). Enregistre les scores d''une manche, calculés par son navigateur.';
comment on function public.lagon_salle(text) is 'Lagon Arena, entrée (tout le monde, avec le code de la salle). L''état de la salle (manche, phase, chrono, réglages, établissement), ou null. Remplace la lecture publique de la table.';
comment on function public.lagon_joueurs(text) is 'Lagon Arena, entrée (tout le monde, avec le code de la salle). Les pseudos et les couleurs des joueurs, en un seul objet JSON. Remplace la lecture publique de la table.';
comment on function public.lagon_scores(text) is 'Lagon Arena, entrée (tout le monde, avec le code de la salle). Les scores de la salle, manche par manche, en un seul objet JSON. Remplace la lecture publique de la table.';
comment on function public.lagon_programmes(text) is 'Lagon Arena, entrée (tout le monde, avec le code de la salle). Les programmes des tortues, seulement après le brawl de leur manche, en un seul objet JSON. Remplace la lecture publique de la table tortues.';
comment on function public.lagon_etat_depots(text, int) is 'Lagon Arena, entrée (tout le monde, avec le code de la salle). Qui a envoyé sa tortue pour la manche, sans le programme.';
comment on function public.lagon_rejoindre(text, text, text, text) is 'Lagon Arena, entrée (élève). Rejoindre une salle avec un pseudo (ou revenir avec le même jeton). Aucun plafond du nombre de joueurs.';
comment on function public.lagon_deposer_tortue(text, text, text, int, text) is 'Lagon Arena, entrée (élève, avec son jeton). Envoie sa tortue pour la manche en cours (4 000 caractères au plus).';
comment on function public.lagon_changer_jeton(text, text, text, text) is 'Lagon Arena, entrée (élève, avec son jeton). Remplace son jeton par celui de son code de session.';
comment on function public.lagon_ma_tortue(text, text, text) is 'Lagon Arena, entrée (élève, avec son jeton). Sa dernière tortue envoyée, pour la retrouver sur un autre appareil.';
comment on function public.lagon_retrouver_session(text) is 'Lagon Arena, entrée (élève, avec son code de session). Retrouve sa salle, son pseudo et sa couleur.';
comment on function public.lagon_proposer_pantheon(text, text, numeric, int, text, text, text) is 'Lagon Arena, entrée (élève, avec son code Panthéon). Entrer au Panthéon ou améliorer sa tortue ; depuis une salle (avec son jeton de session), la tortue est rattachée à la classe et prend l''établissement de la salle.';
comment on function public.lagon_pantheon_top(int, text) is 'Lagon Arena, entrée (tout le monde). Le classement du Panthéon : rang, pseudo, établissement, moyenne, vérifiée, date ; jamais le programme ni la classe.';
comment on function public.lagon_pantheon_lycees() is 'Lagon Arena, entrée (tout le monde). Les établissements du Panthéon et leur nombre de tortues (300 au plus).';
comment on function public.lagon_ma_tortue_pantheon(text) is 'Lagon Arena, entrée (élève, avec son code Panthéon). Sa tortue au Panthéon et son rang.';
comment on function public.lagon_pantheon_classe(text, text, int, jsonb) is 'Lagon Arena, entrée (enseignant·e, avec le secret). Le Panthéon automatique : inscrit au plus 3 tortues de la manche ; renvoie le statut et le rang de chacune.';
comment on function public.lagon_mon_entree_pantheon(text, text, text) is 'Lagon Arena, entrée (élève, avec son jeton de session). Sa tortue de la classe au Panthéon et son code Panthéon.';
comment on function public.lagon_pantheon_admin(text) is 'Lagon Arena, entrée (administration du Panthéon, avec le mot de passe). Les tortues avec leur programme, pour recalculer les scores.';
comment on function public.lagon_pantheon_valider(text, bigint, numeric) is 'Lagon Arena, entrée (administration du Panthéon, avec le mot de passe). Corrige un score recalculé et le marque vérifié.';
comment on function public.lagon_pantheon_retirer(text, bigint) is 'Lagon Arena, entrée (administration du Panthéon, avec le mot de passe). Retire une tortue du Panthéon.';

-- -----------------------------------------------------------------------------
-- 6. Contrôle : rien d'ouvert à l'API, sauf les trente fonctions d'entrée ;
--    un commentaire partout. Sinon, arrêt : rien n'est appliqué.
-- -----------------------------------------------------------------------------
do $$
begin
  if has_schema_privilege('anon', 'lagon', 'usage') or has_schema_privilege('authenticated', 'lagon', 'usage') then
    raise exception 'Le schéma lagon est ouvert à anon ou à authenticated : arrêt, rien n''a été modifié.';
  end if;
  if exists (select 1 from pg_catalog.pg_class c where c.relnamespace = 'lagon'::regnamespace and c.relkind in ('r', 'p')
             and (not c.relrowsecurity
                  or has_table_privilege('anon', c.oid, 'select, insert, update, delete, truncate, references, trigger, maintain')
                  or has_table_privilege('authenticated', c.oid, 'select, insert, update, delete, truncate, references, trigger, maintain'))) then
    raise exception 'Une table de lagon est ouverte, ou sans RLS : arrêt, rien n''a été modifié.';
  end if;
  if exists (select 1 from pg_catalog.pg_policies p where p.schemaname = 'lagon') then
    raise exception 'Une règle d''accès (policy) existe sur une table de lagon : arrêt, rien n''a été modifié.';
  end if;
  if exists (select 1 from pg_catalog.pg_class c where c.relnamespace = 'lagon'::regnamespace and c.relkind = 'S'
             and (has_sequence_privilege('anon', c.oid, 'usage, select, update') or has_sequence_privilege('authenticated', c.oid, 'usage, select, update'))) then
    raise exception 'Une séquence de lagon est ouverte à anon ou à authenticated : arrêt, rien n''a été modifié.';
  end if;
  if exists (select 1 from pg_catalog.pg_proc p where p.pronamespace = 'lagon'::regnamespace
             and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) then
    raise exception 'Une fonction interne de lagon est appelable par l''API : arrêt, rien n''a été modifié.';
  end if;
  if (select count(*) from pg_catalog.pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'lagon\_%'
      and has_function_privilege('anon', p.oid, 'execute') and not has_function_privilege('authenticated', p.oid, 'execute')) <> 30
     or (select count(*) from pg_catalog.pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'lagon\_%') <> 30 then
    raise exception 'Il faut exactement trente fonctions public.lagon_…, appelables par anon seul : arrêt, rien n''a été modifié.';
  end if;
  if exists (select 1 from pg_catalog.pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'lagon\_%' and p.prosecdef
             and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')) then
    raise exception 'Une fonction public.lagon_… n''a pas de search_path fixé : arrêt, rien n''a été modifié.';
  end if;
  if exists (select 1 from pg_catalog.pg_class c where c.relnamespace = 'lagon'::regnamespace and c.relkind = 'r'
             and (obj_description(c.oid, 'pg_class') is null
                  or exists (select 1 from pg_catalog.pg_attribute a where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
                             and col_description(c.oid, a.attnum) is null))) then
    raise exception 'Une table ou une colonne de lagon n''a pas de commentaire : arrêt, rien n''a été modifié.';
  end if;
end $$;

-- PostgREST relit la liste des fonctions (sans effet hors de Supabase).
notify pgrst, 'reload schema';

commit;
