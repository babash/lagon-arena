// =====================================================================
//  Lagon Arena — le PARCOURS de l'élève, en missions
//  Les 4 missions du tutoriel (tuto.html) et leur progression, lue par l'accueil.
//  Une mission = quelques étapes courtes ; on peut s'arrêter entre deux missions.
// =====================================================================
import { store } from "./common.js";

export const CLE_TUTO = "lagon:tuto2";   // (progression du tutoriel : { faits: [clés], missions: [n] })

export const MISSIONS_TUTO = [
  { n: 1, icone: "🌊", titre: "Comprendre le jeu", court: "Le jeu", duree: "5 min",
    texte: "Le but, le lagon, et tu pilotes toi-même ta tortue. Sans code !", cles: ["pilote", "regles"] },
  { n: 2, icone: "💬", titre: "Parler à ta tortue", court: "Questions et ordres", duree: "5 min",
    texte: "Ses questions (vrai ou faux ?), ses ordres, et tes premières règles « si… alors… » en français.", cles: ["capteurs", "actions", "sialors"] },
  { n: 3, icone: "✍️", titre: "Tes premières règles en Python", court: "if, else, elif", duree: "10 min",
    texte: "On traduit les règles en Python, pas à pas : if, else, and, elif.", cles: ["trous", "if", "else", "and", "elif"] },
  { n: 4, icone: "🥚", titre: "Une tortue qui pond", court: "Ta tortue", duree: "10 min",
    texte: "Une seule chaîne de règles, dans le bon ordre. Deux tortues à réparer, puis la tienne.", cles: ["chaine", "ordre", "mB", "m2", "construis"] },
];

// l'état de chaque mission : "finie", "en cours" (au moins un exercice réussi) ou "a faire"
export function progressionTuto() {
  const p = store.get(CLE_TUTO, { faits: [] }) || { faits: [] };
  const faits = p.faits || [], finies = p.missions || [];
  return MISSIONS_TUTO.map((M) => {
    const ok = M.cles.filter((c) => faits.includes(c)).length;
    const etat = finies.includes(M.n) || ok === M.cles.length ? "finie" : ok ? "en cours" : "a faire";
    return { ...M, etat, ok, total: M.cles.length };
  });
}
