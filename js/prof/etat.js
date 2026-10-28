// =====================================================================
//  Lagon Arena — enseignant : l'état de la salle ouverte, les réglages, le pilotage
// =====================================================================
import { db, secondesRestantes } from "../db.js";
import { CONFIG } from "../config.js";
import { store } from "../common.js";

// la salle ouverte (code = null tant qu'on est sur l'accueil)
export const S = {
  code: null, secret: null,   // code de la salle et jeton enseignant
  salle: null,                // manche, phase, chrono, nouveauté, réglages publiés (config)…
  joueurs: [],                // élèves connectés
  depots: [],                 // tortues envoyées pour la manche en cours
  viewer: null,               // le lecteur de match affiché
  chrono: null, sondage: null, // minuteries (scène, liste des élèves)
};

// réglages de l'enseignant (durées, nombre de tortues), gardés dans ce navigateur
export const reglages = Object.assign({ duree1: CONFIG.DUREE_PROG_1, duree: CONFIG.DUREE_PROG, dureeDuel: 240, min: CONFIG.MIN_TORTUES }, store.get("lagon:reglages", {}));
export const sauverReglages = () => store.set("lagon:reglages", reglages);

// les salles pilotées depuis ce navigateur (avec leur jeton enseignant)
export const mesSalles = () => store.get("lagon:prof", {});
export function memoriserSalle(code, secret, extra = {}) {
  const s = mesSalles();
  s[code] = { ...(s[code] || {}), secret, cree: (s[code] && s[code].cree) || new Date().toISOString(), ...extra };
  store.set("lagon:prof", s);
}
export function oublierSalle(code) { const s = mesSalles(); delete s[code]; store.set("lagon:prof", s); }

// les réglages publiés pour la manche EN COURS
export const configActuelle = () => (S.salle && S.salle.config && S.salle.config.manche === S.salle.manche ? S.salle.config : null);
export function titreManche() {
  const c = configActuelle();
  return (c && c.titre) || (S.salle.duel ? "Manche spéciale" : "Manche " + S.salle.manche);
}
// les élèves qui jouent la manche en cours (toute la classe, ou ceux choisis)
export const participantsHumains = () => (S.salle.duel ? S.salle.duel.filter((p) => S.joueurs.some((j) => j.pseudo === p)) : S.joueurs.map((j) => j.pseudo));

// manche « longue » : temps illimité (en pratique 400 jours ; la manche reste ouverte jusqu'au brawl)
export const DUREE_ILLIMITEE = 400 * 24 * 3600;
export const estIllimite = () => S.salle && S.salle.phase === "prog" && S.salle.fin_chrono && secondesRestantes(S.salle.fin_chrono) > 30 * 24 * 3600;

// piloter la salle (manche, phase, chrono…) ; ensuite, la page se redessine (voir salle.js)
let apresPilotage = () => {};
export const quandPilotee = (f) => { apresPilotage = f; };
export async function piloter(changes) {
  const p = { manche: S.salle.manche, phase: S.salle.phase, duel: S.salle.duel, ...changes };
  await db.piloter(S.code, S.secret, p);
  S.salle = await db.salle(S.code);
  apresPilotage();
}

// retour à l'accueil (branché par main.js)
export const navigation = { accueil: () => {} };
