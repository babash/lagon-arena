// =====================================================================
//  Lagon Arena — logique commune d'un brawl (utilisée par le prof ET par les élèves,
//  pour que chacun puisse rejouer exactement le même match sur son poste).
// =====================================================================
import { simulate, BOTS, CODE_DEPART, graineManche, pointsPourRang, BONUS_PROGRESSION, resultatEquipes } from "./engine.js";

// Points d'une manche en équipes : chaque élève marque les points du RANG de son équipe,
// de POINTS_EQUIPE.premier (1re équipe) à POINTS_EQUIPE.dernier (dernière), répartis régulièrement
// (2 équipes : 20 / 10 ; 3 équipes : 20 / 15 / 10 ; 4 équipes : 20 / 17 / 13 / 10…).
// Des équipes à égalité se partagent les points de leurs places (2 équipes à égalité : 15 chacune).
export const POINTS_EQUIPE = { premier: 20, dernier: 10 };
export function pointsPlaceEquipe(place, nb) {
  return nb <= 1 ? POINTS_EQUIPE.premier : POINTS_EQUIPE.premier - ((place - 1) * (POINTS_EQUIPE.premier - POINTS_EQUIPE.dernier)) / (nb - 1);
}
export function pointsEquipe(R, e) {
  const x = R[e];
  if (!x) return 0;
  let tot = 0;
  for (let k = 0; k < x.exaequo; k++) tot += pointsPlaceEquipe(x.rang + k, R.nb);
  return Math.round(tot / x.exaequo);
}
export const baremeEquipes = (nb) => Array.from({ length: Math.max(2, nb) }, (_, i) => Math.round(pointsPlaceEquipe(i + 1, Math.max(2, nb))));

export const BOT_PREFIXE = "Bot-";
const BOT_COULEURS = ["#c9d6df", "#9fb3c2", "#e0e6eb", "#b3c4d1", "#d6dee5"];
export const estBot = (pseudo) => pseudo.startsWith(BOT_PREFIXE);

// Bots ajoutés pour atteindre un minimum de tortues (les plus forts en premier n'aident pas les débutants :
// on prend Prudente, Gourmande, Maline, Bulle, Championne)
const ORDRE_BOTS = ["Prudente", "Gourmande", "Maline", "Bulle", "Championne"];
export function botsPourCompleter(nbHumains, minimum) {
  const n = Math.max(0, minimum - nbHumains);
  return Array.from({ length: n }, (_, i) => BOT_PREFIXE + ORDRE_BOTS[i % ORDRE_BOTS.length] + (i >= ORDRE_BOTS.length ? i : ""));
}

// Le code joué par un élève à la manche m : sa dernière tortue envoyée (manche <= m), sinon la tortue de départ.
export function codeDe(pseudo, manche, tortues) {
  if (estBot(pseudo)) {
    const nom = pseudo.slice(BOT_PREFIXE.length).replace(/\d+$/, "");
    return (BOTS.find((b) => b.nom === nom) || BOTS[2]).code;
  }
  const mes = tortues.filter((t) => t.pseudo === pseudo && t.manche <= manche).sort((a, b) => b.manche - a.manche);
  return mes.length ? mes[0].code : CODE_DEPART;
}

// Une manche déjà jouée, retrouvée grâce aux scores (bots compris) : participants, nouveauté, duel.
// Cela permet à chaque élève de rejouer exactement le même match sur son poste.
export function infosManche(scores, manche) {
  const l = scores.filter((s) => s.manche === manche);
  if (!l.length) return null;
  const equipes = l.some((s) => s.equipe > 0) ? Object.fromEntries(l.map((s) => [s.pseudo, s.equipe || 0])) : null;
  return { manche, pseudos: l.map((s) => s.pseudo), twist: l[0].nouveaute || "calme", duel: !!l[0].duel, equipes };
}

// Équipes de TOUS les participants d'un brawl : les élèves selon la composition choisie
// (un élève arrivé en retard va dans l'équipe la plus petite). Les 🤖 restent NEUTRES (équipe 0) :
// ce sont des concurrentes de tout le monde, et seuls les nids des élèves font le score des équipes
// (sinon l'équipe complétée par des 🤖 serait avantagée face à des débutants).
export function equipesCompletes(pseudos, equipesEleves, nbEquipes = 0) {
  const eq = equipesEleves || {};
  const nb = Math.max(2, nbEquipes || 0, ...Object.values(eq).map(Number).filter((e) => e > 0));
  const res = {}, taille = Object.fromEntries(Array.from({ length: nb }, (_, i) => [i + 1, 0]));
  const plusPetite = () => Object.keys(taille).map(Number).sort((a, b) => taille[a] - taille[b] || a - b)[0];
  for (const p of pseudos) if (!estBot(p) && eq[p]) { res[p] = eq[p]; taille[res[p]] = (taille[res[p]] || 0) + 1; }
  for (const p of pseudos) if (!estBot(p) && !res[p]) { res[p] = plusPetite(); taille[res[p]]++; }
  for (const p of pseudos) if (estBot(p)) res[p] = 0;
  return res;
}
export const aDepose = (pseudo, manche, tortues) => tortues.some((t) => t.pseudo === pseudo && t.manche === manche);

export function construireJoueurs(pseudos, joueurs, tortues, manche, equipes = null) {
  return pseudos.map((p, i) => {
    const j = joueurs.find((x) => x.pseudo === p);
    return { id: p, nom: estBot(p) ? p.slice(BOT_PREFIXE.length) + " 🤖" : p, couleur: j ? j.couleur : BOT_COULEURS[i % BOT_COULEURS.length],
      code: codeDe(p, manche, tortues), equipe: equipes ? equipes[p] || 0 : 0 };
  });
}

export function lancerSimulation(salle, manche, pseudos, joueurs, tortues, twist, remplacer = null, equipes = null) {
  const liste = construireJoueurs(pseudos, joueurs, tortues, manche, equipes);
  if (remplacer) for (const j of liste) if (j.id === remplacer.pseudo) j.code = remplacer.code;
  return simulate({ joueurs: liste, graine: graineManche(salle.graine, manche), twist });
}

// Scores de la manche.
//  • chacun pour soi : rang parmi les élèves → points (25, 20, 16…), + bonus si progrès ;
//  • en équipes : seul le rang de l'équipe compte (POINTS_EQUIPE, rang = rang de l'équipe) ;
//  • coef : 1 = normal, 2 = points doubles, 0 = hors classement.
export function calculerScores(sim, manche, anciensScores, { coef = 1 } = {}) {
  const horsClassement = coef === 0;
  const humains = sim.resultats.filter((r) => !estBot(r.id));
  const eq = sim.equipes || resultatEquipes(sim.resultats);
  const out = [];
  let rang = 0, prev = null;
  humains.forEach((r, i) => {
    const key = r.nids + "/" + r.captures + "/" + r.energie;
    if (key !== prev) rang = i + 1; prev = key;
    if (eq) {
      const x = eq[r.equipe];
      out.push({ pseudo: r.id, nids: r.nids, rang: x ? x.rang : 0, points: pointsEquipe(eq, r.equipe) * coef, bonus: 0, equipe: r.equipe });
      return;
    }
    const avant = anciensScores.filter((s) => s.pseudo === r.id && s.manche < manche && !s.duel).sort((a, b) => b.manche - a.manche)[0];
    const bonus = !horsClassement && avant && r.nids > avant.nids ? BONUS_PROGRESSION : 0;
    out.push({ pseudo: r.id, nids: r.nids, rang, points: pointsPourRang(rang) * coef, bonus, equipe: 0 });
  });
  for (const r of sim.resultats.filter((r) => estBot(r.id))) out.push({ pseudo: r.id, nids: r.nids, rang: 0, points: 0, bonus: 0, equipe: r.equipe || 0 });
  for (const o of out) { o.nouveaute = sim.twist; o.duel = horsClassement; }
  return out;
}

// Classement cumulé (hors duel)
export function classementCumule(scores) {
  const tot = {};
  for (const s of scores) {
    if (estBot(s.pseudo) || s.duel) continue;
    const t = tot[s.pseudo] ||= { pseudo: s.pseudo, points: 0, bonus: 0, nids: 0, manches: 0, parManche: {} };
    t.points += s.points; t.bonus += s.bonus; t.nids += s.nids; t.manches++; t.parManche[s.manche] = s;
  }
  const arr = Object.values(tot).map((t) => ({ ...t, total: t.points + t.bonus }));
  arr.sort((a, b) => b.total - a.total || b.nids - a.nids || a.pseudo.localeCompare(b.pseudo));
  let rang = 0, prev = null;
  arr.forEach((t, i) => { const k = t.total + "/" + t.nids; if (k !== prev) rang = i + 1; prev = k; t.rang = rang; });
  return arr;
}

// Meilleure progression : différence de nids entre la dernière et la première manche jouée
export function meilleureProgression(scores) {
  const par = {};
  for (const s of scores) {
    if (estBot(s.pseudo) || s.duel) continue;
    (par[s.pseudo] ||= []).push(s);
  }
  let best = null;
  for (const [p, l] of Object.entries(par)) {
    if (l.length < 2) continue;
    l.sort((a, b) => a.manche - b.manche);
    const gain = l[l.length - 1].nids - l[0].nids;
    if (!best || gain > best.gain) best = { pseudo: p, gain, de: l[0].nids, a: l[l.length - 1].nids };
  }
  return best && best.gain > 0 ? best : null;
}
