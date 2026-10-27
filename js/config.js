// =====================================================================
//  Configuration de Lagon Arena
//  1. Créez un projet gratuit sur https://supabase.com (région Europe).
//  2. Lancez le fichier supabase.sql dans « SQL Editor ».
//  3. Recopiez ci-dessous l'URL du projet et la clé publique
//     (Project Settings > API Keys > « Publishable key », ou l'ancienne clé « anon »).
//  Tant que SUPABASE_URL est vide, le site fonctionne en MODE DÉMO :
//  tout reste dans ce navigateur (pratique pour tester seul).
// =====================================================================
export const CONFIG = {
  SUPABASE_URL: "",          // ex. "https://abcdefghijkl.supabase.co"
  SUPABASE_KEY: "",          // ex. "sb_publishable_..." ou "eyJhbGciOi..."
  DUREE_PROG_1: 8 * 60,      // durée de la 1re phase de programmation (secondes)
  DUREE_PROG: 6 * 60,        // durée des phases suivantes (secondes)
  MIN_TORTUES: 8,            // en dessous, on complète avec des tortues d'entraînement
};
