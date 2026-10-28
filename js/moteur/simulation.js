// =====================================================================
//  Lagon Arena — moteur : la SIMULATION d'une partie (déterministe)
//  Même graine + mêmes codes  =>  exactement le même match, sur tout navigateur.
//
//  simulate({ joueurs:[{id, nom, couleur, code, equipe}], graine, twist, ticks, scenario, version, leger })
//   • version : 1 = carte classique, 2 = carte aléatoire tirée de la graine (par défaut, hors scénario) ;
//   • leger   : sans images ni « pensées » (pour estimer une moyenne sur beaucoup de parties) ;
//   • scenario (tutoriels) : { energie, requins:[[x,y]], plastiques:[[x,y]], heureDepart, ticks,
//       spawn:[x,y] (1re tortue), spawns:{id:[x,y]}, herbes:[[x,y,portions]], repousse:false,
//       requinsFixes:true, energies:{id:n} }
//
//  Un tour : chaque tortue (dans un ordre tiré au hasard) lit ses capteurs et fait UNE action,
//  puis les requins bougent et attrapent, puis l'environnement évolue (énergie, algues, sacs).
// =====================================================================
import { runTurn, SENSORS } from "../interp.js";
import { DIRS, inside, bfs, VERSION_CARTE } from "./carte.js";
import { P, heureDe } from "./regles.js";
import { resultatEquipes } from "./equipes.js";
import { creerMonde } from "./monde.js";
import { capteurs } from "./capteurs.js";
import { agir } from "./actions.js";
import { deplacerRequins, captures } from "./requins.js";

export function simulate({ joueurs, graine = 1, twist = "calme", ticks, scenario = null, version = VERSION_CARTE, leger = false }) {
  const m = creerMonde({ joueurs, graine, twist, ticks, scenario, version, leger });
  m.snapshot(0);
  for (let tick = 0; tick < m.ticks; tick++) {
    const tour = debutTour(m, tick);
    const order = m.turtles.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = m.ri(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
    for (const idx of order) jouerTortue(m, m.turtles[idx], tour);
    deplacerRequins(m, tick);
    captures(m, tick);
    environnement(m, tour);
    m.snapshot(tick + 1);
  }
  return resultats(m);
}

// ce qui est commun à toutes les tortues pendant un tour
function debutTour(m, tick) {
  const heure = heureDe(tick, m.heureDepart), nuit = m.nuitDe(tick);
  // distances vers les algues propres (avec des algues et sans plastique)
  const propres = [...m.herbes.values()].filter((h) => h.n > 0 && !m.hasPlastic(h.x, h.y));
  const distAlgue = bfs(propres.map((h) => [h.x, h.y]), m.turtleOK);
  return { tick, heure, nuit, propres, distAlgue, cache: new Map() };
}

function jouerTortue(m, t, tour) {
  t.mange = false;
  const rec = { tick: tour.tick, x: t.x, y: t.y, energie: t.energie };
  if (t.bloquee > 0) { t.bloquee--; rec.bloquee = true; m.tracer(t, rec); return; }
  if (!t.compiled) {
    rec.erreur = t.compileError ? `Ligne ${t.compileError.line} : ${t.compileError.message}` : "Pas de code";
    t.stats.immobile++; m.tracer(t, rec); return;
  }
  const sensors = capteurs(m, t, tour);
  if (!m.leger) { rec.capteurs = {}; for (const k of Object.keys(SENSORS)) rec.capteurs[k] = sensors[k](); }   // pour « Dans la tête de ta tortue »
  const tr = runTurn(t.compiled, sensors);
  rec.conds = tr.conds; rec.action = tr.action; rec.ligne = tr.actionLine;
  if (tr.extra.length) rec.extra = tr.extra;
  if (tr.error) { rec.erreur = tr.error; t.stats.erreurs++; }
  t.stats.actions[tr.action || "aucune"] = (t.stats.actions[tr.action || "aucune"] || 0) + 1;
  agir(m, t, tr, rec, tour);
  t.stats.energieMax = Math.max(t.stats.energieMax, t.energie);
  m.tracer(t, rec);
}

// énergie (faim, soleil, épuisement), algues qui repoussent, sacs plastique qui dérivent
function environnement(m, tour) {
  const { tick, nuit } = tour;
  for (const t of m.turtles) {
    if (t.immunite > 0) t.immunite--;
    if (tick % P.perteEnergie === P.perteEnergie - 1 && t.bloquee === 0) t.energie--;
    // le jour, sur la plage, le soleil dessèche la tortue : elle perd de l'énergie plus vite
    if (P.soleilPlage && !nuit && m.tileAt(t.x, t.y) === "plage" && t.bloquee === 0 && tick % P.soleilPlage === P.soleilPlage - 1) {
      t.energie--; t.stats.soleil = (t.stats.soleil || 0) + 1;
    }
    if (t.energie <= 0) {
      t.stats.epuisee.push(tick); m.events.push({ tick, type: "epuisee", id: t.id });
      const last = m.derniereTrace(t);
      if (last) last.effet = (last.effet ? last.effet + " — " : "") + "ÉPUISÉE (énergie à 0) !";
      t.x = t.sx; t.y = t.sy; t.bloquee = P.bloquee; t.immunite = P.bloquee + 3; t.energie = 5;
    }
  }
  for (const h of m.herbes.values()) delete h.ne;
  const rep = m.repousses;
  for (let i = rep.length - 1; i >= 0; i--) if (--rep[i] <= 0) { rep.splice(i, 1); m.nouvelleTouffe(); }
  const { T, R, ri, sharkOK } = m;
  for (const p of m.plastics) {
    if (p.fixe) { if (p.retour > 0) p.retour--; continue; }
    if (p.retour > 0) { p.retour--; if (p.retour === 0) { [p.x, p.y] = m.randomPlasticCell(T.plastiqueHerbier); p.vie = m.vieSac(); } continue; }
    if (--p.vie <= 0) { [p.x, p.y] = m.randomPlasticCell(T.plastiqueHerbier); p.vie = m.vieSac(); continue; }   // le sac coule, un autre arrive ailleurs
    if (tick % 5 === 4) {
      const opts = DIRS.map(([dx, dy]) => [p.x + dx, p.y + dy]).filter(([x, y]) => inside(x, y) && sharkOK(x, y));
      if (opts.length && R() < 0.7) [p.x, p.y] = opts[ri(opts.length)];
    }
  }
}

function resultats(m) {
  const { turtles } = m;
  const res = turtles.map((t) => ({ id: t.id, nom: t.nom, couleur: t.couleur, nids: t.nids, captures: t.stats.captures.length, energie: t.energie }));
  res.sort((a, b) => (b.nids - a.nids) || (a.captures - b.captures) || (b.energie - a.energie) || String(a.nom).localeCompare(String(b.nom)));
  let rang = 0, prev = null;
  res.forEach((r, i) => { const key = r.nids + "/" + r.captures + "/" + r.energie; if (key !== prev) rang = i + 1; r.rang = rang; prev = key; });
  for (const r of res) r.equipe = turtles.find((t) => t.id === r.id).equipe;
  return {
    twist: m.twist, graine: m.graine, ticks: m.ticks, heureDepart: m.heureDepart,
    frames: m.frames, events: m.events, traces: m.traces, nids: m.nids, version: m.version, carte: m.C.lignes,
    tortues: turtles.map((t) => ({ id: t.id, nom: t.nom, couleur: t.couleur, equipe: t.equipe, sx: t.sx, sy: t.sy, stats: t.stats, nids: t.nids, compileError: t.compileError })),
    resultats: res,
    equipes: resultatEquipes(turtles.map((t) => ({ id: t.id, nom: t.nom, equipe: t.equipe, nids: t.nids }))),
  };
}
