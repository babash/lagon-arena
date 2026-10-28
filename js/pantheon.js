// =====================================================================
//  Lagon Arena — le BANC D'ESSAI du Panthéon
//  Toutes les tortues sont jugées de la même façon : 20 parties « chacun pour soi »
//  contre les 5 tortues d'entraînement, dans le lagon calme, sur 20 lagons toujours
//  les mêmes. Le score est la moyenne de nids. Le calcul est déterministe : l'administrateur
//  peut le refaire à l'identique pour vérifier un score.
//
//  Si les règles du moteur changent, il faut un nouveau banc (VERSION + 1) et revérifier
//  les tortues du Panthéon (pantheon.html?admin).
// =====================================================================
import { simulate, BOTS, BOT_PIRATE, CODE_DEPART, MISSIONS, MISSIONS_AVANCEES } from "./engine.js";
import { CODE_EXPERT, CODE_EQUIPE } from "./tuto-avance/strategies.js";

export const BANC = {
  version: 1,
  parties: 20,
  nouveaute: "calme",
  carte: 2,                                               // version de carte (lagons aléatoires tirés de la graine)
  graines: Array.from({ length: 20 }, (_, i) => 20261028 + i * 104729),
};
export const ADVERSAIRES = BOTS;

// une partie du banc
function partie(code, graine) {
  const joueurs = [{ id: "moi", nom: "Ta tortue", couleur: "#ffffff", code },
    ...ADVERSAIRES.map((b, i) => ({ id: "bot" + i, nom: b.nom, couleur: b.couleur || "#888", code: b.code }))];
  const r = simulate({ joueurs, graine, twist: BANC.nouveaute, version: BANC.carte, leger: true });
  return r.resultats.find((x) => x.id === "moi");
}

// évalue une tortue sur tout le banc ; avancer(i, total) permet d'afficher une progression
// (les parties sont jouées par paquets pour laisser la page respirer)
export async function evaluerBanc(code, avancer = () => {}) {
  const nids = [];
  let captures = 0;
  for (let i = 0; i < BANC.parties; i++) {
    const r = partie(code, BANC.graines[i]);
    nids.push(r.nids); captures += r.captures || 0;
    if (i % 4 === 3) { avancer(i + 1, BANC.parties); await new Promise((ok) => setTimeout(ok, 0)); }
  }
  const moyenne = Math.round((100 * nids.reduce((a, b) => a + b, 0)) / BANC.parties) / 100;
  return { moyenne, nids, min: Math.min(...nids), max: Math.max(...nids), zeros: nids.filter((n) => n === 0).length, captures: captures / BANC.parties };
}

// les tortues d'entraînement passées sur le même banc : des repères dans le classement
let repereCache = null;
export async function reperes() {
  if (!repereCache) repereCache = (async () => {
    const l = [];
    for (const b of ADVERSAIRES) l.push({ nom: b.nom, moyenne: (await evaluerBanc(b.code)).moyenne });
    return l.sort((a, b) => b.moyenne - a.moyenne);
  })();
  return repereCache;
}

// les programmes qu'on ne peut pas proposer tels quels : tortue de départ, tortues d'entraînement,
// missions et stratégies des tutoriels (+ ceux du coup de pouce, ajoutés par la page : extra)
// Comparaison sans commentaires ni espaces, comme l'« empreinte » de supabase.sql.
export const normaliser = (code) => code.replace(/#[^\n]*/g, "").replace(/\s+/g, "");
export function codesConnus(extra = []) {
  return [
    { nom: "la tortue de départ", code: CODE_DEPART },
    ...[...BOTS, BOT_PIRATE].map((b) => ({ nom: `la tortue d'entraînement ${b.nom}`, code: b.code })),
    ...[...MISSIONS, ...MISSIONS_AVANCEES].flatMap((m) => [m.code, m.solution].filter(Boolean).map((code) => ({ nom: `une mission du tutoriel`, code }))),
    { nom: "la stratégie d'expert du tutoriel avancé", code: CODE_EXPERT },
    { nom: "la stratégie d'équipe du tutoriel avancé", code: CODE_EQUIPE },
    ...extra,
  ];
}
export function codeConnu(code, extra = []) { const n = normaliser(code); return codesConnus(extra).find((c) => normaliser(c.code) === n) || null; }
