// =====================================================================
//  Lagon Arena — logique commune d'un brawl (utilisée par le prof ET par les élèves,
//  pour que chacun puisse rejouer exactement le même match sur son poste).
// =====================================================================
import { simulate, BOTS, CODE_DEPART, graineManche, pointsPourRang, BONUS_PROGRESSION } from "./engine.js";

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
  return { manche, pseudos: l.map((s) => s.pseudo), twist: l[0].nouveaute || "calme", duel: !!l[0].duel };
}
export const aDepose = (pseudo, manche, tortues) => tortues.some((t) => t.pseudo === pseudo && t.manche === manche);

export function construireJoueurs(pseudos, joueurs, tortues, manche) {
  return pseudos.map((p, i) => {
    const j = joueurs.find((x) => x.pseudo === p);
    return { id: p, nom: estBot(p) ? p.slice(BOT_PREFIXE.length) + " 🤖" : p, couleur: j ? j.couleur : BOT_COULEURS[i % BOT_COULEURS.length], code: codeDe(p, manche, tortues) };
  });
}

export function lancerSimulation(salle, manche, pseudos, joueurs, tortues, twist, remplacer = null) {
  const liste = construireJoueurs(pseudos, joueurs, tortues, manche);
  if (remplacer) for (const j of liste) if (j.id === remplacer.pseudo) j.code = remplacer.code;
  return simulate({ joueurs: liste, graine: graineManche(salle.graine, manche), twist });
}

// Scores de la manche : rang parmi les humains, points selon le rang, bonus si progrès.
export function calculerScores(sim, manche, anciensScores, duel = false) {
  const humains = sim.resultats.filter((r) => !estBot(r.id));
  const out = [];
  let rang = 0, prev = null;
  humains.forEach((r, i) => {
    const key = r.nids + "/" + r.captures + "/" + r.energie;
    if (key !== prev) rang = i + 1; prev = key;
    const avant = anciensScores.filter((s) => s.pseudo === r.id && s.manche < manche && !s.duel).sort((a, b) => b.manche - a.manche)[0];
    const bonus = !duel && avant && r.nids > avant.nids ? BONUS_PROGRESSION : 0;
    out.push({ pseudo: r.id, nids: r.nids, rang, points: duel ? 0 : pointsPourRang(rang), bonus });
  });
  for (const r of sim.resultats.filter((r) => estBot(r.id))) out.push({ pseudo: r.id, nids: r.nids, rang: 0, points: 0, bonus: 0 });
  for (const o of out) { o.nouveaute = sim.twist; o.duel = !!duel; }
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
