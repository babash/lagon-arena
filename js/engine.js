// =====================================================================
//  Lagon Arena — moteur de simulation (déterministe)
//  Même graine + mêmes codes  =>  exactement le même match, sur tout navigateur.
// =====================================================================
import { runTurn, check, SENSORS } from "./interp.js";

// ---------- générateur pseudo-aléatoire (mulberry32) ----------
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- la carte du lagon (24 x 14) ----------
//  .  eau   #  corail   h  herbier   P  plage   T  départ des tortues
export const MAP = [
  "PP.....#.........#......",
  "PPh....##.......hh......",
  "PPhh.........h.....#....",
  "PP.......hh.............",
  "PP..#.............##....",
  "PP....TTTTTTTTT.....PPP.",
  "PP..h.T.......T..h..PPP.",
  "PP..h.T...h...T..h..PPP.",
  "PP....TTTTTTTTT.....PPP.",
  "PP..#.............##....",
  "PP.......hh.............",
  "PPhh.........h.....#....",
  "PPh....##.......hh......",
  "PP.....#.........#......",
];
export const W = MAP[0].length, H = MAP.length;
export const TICKS = 180;              // durée d'un match (en tours)
export const SHARK_STARTS = [[21, 3], [21, 10], [11, 0], [11, 13], [23, 0], [23, 13]];

// Réglages du jeu (équilibrés par simulation : voir le README)
export const P = {
  energieDepart: 8, energieMax: 10,
  energiePonte: 6,      // énergie minimale pour pondre
  coutPonte: 4,         // pondre coûte 4 d'énergie
  gainAlgue: 3,         // manger une algue rapporte 3
  pertePlastique: 3,    // avaler un sac plastique fait perdre 3
  perteEnergie: 6,      // l'énergie baisse de 1 tous les 6 tours
  algueMax: 3, repousse: 8,   // chaque herbier a 3 portions d'algues, +1 tous les 8 tours
  bloquee: 5,           // tours bloquée après un épuisement
  bloqueeCapture: 5,    // tours bloquée après une capture
  perteCapture: 0,      // énergie perdue quand un requin attrape la tortue
  nidPerduCapture: true, // attrapée par un requin : −1 nid (s'il y en a)
  porteeRequin: 3,      // requin_proche() : un requin à 3 cases ou moins
};

const TILE = { ".": "eau", "#": "corail", "h": "herbier", "P": "plage", "T": "eau" };
export const tileAt = (x, y) => TILE[MAP[y][x]];
const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const manh = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const SPAWNS = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (MAP[y][x] === "T") SPAWNS.push([x, y]);

// ---------- les nouveautés de manche ----------
export const TWISTS = {
  calme:     { nom: "Lagon calme", icone: "🌊", texte: "3 requins tranquilles et quelques sacs plastique.", requins: 3, rapides: false, vision: 4, plastiques: 4, plastiqueHerbier: false, nuit: [19, 6] },
  plastique: { nom: "Invasion de plastique", icone: "🛍️", texte: "22 sacs plastique dérivent, surtout sur les herbiers !", requins: 3, rapides: false, vision: 4, plastiques: 22, plastiqueHerbier: true, nuit: [19, 6] },
  affames:   { nom: "Requins affamés", icone: "🦈", texte: "5 requins rapides qui voient plus loin.", requins: 5, rapides: true, vision: 5, plastiques: 4, plastiqueHerbier: false, nuit: [19, 6] },
  nuits:     { nom: "Nuits courtes", icone: "🌙", texte: "La nuit ne dure que de 21 h à 4 h : il faut anticiper.", requins: 3, rapides: false, vision: 4, plastiques: 4, plastiqueHerbier: false, nuit: [21, 4] },
  finale:    { nom: "Finale : requins affamés et nuits courtes", icone: "🏆", texte: "5 requins rapides, et la nuit ne dure que de 21 h à 4 h.", requins: 5, rapides: true, vision: 5, plastiques: 6, plastiqueHerbier: false, nuit: [21, 4] },
  tempete:   { nom: "Tempête : tout à la fois", icone: "⛈️", texte: "Requins affamés, invasion de plastique et nuits courtes.", requins: 5, rapides: true, vision: 5, plastiques: 22, plastiqueHerbier: true, nuit: [21, 4] },
};
export const TWIST_ORDER = ["calme", "plastique", "finale"];
export const TWIST_DUEL = "tempete";

export const heureDe = (tick, depart = 8) => (depart + Math.floor(tick * 24 / 60)) % 24;
export const estNuit = (h, nuit) => h >= nuit[0] || h < nuit[1];

// ---------- distances (parcours en largeur) ----------
function bfs(sources, passable) {
  const d = Array.from({ length: H }, () => Array(W).fill(Infinity));
  const q = [];
  for (const [x, y] of sources) { d[y][x] = 0; q.push([x, y]); }
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (inside(nx, ny) && passable(nx, ny) && d[ny][nx] === Infinity) { d[ny][nx] = d[y][x] + 1; q.push([nx, ny]); }
    }
  }
  return d;
}
const turtleOK = (x, y) => tileAt(x, y) !== "corail";
const sharkOK = (x, y) => { const t = tileAt(x, y); return t === "eau" || t === "herbier"; };
export const BEACHES = [], HERBIERS = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (tileAt(x, y) === "plage") BEACHES.push([x, y]);
  if (tileAt(x, y) === "herbier") HERBIERS.push([x, y]);
}
const DIST_PLAGE = bfs(BEACHES, turtleOK);

function stepDown(dist, x, y) {
  let best = null, bd = dist[y][x];
  for (const [dx, dy] of DIRS) {
    const nx = x + dx, ny = y + dy;
    if (inside(nx, ny) && turtleOK(nx, ny) && dist[ny][nx] < bd) { bd = dist[ny][nx]; best = [nx, ny]; }
  }
  return best;
}

// ---------- tortue de départ et tortues d'entraînement ----------
export const STARTER = `def tour():
    if requin_proche():
        fuir()
    elif est_la_nuit() and sur_plage():
        pondre()
    elif est_la_nuit():
        aller_vers_plage()
    elif algue_ici():
        manger()
    else:
        aller_vers_algue()
`;
// Le code que reçoit chaque élève au début de la séance : sa tortue mange, mais ne pond jamais.
// C'est aussi la tortue qui joue si un élève n'envoie rien.
export const CODE_DEPART = `def tour():
    # Elle sait manger, mais ne pond jamais !
    # Améliore-la avec if / elif / else.
    if algue_ici():
        manger()
    else:
        aller_vers_algue()
`;
export const BOTS = [
  { nom: "Bulle", niveau: "facile", code: `def tour():
    if algue_ici():
        manger()
    else:
        aller_vers_algue()
` },
  { nom: "Gourmande", niveau: "facile", code: `def tour():
    if algue_ici():
        manger()
    elif requin_proche():
        fuir()
    elif est_la_nuit() and sur_plage():
        pondre()
    elif est_la_nuit():
        aller_vers_plage()
    else:
        aller_vers_algue()
` },
  { nom: "Prudente", niveau: "moyen", code: STARTER },
  { nom: "Maline", niveau: "moyen", code: `def tour():
    if requin_proche() and algue_ici():
        se_cacher()
    elif requin_proche():
        fuir()
    elif est_la_nuit() and sur_plage() and energie() >= 6:
        pondre()
    elif est_la_nuit() and energie() >= 6:
        aller_vers_plage()
    elif algue_ici() and not plastique_ici():
        manger()
    else:
        aller_vers_algue()
` },
  { nom: "Championne", niveau: "difficile", code: `def tour():
    if requin_proche() and algue_ici():
        se_cacher()
    elif requin_proche() and not sur_plage():
        fuir()
    elif sur_plage() and est_la_nuit() and energie() >= 6:
        pondre()
    elif energie() >= 9 and heure() >= 16:
        aller_vers_plage()
    elif est_la_nuit() and energie() >= 6:
        aller_vers_plage()
    elif algue_ici() and not plastique_ici() and energie() < 10:
        manger()
    else:
        aller_vers_algue()
` },
];

export const COULEURS = ["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#42d4f4", "#f032e6",
  "#bfef45", "#fabed4", "#469990", "#dcbeff", "#9a6324", "#fffac8", "#800000", "#aaffc3", "#808000", "#ffd8b1", "#000075", "#a9a9a9"];

// =====================================================================
//  simulate({ joueurs:[{id, nom, couleur, code}], graine, twist, ticks, scenario })
//  scenario (tutoriel) : { energie, requins:[[x,y]], plastiques:[[x,y]], heureDepart, spawn:[x,y], ticks }
// =====================================================================
export function simulate({ joueurs, graine = 1, twist = "calme", ticks, scenario = null }) {
  const T = TWISTS[twist] || TWISTS.calme;
  const sc = scenario || {};
  ticks = ticks || sc.ticks || TICKS;
  const heureDepart = sc.heureDepart ?? 8;
  const R = rng(graine);
  const ri = (n) => Math.floor(R() * n);

  // --- départs des tortues (mélangés par la graine) ---
  const spawnOrder = SPAWNS.map((s, i) => i);
  for (let i = spawnOrder.length - 1; i > 0; i--) { const j = ri(i + 1); [spawnOrder[i], spawnOrder[j]] = [spawnOrder[j], spawnOrder[i]]; }
  const sorted = [...joueurs].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const turtles = sorted.map((j, i) => {
    const sp = sc.spawn && i === 0 ? sc.spawn : SPAWNS[spawnOrder[i % SPAWNS.length]];
    const c = check(j.code || "");
    return {
      id: j.id, nom: j.nom, couleur: j.couleur, x: sp[0], y: sp[1], sx: sp[0], sy: sp[1], dir: 1,
      energie: sc.energie ?? P.energieDepart, nids: 0, bloquee: 0, immunite: 0, mange: false,
      compiled: c.ok ? c.compiled : null, compileError: c.ok ? null : c.error,
      stats: { captures: [], plastiques: [], epuisee: [], refus: {}, rienAManger: 0, pasFaim: 0, immobile: 0, erreurs: 0, actions: {}, pontes: [], repas: 0, energieMax: sc.energie ?? P.energieDepart },
    };
  });

  // --- herbiers, plastiques, requins ---
  const algues = {}; for (const [x, y] of HERBIERS) algues[x + "," + y] = P.algueMax;
  const waterCells = [];
  const spawnSet = new Set(SPAWNS.map(([x, y]) => x + "," + y));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (tileAt(x, y) === "eau" && !spawnSet.has(x + "," + y)) waterCells.push([x, y]);
  function randomPlasticCell(onHerbier) {
    const pool = onHerbier && R() < 0.8 ? HERBIERS : waterCells;
    return pool[ri(pool.length)];
  }
  const plastics = sc.plastiques
    ? sc.plastiques.map(([x, y]) => ({ x, y, retour: 0, fixe: true }))
    : Array.from({ length: T.plastiques }, () => { const [x, y] = randomPlasticCell(T.plastiqueHerbier); return { x, y, retour: 0 }; });
  const sharks = (sc.requins || SHARK_STARTS.slice(0, T.requins)).map(([x, y]) => ({ x, y, sx: x, sy: y, repos: 0, wp: null, fx: 0, fy: 0 }));
  // patrouille : sans proie en vue, un requin traverse le lagon vers un point choisi au hasard
  // (il ne tourne pas en rond au même endroit, ce qui bloquerait les tortues cachées)
  const sharkCells = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (sharkOK(x, y)) sharkCells.push([x, y]);
  const distPatrouille = new Map();
  const versPoint = ([x, y]) => { const k = x + "," + y; if (!distPatrouille.has(k)) distPatrouille.set(k, bfs([[x, y]], sharkOK)); return distPatrouille.get(k); };
  const nuitDe = (tick) => estNuit(heureDe(tick, heureDepart), T.nuit);

  const frames = [], events = [], traces = {}, nids = [];
  for (const t of turtles) traces[t.id] = [];

  const hasPlastic = (x, y) => plastics.some((p) => p.retour === 0 && p.x === x && p.y === y);
  const algueIci = (x, y) => tileAt(x, y) === "herbier" && algues[x + "," + y] > 0;
  // cachée = dans des algues ET ne mange pas ce tour-ci (manger fait bouger les algues)
  const cachee = (t) => algueIci(t.x, t.y) && !t.mange;
  const protegee = (t) => t.bloquee > 0 || t.immunite > 0 || cachee(t) || tileAt(t.x, t.y) === "plage";

  function snapshot(tick) {
    frames.push({
      tick, heure: heureDe(tick, heureDepart), nuit: nuitDe(tick),
      tortues: turtles.map((t) => [t.x, t.y, t.energie, t.nids, t.bloquee, t.immunite, t.dir, cachee(t) ? 1 : 0]),
      requins: sharks.map((s) => [s.x, s.y, s.repos, s.fx, s.fy]),
      plastiques: plastics.filter((p) => p.retour === 0).map((p) => [p.x, p.y]),
      algues: HERBIERS.map(([x, y]) => algues[x + "," + y]),
      nids: nids.length,
    });
  }
  snapshot(0);

  for (let tick = 0; tick < ticks; tick++) {
    const heure = heureDe(tick, heureDepart), nuit = nuitDe(tick);
    // distances vers les algues propres (avec des algues et sans plastique)
    const distAlgue = bfs(HERBIERS.filter(([x, y]) => algues[x + "," + y] > 0 && !hasPlastic(x, y)), turtleOK);
    const order = turtles.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = ri(i + 1); [order[i], order[j]] = [order[j], order[i]]; }

    for (const idx of order) {
      const t = turtles[idx];
      t.mange = false;
      const rec = { tick, x: t.x, y: t.y, energie: t.energie };
      if (t.bloquee > 0) { t.bloquee--; rec.bloquee = true; traces[t.id].push(rec); continue; }
      if (!t.compiled) {
        rec.erreur = t.compileError ? `Ligne ${t.compileError.line} : ${t.compileError.message}` : "Pas de code";
        t.stats.immobile++; traces[t.id].push(rec); continue;
      }
      const sensors = {
        requin_proche: () => sharks.some((s) => manh(s, t) <= P.porteeRequin),
        algue_ici: () => algueIci(t.x, t.y),
        plastique_ici: () => hasPlastic(t.x, t.y),
        sur_plage: () => tileAt(t.x, t.y) === "plage",
        est_la_nuit: () => nuit,
        energie: () => t.energie,
        heure: () => heure,
      };
      rec.capteurs = {};
      for (const k of Object.keys(SENSORS)) rec.capteurs[k] = sensors[k]();
      const tr = runTurn(t.compiled, sensors);
      rec.conds = tr.conds; rec.action = tr.action; rec.ligne = tr.actionLine;
      if (tr.extra.length) rec.extra = tr.extra;
      if (tr.error) { rec.erreur = tr.error; t.stats.erreurs++; }
      t.stats.actions[tr.action || "aucune"] = (t.stats.actions[tr.action || "aucune"] || 0) + 1;
      const move = (nx, ny) => { if (nx !== t.x) t.dir = nx > t.x ? 1 : 3; else if (ny !== t.y) t.dir = ny > t.y ? 2 : 0; t.x = nx; t.y = ny; };

      switch (tr.action) {
        case null: t.stats.immobile++; rec.effet = "aucune action"; break;
        case "manger": {
          const k = t.x + "," + t.y;
          t.mange = true;
          if (hasPlastic(t.x, t.y)) {
            const p = plastics.find((p) => p.retour === 0 && p.x === t.x && p.y === t.y);
            p.retour = p.fixe ? 9999 : 25; t.energie -= P.pertePlastique;
            t.stats.plastiques.push({ tick, ligne: tr.actionLine });
            events.push({ tick, type: "plastique", id: t.id }); rec.effet = "a avalé un sac plastique (−3)";
          } else if (algueIci(t.x, t.y)) {
            if (t.energie >= P.energieMax) { t.stats.pasFaim++; rec.effet = "n'a plus faim (énergie déjà à 10)"; }
            else { t.energie = Math.min(P.energieMax, t.energie + P.gainAlgue); algues[k]--; t.stats.repas++; rec.effet = "mange une algue (+3)"; }
          } else { t.stats.rienAManger++; rec.effet = "rien à manger ici"; }
          break;
        }
        case "pondre": {
          let raison = null;
          if (tileAt(t.x, t.y) !== "plage") raison = "pas sur une plage";
          else if (!nuit) raison = "il fait jour";
          else if (t.energie < P.energiePonte) raison = "pas assez d'énergie";
          if (raison) { t.stats.refus[raison] = (t.stats.refus[raison] || 0) + 1; rec.effet = "pondre() refusé : " + raison; }
          else {
            t.nids++; t.energie -= P.coutPonte; t.stats.pontes.push(tick);
            nids.push({ tick, x: t.x, y: t.y, id: t.id });
            events.push({ tick, type: "nid", id: t.id, n: t.nids, x: t.x, y: t.y }); rec.effet = `pond un nid ! (${t.nids})`;
          }
          break;
        }
        case "se_cacher":
          rec.effet = algueIci(t.x, t.y) ? "cachée dans les algues" : "reste sur place (pas d'algues pour se cacher)";
          break;
        case "fuir": {
          let best = [t.x, t.y], bestScore = -1;
          for (const [x, y] of [[t.x, t.y], ...DIRS.map(([dx, dy]) => [t.x + dx, t.y + dy])]) {
            if (!inside(x, y) || !turtleOK(x, y)) continue;
            const dmin = sharks.length ? Math.min(...sharks.map((s) => Math.abs(s.x - x) + Math.abs(s.y - y))) : 99;
            // fuir = s'éloigner, et surtout rejoindre un refuge (plage, ou algues où l'on est caché)
            const refuge = tileAt(x, y) === "plage" || algueIci(x, y);
            const sc2 = dmin + (refuge ? 100 : 0);
            if (sc2 > bestScore) { bestScore = sc2; best = [x, y]; }
          }
          move(best[0], best[1]);
          rec.effet = tileAt(t.x, t.y) === "plage" ? "fuit (à l'abri sur la plage)" : algueIci(t.x, t.y) ? "fuit (cachée dans les algues)" : "fuit";
          break;
        }
        case "aller_vers_algue": {
          const s = stepDown(distAlgue, t.x, t.y);
          if (s) move(s[0], s[1]);
          else rec.effet = distAlgue[t.y][t.x] === 0 ? "déjà sur des algues : il faudrait manger()" : "aucune algue propre disponible";
          break;
        }
        case "aller_vers_plage": {
          const s = stepDown(DIST_PLAGE, t.x, t.y);
          if (s) move(s[0], s[1]); else rec.effet = "déjà sur la plage";
          break;
        }
      }
      t.stats.energieMax = Math.max(t.stats.energieMax, t.energie);
      traces[t.id].push(rec);
    }

    // --- les requins bougent (2 tours sur 3, ou à chaque tour s'ils sont affamés) ---
    const moveTick = T.rapides || tick % 3 !== 2;
    for (const s of sharks) {
      if (s.repos > 0) { s.repos--; continue; }
      if (!moveTick) continue;
      let cible = null, cd = Infinity;
      for (const t of turtles) {
        if (protegee(t)) continue;
        const d = manh(s, t);
        if (d <= T.vision && d < cd) { cd = d; cible = t; }
      }
      let nx = s.x, ny = s.y;
      if (cible) {
        const dm = bfs([[cible.x, cible.y]], sharkOK);
        let bd = Infinity;
        for (const [dx, dy] of DIRS) {
          const ax = s.x + dx, ay = s.y + dy;
          if (inside(ax, ay) && sharkOK(ax, ay) && dm[ay][ax] < bd) { bd = dm[ay][ax]; nx = ax; ny = ay; }
        }
      } else {
        if (!s.wp || (s.x === s.wp[0] && s.y === s.wp[1]) || R() < 0.03) s.wp = sharkCells[ri(sharkCells.length)];
        const dm = versPoint(s.wp);
        let bd = dm[s.y][s.x];
        for (const [dx, dy] of DIRS) {
          const ax = s.x + dx, ay = s.y + dy;
          if (inside(ax, ay) && sharkOK(ax, ay) && dm[ay][ax] < bd) { bd = dm[ay][ax]; nx = ax; ny = ay; }
        }
      }
      if (nx !== s.x || ny !== s.y) { s.fx = nx - s.x; s.fy = ny - s.y; }
      s.x = nx; s.y = ny;
    }
    // --- captures ---
    for (const s of sharks) {
      if (s.repos > 0) continue;
      for (const t of turtles) {
        if (t.x !== s.x || t.y !== s.y || protegee(t)) continue;
        const last = traces[t.id][traces[t.id].length - 1];
        // un requin qui attrape la tortue lui fait perdre un nid (s'il y en a)
        let perdu = false;
        if (P.nidPerduCapture && t.nids > 0) {
          t.nids--; perdu = true;
          const nd = [...nids].reverse().find((n) => n.id === t.id && n.perdu == null);
          if (nd) nd.perdu = tick;
        }
        t.stats.captures.push({ tick, ligne: last && last.ligne, action: last && last.action, perdu });
        events.push({ tick, type: "capture", id: t.id, perdu });
        if (last) last.effet = (last.effet ? last.effet + " — " : "") + "ATTRAPÉE par un requin !" + (perdu ? " (−1 nid)" : "");
        t.x = t.sx; t.y = t.sy; t.bloquee = P.bloqueeCapture; t.immunite = P.bloqueeCapture + 3;
        t.energie = Math.max(1, t.energie - P.perteCapture);   // la morsure fatigue
        s.x = s.sx; s.y = s.sy; s.repos = 6;     // le requin repart au large et digère
        break;
      }
    }
    // --- environnement : énergie, algues, plastiques ---
    for (const t of turtles) {
      if (t.immunite > 0) t.immunite--;
      if (tick % P.perteEnergie === P.perteEnergie - 1 && t.bloquee === 0) t.energie--;
      if (t.energie <= 0) {
        t.stats.epuisee.push(tick); events.push({ tick, type: "epuisee", id: t.id });
        const last = traces[t.id][traces[t.id].length - 1];
        if (last) last.effet = (last.effet ? last.effet + " — " : "") + "ÉPUISÉE (énergie à 0) !";
        t.x = t.sx; t.y = t.sy; t.bloquee = P.bloquee; t.immunite = P.bloquee + 3; t.energie = 5;
      }
    }
    if (tick % P.repousse === P.repousse - 1) for (const k in algues) algues[k] = Math.min(P.algueMax, algues[k] + 1);
    for (const p of plastics) {
      if (p.fixe) { if (p.retour > 0) p.retour--; continue; }
      if (p.retour > 0) { p.retour--; if (p.retour === 0) { const [x, y] = randomPlasticCell(T.plastiqueHerbier); p.x = x; p.y = y; } continue; }
      if (tick % 5 === 4) {
        const opts = DIRS.map(([dx, dy]) => [p.x + dx, p.y + dy]).filter(([x, y]) => inside(x, y) && sharkOK(x, y));
        if (opts.length && R() < 0.7) [p.x, p.y] = opts[ri(opts.length)];
      }
    }
    snapshot(tick + 1);
  }

  // --- résultats ---
  const res = turtles.map((t) => ({ id: t.id, nom: t.nom, couleur: t.couleur, nids: t.nids, captures: t.stats.captures.length, energie: t.energie }));
  res.sort((a, b) => (b.nids - a.nids) || (a.captures - b.captures) || (b.energie - a.energie) || String(a.nom).localeCompare(String(b.nom)));
  let rang = 0, prev = null;
  res.forEach((r, i) => { const key = r.nids + "/" + r.captures + "/" + r.energie; if (key !== prev) rang = i + 1; r.rang = rang; prev = key; });
  return {
    twist, graine, ticks, heureDepart, frames, events, traces, nids,
    tortues: turtles.map((t) => ({ id: t.id, nom: t.nom, couleur: t.couleur, sx: t.sx, sy: t.sy, stats: t.stats, nids: t.nids, compileError: t.compileError })),
    resultats: res,
  };
}

// ---------- points de manche ----------
export const POINTS_RANG = [25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
export const BONUS_PROGRESSION = 3;
export const pointsPourRang = (r) => POINTS_RANG[r - 1] || 1;
export const graineManche = (graineSalle, manche) => ((graineSalle * 31 + manche * 7919) % 2147483647) || 1;

// ---------- rapport de match pour une tortue ----------
const nomAction = (a) => (a ? a + "()" : "aucune action");
export function rapport(sim, id) {
  const t = sim.tortues.find((x) => x.id === id);
  if (!t) return null;
  const s = t.stats;
  const lignes = [], conseils = [];
  if (t.compileError) {
    return { lignes: [`Ta tortue n'a pas pu jouer : erreur à la ligne ${t.compileError.line}.`], conseils: [t.compileError.message], marqueurs: [] };
  }
  const perdusTot = s.captures.filter((c) => c.perdu).length;
  lignes.push(perdusTot
    ? `🥚 ${s.pontes.length} nid${s.pontes.length > 1 ? "s" : ""} pondu${s.pontes.length > 1 ? "s" : ""}, ${perdusTot} perdu${perdusTot > 1 ? "s" : ""} à cause des requins : ${t.nids} au final.`
    : `🥚 ${t.nids} nid${t.nids > 1 ? "s" : ""} pondu${t.nids > 1 ? "s" : ""}.`);
  if (s.captures.length) {
    const freq = {};
    for (const c of s.captures) { const k = c.ligne ? `la ligne ${c.ligne} : ${nomAction(c.action)}` : "aucune action"; freq[k] = (freq[k] || 0) + 1; }
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    const quoi = top[0] === "aucune action" ? "elle ne faisait aucune action" : `elle exécutait ${top[0]}`;
    const nPerdus = s.captures.filter((c) => c.perdu).length;
    lignes.push(`🦈 Attrapée ${s.captures.length} fois (tours ${s.captures.map((c) => c.tick).join(", ")})${nPerdus ? ` : −${nPerdus} nid${nPerdus > 1 ? "s" : ""}` : ""}. ` +
      (top[1] === s.captures.length ? `À chaque fois, ${quoi}.` : `Le plus souvent, ${quoi}.`));
  } else lignes.push("🦈 Jamais attrapée par un requin.");
  if (s.plastiques.length) lignes.push(`🛍️ A avalé ${s.plastiques.length} sac${s.plastiques.length > 1 ? "s" : ""} plastique (ligne ${s.plastiques[0].ligne} : manger()).`);
  if (s.epuisee.length) lignes.push(`😵 S'est épuisée ${s.epuisee.length} fois (énergie à 0).`);
  const refusTxt = Object.entries(s.refus).map(([r, n]) => `${n} × « ${r} »`).join(", ");
  if (refusTxt) lignes.push(`⛔ pondre() refusé : ${refusTxt}.`);

  // conseils (2 au maximum, du plus important au moins important) ; `code` = à écrire tel quel
  const capManger = s.captures.filter((c) => c.action === "manger").length;
  const capAutre = s.captures.filter((c) => c.action && c.action !== "fuir" && c.action !== "manger" && c.action !== "se_cacher").length;
  if (t.nids === 0 && s.pontes.length === 0) {
    if (!s.actions.pondre) conseils.push("Ta tortue ne pond jamais : 0 point ! Ajoute avant ton `else:` les lignes `elif sur_plage() and est_la_nuit():` puis `pondre()`.");
    else if (s.refus["il fait jour"] && !s.refus["pas sur une plage"]) conseils.push("`pondre()` est refusé le jour. Ajoute `and est_la_nuit()` dans la condition.");
    else if (s.refus["pas sur une plage"]) conseils.push("`pondre()` ne marche que sur la plage. La nuit, va vers la plage : `elif est_la_nuit():` puis `aller_vers_plage()`.");
  }
  if (capManger) conseils.push("Attrapée en train de manger ! Mets tout en haut : `if requin_proche():` puis `fuir()`.");
  else if (capAutre) conseils.push("Un requin était proche et ta tortue faisait autre chose. Mets le test `requin_proche()` plus haut (le premier vrai gagne).");
  else if (s.captures.length >= 2) conseils.push("Elle fuit mais se fait rattraper. Dans les algues, `se_cacher()` la rend invisible.");
  if (s.plastiques.length) conseils.push("Elle a mangé du plastique. Écris `algue_ici() and not plastique_ici()` avant `manger()`.");
  if ((s.refus["pas assez d'énergie"] || 0) >= 3) conseils.push("Elle attend sur la plage sans assez d'énergie (6 ⚡ minimum). Ajoute `and energie() >= 6`.");
  if ((s.refus["il fait jour"] || 0) >= 5 && s.pontes.length > 0) conseils.push("Elle essaie souvent de pondre en plein jour : ajoute `and est_la_nuit()`.");
  if (s.epuisee.length) conseils.push("Elle tombe à 0 ⚡. Elle doit manger quand elle a peu d'énergie : `energie() < 4`.");
  if (s.immobile > 20) conseils.push("Elle reste souvent sans rien faire. Ajoute un `else:` à la fin pour qu'elle ait toujours un ordre.");
  if (s.pasFaim > 10) conseils.push("`manger()` à 10 ⚡ ne sert à rien : pars plutôt vers la plage.");
  if (!conseils.length) conseils.push(t.nids >= 6
    ? "Très belle tortue ! Pour gagner encore : pars vers la plage avant la nuit, par exemple avec `heure() >= 16`."
    : "Pour pondre plus : remplis ton énergie le jour, puis va vers la plage un peu avant la nuit (`heure() >= 16`).");

  const marqueurs = [
    ...s.pontes.map((tick) => ({ tick, type: "nid" })),
    ...s.captures.map((c) => ({ tick: c.tick, type: "capture" })),
    ...s.plastiques.map((p) => ({ tick: p.tick, type: "plastique" })),
    ...s.epuisee.map((tick) => ({ tick, type: "epuisee" })),
  ].sort((a, b) => a.tick - b.tick);
  return { lignes, conseils: conseils.slice(0, 2), marqueurs };
}

// ---------- missions du tutoriel ----------
export const MISSIONS = [
  {
    id: 1, titre: "La tortue qui ne mange jamais", notion: "if",
    histoire: "Cette tortue va jusqu'aux algues… puis reste plantée là, le ventre vide.",
    objectif: "Atteindre 9 d'énergie en 30 tours.",
    code: `def tour():
    if algue_ici():
        aller_vers_algue()
    else:
        aller_vers_algue()
`,
    indice: "Regarde la ligne 3 : quand algue_ici() est vrai, que devrait faire la tortue ?",
    scenario: { energie: 3, requins: [], plastiques: [], spawn: [7, 6], heureDepart: 8, ticks: 30 },
    reussi: (sim) => sim.tortues[0].stats.energieMax >= 9,
    bilan: (sim) => `Énergie maximale atteinte : ${sim.tortues[0].stats.energieMax} / 10.`,
  },
  {
    id: 2, titre: "La gourmande", notion: "ordre des elif",
    histoire: "Cette tortue adore manger… même quand un requin arrive. Or manger fait bouger les algues : le requin la repère !",
    objectif: "Survivre 40 tours sans être attrapée, en mangeant au moins une fois.",
    code: `def tour():
    if algue_ici():
        manger()
    elif requin_proche():
        fuir()
    else:
        aller_vers_algue()
`,
    indice: "Python teste les conditions de haut en bas et s'arrête au premier vrai. Quel test doit passer en premier ?",
    scenario: { energie: 2, requins: [[8, 6], [6, 9]], plastiques: [], spawn: [5, 6], heureDepart: 8, ticks: 40 },
    reussi: (sim) => sim.tortues[0].stats.captures.length === 0 && sim.tortues[0].stats.repas >= 1,
    bilan: (sim) => `Attrapée ${sim.tortues[0].stats.captures.length} fois · ${sim.tortues[0].stats.repas} repas.`,
  },
  {
    id: 3, titre: "La pondeuse impatiente", notion: "and",
    histoire: "Cette tortue est sur la plage et essaie de pondre… en plein après-midi. Elle attend, attend, et s'affaiblit.",
    objectif: "Pondre au moins 1 nid en 50 tours.",
    code: `def tour():
    if sur_plage():
        pondre()
    elif est_la_nuit():
        aller_vers_plage()
    elif algue_ici():
        manger()
    else:
        aller_vers_algue()
`,
    indice: "pondre() ne marche que si la tortue est sur la plage ET qu'il fait nuit. Comment dire « et » en Python ?",
    scenario: { energie: 7, requins: [], plastiques: [], spawn: [1, 3], heureDepart: 12, ticks: 50 },
    reussi: (sim) => sim.tortues[0].nids >= 1,
    bilan: (sim) => {
      const refus = Object.entries(sim.tortues[0].stats.refus).map(([r, n]) => `${n} × « ${r} »`).join(", ");
      return `${sim.tortues[0].nids} nid(s)` + (refus ? ` · pondre() refusé : ${refus}.` : ".");
    },
  },
  {
    id: 4, titre: "Bonus : le sac plastique", notion: "not",
    histoire: "Un sac plastique flotte sur les algues. Cette tortue le confond avec de la nourriture…",
    objectif: "Manger 2 algues sans avaler de plastique, en 30 tours.",
    code: `def tour():
    if algue_ici():
        manger()
    else:
        aller_vers_algue()
`,
    indice: "Il faut manger s'il y a des algues ET PAS de plastique. « Pas » se dit not.",
    scenario: { energie: 4, requins: [], plastiques: [[4, 6]], spawn: [4, 6], heureDepart: 8, ticks: 30 },
    reussi: (sim) => sim.tortues[0].stats.plastiques.length === 0 && sim.tortues[0].stats.repas >= 2,
    bilan: (sim) => `${sim.tortues[0].stats.repas} repas · ${sim.tortues[0].stats.plastiques.length} sac(s) plastique avalé(s).`,
  },
];
