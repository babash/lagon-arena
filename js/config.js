// =====================================================================
//  Configuration de Lagon Arena
//  1. Crée un projet gratuit sur https://supabase.com (région Europe).
//  2. Lance le fichier supabase.sql dans « SQL Editor ».
//  3. Recopie ci-dessous l'URL du projet et sa clé « publishable »
//     (Project Settings > API Keys > « Publishable key ») : elle est publique, faite pour être vue.
//     Jamais la clé « secret » ni « service_role ».
//  Tant que SUPABASE_URL est vide, le site fonctionne en MODE DÉMO :
//  tout reste dans ce navigateur (pratique pour tester seul·e).
//  La page reconnaît seule la forme de la base (schéma lagon d'aujourd'hui, ou l'ancienne) :
//  le déménagement dans la base unique (novembre 2026) ne change que les deux lignes ci-dessous.
// =====================================================================
export const CONFIG = {
  SUPABASE_URL: "https://gkyvaugipddjqjvvpopw.supabase.co",
  SUPABASE_KEY: "sb_publishable_D056BtLTe3WXsmDhj4DEDw_2q6Ktlw8",   // clé publique : elle peut être visible
  // adresse publique du site : tous les liens à donner (élèves, code de session, lien enseignant, QR code) pointent ici
  URL_SITE: "https://babash.github.io/lagon-arena/",
  DUREE_PROG_1: 8 * 60,      // durée de la 1re phase de programmation (secondes)
  DUREE_PROG: 6 * 60,        // durée des phases suivantes (secondes)
  MIN_TORTUES: 8,            // en dessous, on complète avec des tortues d'entraînement
};
