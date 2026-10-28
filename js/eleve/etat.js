// =====================================================================
//  Lagon Arena — élève : qui je suis, la salle, et ce qu'on garde dans ce navigateur
// =====================================================================
import { secondesRestantes } from "../db.js";
import { store, cleJeton, cleCodePerso } from "../common.js";

const q = new URLSearchParams(location.search);
export const SALLE = (q.get("salle") || "").toUpperCase();
export const LIBRE = q.has("libre") || !SALLE;            // bac à sable seul, sans salle
export const PSEUDO = q.get("pseudo") || "";
export const couleur = store.get("lagon:couleur") || "#ff7b5c";

export const cleCode = `lagon:code:${LIBRE ? "libre" : SALLE + ":" + PSEUDO}`;   // le programme en cours d'écriture
const cleEnvoi = `lagon:envoi:${SALLE}:${PSEUDO}`;                                // la dernière tortue envoyée

export const S = {
  salle: null,                                                        // la salle (manche, phase, chrono, réglages…)
  jeton: LIBRE ? null : store.get(cleJeton(SALLE, PSEUDO)),           // le secret qui prouve que je suis moi
  codeSession: LIBRE ? null : store.get(cleCodePerso(SALLE, PSEUDO)), // pour me reconnecter d'un autre ordinateur
  dernierEnvoi: LIBRE ? null : store.get(cleEnvoi),                   // { manche, code, at }
};
export function memoriserEnvoi(e) { S.dernierEnvoi = e; store.set(cleEnvoi, e); }
export function memoriserSession(jeton, code) {
  S.jeton = jeton; S.codeSession = code;
  store.set(cleJeton(SALLE, PSEUDO), jeton); store.set(cleCodePerso(SALLE, PSEUDO), code);
}

// les réglages de la manche préparés par l'enseignant : manche EN COURS, ou PROCHAINE (annoncée)
export const configActuelle = () => (S.salle && S.salle.config && S.salle.config.manche === S.salle.manche ? S.salle.config : null);
export const configProchaine = () => (S.salle && S.salle.config && S.salle.config.manche === S.salle.manche + 1 && ["attente", "resultats"].includes(S.salle.phase) ? S.salle.config : null);
export function titreManche(c = configActuelle()) { return (c && c.titre) || (S.salle && S.salle.duel ? "Manche spéciale" : "Manche " + (c ? c.manche : S.salle.manche)); }
export const estFinaliste = () => !S.salle || !S.salle.duel || S.salle.duel.includes(PSEUDO);

// manche « longue » : l'enseignant a choisi un temps illimité (la manche reste ouverte plusieurs jours)
export const ILLIMITE = 30 * 24 * 3600;
export const tempsIllimite = () => S.salle && S.salle.phase === "prog" && S.salle.fin_chrono && secondesRestantes(S.salle.fin_chrono) > ILLIMITE;
