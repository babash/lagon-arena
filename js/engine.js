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
//  .  eau   #  corail   h  herbier AU DÉPART   P  plage   T  départ des tortues
//  Les herbiers bougent : une touffe mangée jusqu'au bout disparaît, une autre pousse ailleurs.
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

// Réglages du jeu (équilibrés par simulation : node outils/verifier.mjs)
export const P = {
  energieDepart: 8, energieMax: 10,
  energiePonte: 6,      // énergie minimale pour pondre
  coutPonte: 4,         // pondre coûte 4 d'énergie
  gainAlgue: 3,         // manger une algue rapporte 3
  pertePlastique: 3,    // avaler un sac plastique fait perdre 3
  perteEnergie: 6,      // l'énergie baisse de 1 tous les 6 tours
  portionsHerbier: 5,   // une touffe d'algues = 5 repas, puis elle disparaît…
  delaiRepousse: 6,     // … et une nouvelle touffe pousse ailleurs 6 tours plus tard
  distPlageRepousse: 2, // les nouvelles touffes poussent à 2 cases ou plus de la plage
  soleilPlage: 3,       // le jour, sur la plage : −1 ⚡ de plus tous les 3 tours (0 = désactivé)
  viePlastique: 30,     // un sac dérive environ 30 à 60 tours puis réapparaît ailleurs
  bloquee: 5,           // tours bloquée après un épuisement
  bloqueeCapture: 5,    // tours bloquée après une capture
  perteCapture: 0,      // énergie perdue quand un requin attrape la tortue
  nidPerduCapture: true, // attrapée par un requin : −1 nid (s'il y en a)
  porteeRequin: 3,      // requin_proche() : un requin à 3 cases ou moins
  coutPousse: 2,        // pousser() une tortue voisine coûte 2 d'énergie
  don: 3,               // donner() : 3 d'énergie passent à une équipière collée à moi
  protectionEquipe: true, // deux équipières collées : les requins n'attaquent pas
};
// Équipes : de 2 à MAX_EQUIPES. Chaque numéro d'équipe a automatiquement son nom, son icône et sa couleur.
export const EQUIPES = {
  1: { nom: "Bleue", icone: "🔵", couleur: "#2f6fdb" },
  2: { nom: "Rouge", icone: "🔴", couleur: "#e5484d" },
  3: { nom: "Verte", icone: "🟢", couleur: "#1f9d55" },
  4: { nom: "Jaune", icone: "🟡", couleur: "#e0a800" },
  5: { nom: "Violette", icone: "🟣", couleur: "#8b5cf6" },
  6: { nom: "Orange", icone: "🟠", couleur: "#f07c1a" },
};
export const MAX_EQUIPES = Object.keys(EQUIPES).length;
export const equipeInfo = (e) => EQUIPES[e] || { nom: "?", icone: "⚪", couleur: "#8a99a6" };
// couleur d'équipe avec transparence, et variables CSS (--eq, --eq-fond, --eq-bord) pour les cartes
export function rgbaEquipe(e, a) {
  const h = equipeInfo(e).couleur;
  return `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;
}
export const styleEquipe = (e) => `--eq:${equipeInfo(e).couleur};--eq-fond:${rgbaEquipe(e, 0.13)};--eq-bord:${rgbaEquipe(e, 0.5)}`;

const TILE = { ".": "eau", "#": "corail", "h": "eau", "P": "plage", "T": "eau" };
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
  nuits:     { nom: "Nuits courtes", icone: "🌙", texte: "La nuit ne dure que de 20 h à 5 h : il faut anticiper.", requins: 3, rapides: false, vision: 4, plastiques: 4, plastiqueHerbier: false, nuit: [20, 5] },
  finale:    { nom: "Finale : requins affamés et nuits courtes", icone: "🏆", texte: "5 requins rapides, et la nuit ne dure que de 20 h à 5 h.", requins: 5, rapides: true, vision: 5, plastiques: 6, plastiqueHerbier: false, nuit: [20, 5] },
  tempete:   { nom: "Tempête : tout à la fois", icone: "⛈️", texte: "Requins affamés, invasion de plastique et nuits courtes.", requins: 5, rapides: true, vision: 5, plastiques: 22, plastiqueHerbier: true, nuit: [20, 5] },
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
const sharkOK = (x, y) => tileAt(x, y) === "eau";
export const BEACHES = [], HERBIERS_DEPART = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (tileAt(x, y) === "plage") BEACHES.push([x, y]);
  if (MAP[y][x] === "h") HERBIERS_DEPART.push([x, y]);
}
export const HERBIERS = HERBIERS_DEPART;   // (ancien nom)
const DIST_PLAGE = bfs(BEACHES, turtleOK);
export const distancePlage = (x, y) => DIST_PLAGE[y][x];

function stepDown(dist, x, y, passable = turtleOK) {
  let best = null, bd = dist[y][x];
  for (const [dx, dy] of DIRS) {
    const nx = x + dx, ny = y + dy;
    if (inside(nx, ny) && passable(nx, ny) && dist[ny][nx] < bd) { bd = dist[ny][nx]; best = [nx, ny]; }
  }
  return best;
}

// =====================================================================
//  Les cartes
//   • version 1 : la carte classique ci-dessus (manches jouées avant les cartes aléatoires,
//     tutoriels et missions) ;
//   • version 2 : une carte ALÉATOIRE par partie, tirée de la graine (même graine = même carte,
//     pour que chacun puisse rejouer exactement le même match) : corail, herbiers, départs
//     des tortues et des requins. Les plages ne bougent pas.
//  Chaque carte aléatoire est vérifiée (carteSansBlocage) : pas de zone fermée, pas de cul-de-sac.
// =====================================================================
export const VERSION_CARTE = 2;
function preparerCarte(lignes, { spawns = null, requins = SHARK_STARTS, aleatoire = false } = {}) {
  const tuile = (x, y) => TILE[lignes[y][x]];
  const ok = (x, y) => tuile(x, y) !== "corail";
  const okRequin = (x, y) => tuile(x, y) === "eau";
  const plages = [], herbiers = [], departs = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (tuile(x, y) === "plage") plages.push([x, y]);
    if (lignes[y][x] === "h") herbiers.push([x, y]);
    if (lignes[y][x] === "T") departs.push([x, y]);
  }
  return { lignes, tuile, turtleOK: ok, sharkOK: okRequin, plages, herbiers, spawns: spawns || departs, requins, distPlage: bfs(plages, ok), aleatoire };
}
export const CARTE_CLASSIQUE = preparerCarte(MAP);

// Une carte sans blocage :
//  1. toutes les cases sans corail communiquent (une tortue peut aller partout : algues, plages…) ;
//  2. toute l'eau communique (un requin peut patrouiller partout : pas de cachette hors d'atteinte) ;
//  3. pas de cul-de-sac : chaque case sans corail a au moins 2 voisines sans corail ;
//  4. les départs sont sur l'eau libre (pas sur le corail, la plage ou les algues), tous différents ;
//  5. les requins partent dans l'eau, au large (loin des plages) et loin des tortues.
export function carteSansBlocage(C, { distRequin = 5 } = {}) {
  const cases = [], eaux = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (C.turtleOK(x, y)) cases.push([x, y]);
    if (C.sharkOK(x, y)) eaux.push([x, y]);
  }
  if (!cases.length || !eaux.length) return false;
  const d1 = bfs([cases[0]], C.turtleOK);
  if (cases.some(([x, y]) => d1[y][x] === Infinity)) return false;
  const d2 = bfs([eaux[0]], C.sharkOK);
  if (eaux.some(([x, y]) => d2[y][x] === Infinity)) return false;
  for (const [x, y] of cases) if (DIRS.filter(([dx, dy]) => inside(x + dx, y + dy) && C.turtleOK(x + dx, y + dy)).length < 2) return false;
  const vus = new Set();
  for (const [x, y] of C.spawns) {
    const k = x + "," + y;
    if (vus.has(k) || C.tuile(x, y) !== "eau" || C.lignes[y][x] === "h") return false;
    vus.add(k);
  }
  for (const [x, y] of C.requins) {
    if (!C.sharkOK(x, y)) return false;
    if (C.aleatoire && C.distPlage[y][x] < 4) return false;   // départ au large, loin des plages
    if (C.spawns.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < distRequin)) return false;
  }
  return true;
}

// Carte aléatoire tirée de la graine (nbTortues départs). Si un tirage n'est pas valable, on en tire un autre.
export function genererCarte(graine, nbTortues = 8) {
  const n = Math.max(1, nbTortues);
  const base = preparerCarte(MAP.map((l) => l.replace(/[^P]/g, ".")));
  const dP0 = base.distPlage;
  for (let essai = 0; essai < 80; essai++) {
    const R = rng((Math.imul((graine >>> 0) ^ 0x5bd1e995, 2654435761) + Math.imul(essai + 1, 40503)) >>> 0);
    const ri = (k) => Math.floor(R() * k);
    const g = MAP.map((l) => [...l].map((ch) => (ch === "P" ? "P" : ".")));
    const eauLoin = [];   // cases d'eau à 2 cases ou plus des plages
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === "." && dP0[y][x] >= 2) eauLoin.push([x, y]);
    // 1. corail : 5 à 8 massifs de 1 à 3 cases (jamais collés à la plage)
    const massifs = 5 + ri(4);
    for (let m = 0; m < massifs; m++) {
      let [x, y] = eauLoin[ri(eauLoin.length)];
      for (let k = 1 + ri(3); k > 0; k--) {
        if (inside(x, y) && g[y][x] === "." && dP0[y][x] >= 2) g[y][x] = "#";
        const [dx, dy] = DIRS[ri(4)]; x += dx; y += dy;
      }
    }
    // 2. herbiers : 19 à 23 touffes, par petits groupes, à 2 cases ou plus des plages
    const cible = 19 + ri(5);
    let touffes = 0;
    for (let garde = 0; touffes < cible && garde < 400; garde++) {
      let [x, y] = eauLoin[ri(eauLoin.length)];
      for (let k = 1 + ri(3); k > 0 && touffes < cible; k--) {
        if (inside(x, y) && g[y][x] === "." && dP0[y][x] >= 2) { g[y][x] = "h"; touffes++; }
        const [dx, dy] = DIRS[ri(4)]; x += dx; y += dy;
      }
    }
    const C0 = preparerCarte(g.map((r) => r.join("")), { spawns: [], requins: [] });
    if (!carteSansBlocage(C0)) continue;
    // 3. départs des tortues : sur l'eau libre, ni trop près ni trop loin d'une plage, écartés si possible,
    //    et pas sur les bords du lagon (le « large », réservé aux départs des requins)
    const cand = [];
    for (let y = 4; y < H - 4; y++) for (let x = 0; x < W - 3; x++) if (g[y][x] === "." && C0.distPlage[y][x] >= 4 && C0.distPlage[y][x] <= 13) cand.push([x, y]);
    for (let i = cand.length - 1; i > 0; i--) { const j = ri(i + 1); [cand[i], cand[j]] = [cand[j], cand[i]]; }
    let spawns = [];
    for (const ecart of [3, 2, 1]) {
      spawns = [];
      for (const c of cand) {
        if (spawns.length >= n) break;
        if (spawns.every((s) => Math.abs(s[0] - c[0]) + Math.abs(s[1] - c[1]) >= ecart)) spawns.push(c);
      }
      if (spawns.length >= n) break;
    }
    if (spawns.length < Math.min(n, cand.length) || !spawns.length) continue;
    // 4. requins : 6 départs AU LARGE (bords du lagon, loin des plages), loin de toutes les tortues, écartés entre eux.
    //    (Après une capture, le requin retourne à son départ : un départ entre une tortue et la plage
    //     la ferait attraper encore et encore sur le même chemin.)
    const eaux = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const bord = x >= W - 2 || y <= 1 || y >= H - 2;
      if (bord && g[y][x] === "." && C0.distPlage[y][x] >= 4 && !spawns.some((s) => s[0] === x && s[1] === y)) eaux.push([x, y]);
    }
    for (let i = eaux.length - 1; i > 0; i--) { const j = ri(i + 1); [eaux[i], eaux[j]] = [eaux[j], eaux[i]]; }
    const loinDe = (c, l, d) => l.every((s) => Math.abs(s[0] - c[0]) + Math.abs(s[1] - c[1]) >= d);
    let requins = [], dReq = 0;
    for (const d of [7, 6, 5]) {
      requins = [];
      for (const c of eaux) { if (requins.length >= SHARK_STARTS.length) break; if (loinDe(c, spawns, d) && loinDe(c, requins, 4)) requins.push(c); }
      if (requins.length >= SHARK_STARTS.length) { dReq = d; break; }
    }
    if (requins.length < SHARK_STARTS.length) continue;
    const C = preparerCarte(g.map((r) => r.join("")), { spawns, requins, aleatoire: true });
    if (carteSansBlocage(C, { distRequin: dReq })) return C;
  }
  return CARTE_CLASSIQUE;   // (n'arrive pas en pratique : vérifié par outils/verifier.mjs)
}
const cacheCartes = new Map();
export function carteDe(graine, nbTortues) {
  const k = graine + "/" + nbTortues;
  if (!cacheCartes.has(k)) { if (cacheCartes.size > 50) cacheCartes.clear(); cacheCartes.set(k, genererCarte(graine, nbTortues)); }
  return cacheCartes.get(k);
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

// Tortue d'entraînement « avancée » (tutoriel avancé, bac à sable en mode avancé)
export const BOT_PIRATE = { nom: "Pirate", niveau: "avancé", code: `def tour():
    if requin_derriere_tortue() and energie() >= 4:
        pousser()
    elif distance_requin() <= 2 and not sur_plage():
        fuir()
    elif sur_plage() and est_la_nuit() and energie() >= 6:
        pondre()
    elif est_la_nuit() and energie() >= 6:
        aller_vers_plage()
    elif heure() >= 17 and energie() >= 9:
        aller_vers_plage()
    elif algue_ici() and not plastique_ici() and energie() < 10:
        manger()
    else:
        aller_vers_algue_libre()
` };

export const COULEURS = ["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#42d4f4", "#f032e6",
  "#bfef45", "#fabed4", "#469990", "#dcbeff", "#9a6324", "#fffac8", "#800000", "#aaffc3", "#808000", "#ffd8b1", "#000075", "#a9a9a9"];

// =====================================================================
//  simulate({ joueurs:[{id, nom, couleur, code}], graine, twist, ticks, scenario, version, leger })
//  version : 1 = carte classique, 2 = carte aléatoire tirée de la graine (par défaut, hors scénario)
//  leger   : sans images ni « pensées » (pour estimer une moyenne sur beaucoup de parties)
//  scenario (tutoriels) : { energie, requins:[[x,y]], plastiques:[[x,y]], heureDepart, ticks,
//     spawn:[x,y] (1re tortue), spawns:{id:[x,y]}, herbes:[[x,y,portions]], repousse:false,
//     requinsFixes:true, energies:{id:n} }
// =====================================================================
export function simulate({ joueurs, graine = 1, twist = "calme", ticks, scenario = null, version = VERSION_CARTE, leger = false }) {
  const T = TWISTS[twist] || TWISTS.calme;
  const sc = scenario || {};
  if (scenario) version = 1;   // tutoriels et missions : toujours la carte classique
  const C = version >= 2 ? carteDe(graine, joueurs.length) : CARTE_CLASSIQUE;
  const { tuile: tileAt, turtleOK, sharkOK, distPlage: DIST_PLAGE } = C;
  const SPAWNS = C.spawns;
  ticks = ticks || sc.ticks || TICKS;
  const heureDepart = sc.heureDepart ?? 8;
  const R = rng(graine);
  const ri = (n) => Math.floor(R() * n);

  // --- départs des tortues (mélangés par la graine) ---
  const spawnOrder = SPAWNS.map((s, i) => i);
  for (let i = spawnOrder.length - 1; i > 0; i--) { const j = ri(i + 1); [spawnOrder[i], spawnOrder[j]] = [spawnOrder[j], spawnOrder[i]]; }
  const sorted = [...joueurs].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const turtles = sorted.map((j, i) => {
    const sp = (sc.spawns && sc.spawns[j.id]) || (sc.spawn && i === 0 ? sc.spawn : SPAWNS[spawnOrder[i % SPAWNS.length]]);
    const c = check(j.code || "");
    const e0 = (sc.energies && sc.energies[j.id]) ?? sc.energie ?? P.energieDepart;
    return {
      id: j.id, nom: j.nom, couleur: j.couleur, equipe: j.equipe || 0, x: sp[0], y: sp[1], sx: sp[0], sy: sp[1], dir: 1,
      energie: e0, nids: 0, bloquee: 0, immunite: 0, mange: false, pousseePar: null,
      compiled: c.ok ? c.compiled : null, compileError: c.ok ? null : c.error,
      stats: { captures: [], plastiques: [], epuisee: [], refus: {}, rienAManger: 0, pasFaim: 0, immobile: 0, erreurs: 0, actions: {}, pontes: [], repas: 0, energieMax: e0,
        pousses: [], poussee: [], victimes: 0, dons: 0, recus: 0 },
    };
  });

  // --- herbiers (qui bougent), plastiques, requins ---
  const herbes = new Map();   // "x,y" -> { x, y, n }
  for (const [x, y, n] of sc.herbes || C.herbiers.map(([x, y]) => [x, y, P.portionsHerbier])) herbes.set(x + "," + y, { x, y, n });
  const repousses = [];       // tours restants avant qu'une nouvelle touffe pousse
  const spawnSet = new Set(SPAWNS.map(([x, y]) => x + "," + y));
  const waterCells = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (tileAt(x, y) === "eau" && !spawnSet.has(x + "," + y)) waterCells.push([x, y]);
  const cellsRepousse = waterCells.filter(([x, y]) => DIST_PLAGE[y][x] >= P.distPlageRepousse);
  function nouvelleTouffe() {
    for (let essai = 0; essai < 30; essai++) {
      const [x, y] = cellsRepousse[ri(cellsRepousse.length)];
      const k = x + "," + y;
      if (herbes.has(k) || turtles.some((t) => t.x === x && t.y === y)) continue;
      herbes.set(k, { x, y, n: P.portionsHerbier, ne: true });
      return;
    }
  }
  function randomPlasticCell(onHerbier) {
    const touffes = [...herbes.values()];
    if (onHerbier && touffes.length && R() < 0.8) { const h = touffes[ri(touffes.length)]; return [h.x, h.y]; }
    return waterCells[ri(waterCells.length)];
  }
  const vieSac = () => P.viePlastique + ri(P.viePlastique);
  const plastics = sc.plastiques
    ? sc.plastiques.map(([x, y]) => ({ x, y, retour: 0, fixe: true }))
    : Array.from({ length: T.plastiques }, () => { const [x, y] = randomPlasticCell(T.plastiqueHerbier); return { x, y, retour: 0, vie: vieSac() }; });
  const sharks = (sc.requins || C.requins.slice(0, T.requins)).map(([x, y]) => ({ x, y, sx: x, sy: y, repos: 0, wp: null, fx: 0, fy: 0 }));
  // patrouille : sans proie en vue, un requin traverse le lagon vers un point choisi au hasard
  const sharkCells = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (sharkOK(x, y)) sharkCells.push([x, y]);
  const distPatrouille = new Map();
  const versPoint = ([x, y]) => { const k = x + "," + y; if (!distPatrouille.has(k)) distPatrouille.set(k, bfs([[x, y]], sharkOK)); return distPatrouille.get(k); };
  const nuitDe = (tick) => estNuit(heureDe(tick, heureDepart), T.nuit);

  const frames = [], events = [], traces = {}, nids = [];
  for (const t of turtles) traces[t.id] = [];
  const tracer = leger ? (t, rec) => { traces[t.id][0] = rec; } : (t, rec) => traces[t.id].push(rec);   // léger : on garde seulement le dernier tour

  const hasPlastic = (x, y) => plastics.some((p) => p.retour === 0 && p.x === x && p.y === y);
  const touffe = (x, y) => herbes.get(x + "," + y);
  const algueIci = (x, y) => { const h = touffe(x, y); return !!h && h.n > 0; };
  // cachée = dans des algues ET ne mange pas ce tour-ci (manger fait bouger les algues)
  const cachee = (t) => algueIci(t.x, t.y) && !t.mange;
  // équipes : une tortue sans équipe (0) est l'adversaire de toutes les autres
  const equipiere = (t, u) => t.equipe > 0 && u.equipe === t.equipe;
  const enDuo = (t) => P.protectionEquipe && t.equipe > 0 && turtles.some((u) => u !== t && u.bloquee === 0 && equipiere(t, u) && manh(u, t) === 1);
  const protegee = (t) => t.bloquee > 0 || t.immunite > 0 || cachee(t) || tileAt(t.x, t.y) === "plage" || enDuo(t);
  const nidsEquipe = (t) => turtles.filter((u) => u === t || equipiere(t, u)).reduce((a, u) => a + u.nids, 0);
  // Plusieurs équipes : classement EN DIRECT, avec la même règle que le résultat (moyenne de nids par tortue).
  // L'équipe « rivale » = la meilleure des AUTRES équipes (à égalité : le plus petit numéro). Les 🤖 sont neutres.
  const numsEquipes = [...new Set(turtles.filter((t) => t.equipe > 0).map((t) => t.equipe))].sort((a, b) => a - b);
  const moyenneEquipe = (e) => { const m = turtles.filter((u) => u.equipe === e); return m.length ? m.reduce((a, u) => a + u.nids, 0) / m.length : 0; };
  const rangEquipe = (t) => (t.equipe > 0 ? 1 + numsEquipes.filter((e) => moyenneEquipe(e) > moyenneEquipe(t.equipe) + 1e-9).length : 0);
  const equipeRivale = (t) => {
    if (!(t.equipe > 0)) return 0;
    let best = 0, bm = -1;
    for (const e of numsEquipes) if (e !== t.equipe) { const m = moyenneEquipe(e); if (m > bm + 1e-9) { bm = m; best = e; } }
    return best;
  };

  // --- pousser : tortues voisines, case derrière, requin derrière ---
  const voisines = (t) => turtles.filter((u) => u !== t && u.bloquee === 0 && manh(u, t) === 1);
  const derriere = (t, u) => [u.x + (u.x - t.x), u.y + (u.y - t.y)];
  const poussable = (t, u) => {
    const [bx, by] = derriere(t, u);
    return inside(bx, by) && turtleOK(bx, by) && !turtles.some((v) => v !== u && v.x === bx && v.y === by && v.bloquee === 0);
  };
  const versRequin = (t, u) => {
    if (!poussable(t, u) || u.immunite > 0) return false;
    const [bx, by] = derriere(t, u);
    return tileAt(bx, by) === "eau" && !algueIci(bx, by) && sharks.some((s) => s.repos === 0 && s.x === bx && s.y === by);
  };

  function snapshot(tick) {
    if (leger) return;
    frames.push({
      tick, heure: heureDe(tick, heureDepart), nuit: nuitDe(tick),
      tortues: turtles.map((t) => [t.x, t.y, t.energie, t.nids, t.bloquee, t.immunite, t.dir, cachee(t) ? 1 : 0]),
      requins: sharks.map((s) => [s.x, s.y, s.repos, s.fx, s.fy]),
      plastiques: plastics.filter((p) => p.retour === 0).map((p) => [p.x, p.y]),
      herbes: [...herbes.values()].map((h) => [h.x, h.y, h.n]),
      nids: nids.length,
    });
  }
  snapshot(0);

  for (let tick = 0; tick < ticks; tick++) {
    const heure = heureDe(tick, heureDepart), nuit = nuitDe(tick);
    // distances vers les algues propres (avec des algues et sans plastique)
    const propres = [...herbes.values()].filter((h) => h.n > 0 && !hasPlastic(h.x, h.y));
    const distAlgue = bfs(propres.map((h) => [h.x, h.y]), turtleOK);
    const order = turtles.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = ri(i + 1); [order[i], order[j]] = [order[j], order[i]]; }

    for (const idx of order) {
      const t = turtles[idx];
      t.mange = false;
      const rec = { tick, x: t.x, y: t.y, energie: t.energie };
      if (t.bloquee > 0) { t.bloquee--; rec.bloquee = true; tracer(t, rec); continue; }
      if (!t.compiled) {
        rec.erreur = t.compileError ? `Ligne ${t.compileError.line} : ${t.compileError.message}` : "Pas de code";
        t.stats.immobile++; tracer(t, rec); continue;
      }
      const sensors = {
        requin_proche: () => sharks.some((s) => manh(s, t) <= P.porteeRequin),
        algue_ici: () => algueIci(t.x, t.y),
        plastique_ici: () => hasPlastic(t.x, t.y),
        sur_plage: () => tileAt(t.x, t.y) === "plage",
        est_la_nuit: () => nuit,
        energie: () => t.energie,
        heure: () => heure,
        distance_algue: () => (distAlgue[t.y][t.x] === Infinity ? 99 : distAlgue[t.y][t.x]),
        distance_plage: () => DIST_PLAGE[t.y][t.x],
        distance_requin: () => (sharks.length ? Math.min(...sharks.map((s) => manh(s, t))) : 99),
        tortue_a_cote: () => voisines(t).length > 0,
        requin_derriere_tortue: () => voisines(t).some((u) => versRequin(t, u)),
        // jeu en équipes
        mon_equipe: () => t.equipe,
        mes_nids: () => t.nids,
        nids_voisine: () => Math.max(0, ...voisines(t).map((u) => u.nids)),
        equipiere_a_cote: () => voisines(t).some((u) => equipiere(t, u)),
        adversaire_a_cote: () => voisines(t).some((u) => !equipiere(t, u)),
        equipiere_fatiguee: () => voisines(t).some((u) => equipiere(t, u) && u.energie < P.energiePonte),
        requin_derriere_adversaire: () => voisines(t).some((u) => !equipiere(t, u) && versRequin(t, u)),
        nids_equipe: () => nidsEquipe(t),
        // en équipes (cartes v2) : les nids de l'équipe rivale ; sinon : de toutes les autres tortues
        nids_adversaires: () => (version >= 2 && t.equipe > 0
          ? turtles.filter((u) => u.equipe > 0 && u.equipe === equipeRivale(t)).reduce((a, u) => a + u.nids, 0)
          : turtles.filter((u) => u !== t && !equipiere(t, u)).reduce((a, u) => a + u.nids, 0)),
        rang_equipe: () => rangEquipe(t),
        equipe_en_tete: () => rangEquipe(t) === 1,
        equipe_rivale: () => equipeRivale(t),
        rivale_a_cote: () => { const r = equipeRivale(t); return r > 0 && voisines(t).some((u) => u.equipe === r); },
      };
      if (!leger) { rec.capteurs = {}; for (const k of Object.keys(SENSORS)) rec.capteurs[k] = sensors[k](); }
      const tr = runTurn(t.compiled, sensors);
      rec.conds = tr.conds; rec.action = tr.action; rec.ligne = tr.actionLine;
      if (tr.extra.length) rec.extra = tr.extra;
      if (tr.error) { rec.erreur = tr.error; t.stats.erreurs++; }
      t.stats.actions[tr.action || "aucune"] = (t.stats.actions[tr.action || "aucune"] || 0) + 1;
      const move = (nx, ny) => { if (nx !== t.x) t.dir = nx > t.x ? 1 : 3; else if (ny !== t.y) t.dir = ny > t.y ? 2 : 0; t.x = nx; t.y = ny; };

      switch (tr.action) {
        case null: t.stats.immobile++; rec.effet = "aucune action"; break;
        case "manger": {
          t.mange = true;
          if (hasPlastic(t.x, t.y)) {
            const p = plastics.find((p) => p.retour === 0 && p.x === t.x && p.y === t.y);
            p.retour = p.fixe ? 9999 : 25; t.energie -= P.pertePlastique;
            t.stats.plastiques.push({ tick, ligne: tr.actionLine });
            events.push({ tick, type: "plastique", id: t.id }); rec.effet = "a avalé un sac plastique (−3)";
          } else if (algueIci(t.x, t.y)) {
            if (t.energie >= P.energieMax) { t.stats.pasFaim++; rec.effet = "n'a plus faim (énergie déjà à 10)"; }
            else {
              const h = touffe(t.x, t.y);
              t.energie = Math.min(P.energieMax, t.energie + P.gainAlgue); h.n--; t.stats.repas++;
              rec.effet = "mange une algue (+3)";
              if (h.n <= 0) {   // touffe finie : elle disparaît, une autre poussera ailleurs
                herbes.delete(t.x + "," + t.y);
                if (sc.repousse !== false) repousses.push(P.delaiRepousse);
                rec.effet += " — la touffe est finie";
              }
            }
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
            // cartes v2 : la plage (toujours sûre) d'abord, puis les algues (sûres seulement tant qu'on ne mange pas)
            const sc2 = dmin + (refuge ? 100 : 0) + (version >= 2 && tileAt(x, y) === "plage" ? 100 : 0);
            if (sc2 > bestScore) { bestScore = sc2; best = [x, y]; }
          }
          move(best[0], best[1]);
          rec.effet = tileAt(t.x, t.y) === "plage" ? "fuit (à l'abri sur la plage)" : algueIci(t.x, t.y) ? "fuit (cachée dans les algues)" : "fuit";
          break;
        }
        case "aller_vers_algue": {
          const s = stepDown(distAlgue, t.x, t.y, turtleOK);
          if (s) move(s[0], s[1]);
          else rec.effet = distAlgue[t.y][t.x] === 0 ? "déjà sur des algues : il faudrait manger()" : "aucune algue propre disponible";
          break;
        }
        case "aller_vers_algue_libre": {
          const occupees = new Set(turtles.filter((u) => u !== t && u.bloquee === 0).map((u) => u.x + "," + u.y));
          const d = bfs(propres.filter((h) => h.n > 0 && !occupees.has(h.x + "," + h.y)).map((h) => [h.x, h.y]), turtleOK);
          const s = stepDown(d, t.x, t.y, turtleOK);
          if (s) move(s[0], s[1]);
          else rec.effet = d[t.y][t.x] === 0 ? "déjà sur des algues libres : il faudrait manger()" : "aucune algue libre";
          break;
        }
        case "aller_vers_plage": {
          const s = stepDown(DIST_PLAGE, t.x, t.y, turtleOK);
          if (s) move(s[0], s[1]); else rec.effet = "déjà sur la plage";
          break;
        }
        case "donner": {
          const eq = voisines(t).filter((u) => equipiere(t, u) && u.energie < P.energieMax).sort((a, b) => a.energie - b.energie);
          if (!eq.length) { rec.effet = "personne à qui donner (il faut une équipière collée à toi)"; break; }
          if (t.energie <= P.don) { rec.effet = "pas assez d'énergie pour donner"; break; }
          const u = eq[0], d = Math.min(P.don, P.energieMax - u.energie);
          t.energie -= d; u.energie += d; t.stats.dons += d; u.stats.recus += d;
          events.push({ tick, type: "don", id: t.id, cible: u.id, n: d });
          rec.effet = `donne ${d} ⚡ à ${u.nom}`;
          break;
        }
        case "aller_vers_equipiere": {
          const eq = turtles.filter((u) => u !== t && u.bloquee === 0 && equipiere(t, u));
          if (!eq.length) { rec.effet = "pas d'équipière dans le lagon"; break; }
          if (eq.some((u) => manh(u, t) === 1)) { rec.effet = "déjà collée à une équipière"; break; }
          const d = bfs(eq.map((u) => [u.x, u.y]), turtleOK);
          const s = stepDown(d, t.x, t.y, turtleOK);
          if (s) move(s[0], s[1]); else rec.effet = "aucun chemin vers une équipière";
          break;
        }
        case "pousser": {
          const vs = voisines(t).filter((u) => poussable(t, u) && !equipiere(t, u));   // on ne pousse pas ses équipières
          if (!vs.length) { rec.effet = "personne à pousser ici"; break; }
          // plusieurs équipes (cartes v2) : on vise d'abord l'équipe rivale (la meilleure des autres)
          const r = version >= 2 ? equipeRivale(t) : 0, riv = (v) => r > 0 && v.equipe === r;
          const u = (r && vs.find((v) => versRequin(t, v) && riv(v))) || vs.find((v) => versRequin(t, v)) || (r && vs.find(riv)) || vs[0];
          const surRequin = versRequin(t, u);
          const [bx, by] = derriere(t, u);
          u.dir = bx > u.x ? 1 : bx < u.x ? 3 : by > u.y ? 2 : 0;
          u.x = bx; u.y = by; u.pousseePar = { id: t.id, tick };
          t.energie -= P.coutPousse;
          t.stats.pousses.push({ tick, cible: u.id, requin: surRequin });
          u.stats.poussee.push({ tick, par: t.id });
          events.push({ tick, type: "pousse", id: t.id, cible: u.id, requin: surRequin });
          rec.effet = `pousse ${u.nom} (−${P.coutPousse} ⚡)` + (surRequin ? " sur un requin !" : "");
          const lu = traces[u.id][traces[u.id].length - 1];
          if (lu && lu.tick === tick) lu.effet = (lu.effet ? lu.effet + " — " : "") + `poussée par ${t.nom}`;
          break;
        }
      }
      t.stats.energieMax = Math.max(t.stats.energieMax, t.energie);
      tracer(t, rec);
    }

    // --- les requins bougent (2 tours sur 3, ou à chaque tour s'ils sont affamés) ---
    const moveTick = T.rapides || tick % 3 !== 2;
    for (const s of sharks) {
      if (s.repos > 0) { s.repos--; continue; }
      if (!moveTick || sc.requinsFixes) continue;
      let cible = null, cd = Infinity;
      for (const t of turtles) {
        if (protegee(t)) continue;
        const d = manh(s, t);
        if (d <= T.vision && d < cd) { cd = d; cible = t; }
      }
      let nx = s.x, ny = s.y;
      if (cible && cd > 0) {
        const dm = bfs([[cible.x, cible.y]], sharkOK);
        let bd = Infinity;
        for (const [dx, dy] of DIRS) {
          const ax = s.x + dx, ay = s.y + dy;
          if (inside(ax, ay) && sharkOK(ax, ay) && dm[ay][ax] < bd) { bd = dm[ay][ax]; nx = ax; ny = ay; }
        }
      } else if (!cible) {
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
        const par = t.pousseePar && t.pousseePar.tick === tick ? t.pousseePar.id : null;
        if (par) { const p = turtles.find((u) => u.id === par); if (p) p.stats.victimes++; }
        t.stats.captures.push({ tick, ligne: last && last.ligne, action: last && last.action, perdu, par });
        events.push({ tick, type: "capture", id: t.id, perdu, par });
        if (last) last.effet = (last.effet ? last.effet + " — " : "") + "ATTRAPÉE par un requin !" + (perdu ? " (−1 nid)" : "");
        t.x = t.sx; t.y = t.sy; t.bloquee = P.bloqueeCapture; t.immunite = P.bloqueeCapture + 3;
        t.energie = Math.max(1, t.energie - P.perteCapture);
        if (version >= 2) {
          // carte aléatoire : le requin repart au large, au départ de requin le plus LOIN du départ de la tortue
          // (sinon, si son départ est sur le chemin de la tortue, il pourrait l'attraper encore et encore au même endroit)
          const dist = ([x, y]) => Math.abs(x - t.sx) + Math.abs(y - t.sy);
          const libres = C.requins.filter(([x, y]) => !sharks.some((o) => o !== s && o.x === x && o.y === y));
          const loin = (libres.length ? libres : C.requins).reduce((b, p) => (dist(p) > dist(b) ? p : b));
          s.x = loin[0]; s.y = loin[1];
        } else { s.x = s.sx; s.y = s.sy; }
        s.repos = 6;     // le requin repart au large et digère
        break;
      }
    }
    // --- environnement : énergie, algues, plastiques ---
    for (const t of turtles) {
      if (t.immunite > 0) t.immunite--;
      if (tick % P.perteEnergie === P.perteEnergie - 1 && t.bloquee === 0) t.energie--;
      // le jour, sur la plage, le soleil dessèche la tortue : elle perd de l'énergie plus vite
      if (P.soleilPlage && !nuit && tileAt(t.x, t.y) === "plage" && t.bloquee === 0 && tick % P.soleilPlage === P.soleilPlage - 1) {
        t.energie--; t.stats.soleil = (t.stats.soleil || 0) + 1;
      }
      if (t.energie <= 0) {
        t.stats.epuisee.push(tick); events.push({ tick, type: "epuisee", id: t.id });
        const last = traces[t.id][traces[t.id].length - 1];
        if (last) last.effet = (last.effet ? last.effet + " — " : "") + "ÉPUISÉE (énergie à 0) !";
        t.x = t.sx; t.y = t.sy; t.bloquee = P.bloquee; t.immunite = P.bloquee + 3; t.energie = 5;
      }
    }
    for (const h of herbes.values()) delete h.ne;
    for (let i = repousses.length - 1; i >= 0; i--) if (--repousses[i] <= 0) { repousses.splice(i, 1); nouvelleTouffe(); }
    for (const p of plastics) {
      if (p.fixe) { if (p.retour > 0) p.retour--; continue; }
      if (p.retour > 0) { p.retour--; if (p.retour === 0) { [p.x, p.y] = randomPlasticCell(T.plastiqueHerbier); p.vie = vieSac(); } continue; }
      if (--p.vie <= 0) { [p.x, p.y] = randomPlasticCell(T.plastiqueHerbier); p.vie = vieSac(); continue; }   // le sac coule, un autre arrive ailleurs
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
  for (const r of res) r.equipe = turtles.find((t) => t.id === r.id).equipe;
  return {
    twist, graine, ticks, heureDepart, frames, events, traces, nids, version, carte: C.lignes,
    tortues: turtles.map((t) => ({ id: t.id, nom: t.nom, couleur: t.couleur, equipe: t.equipe, sx: t.sx, sy: t.sy, stats: t.stats, nids: t.nids, compileError: t.compileError })),
    resultats: res,
    equipes: resultatEquipes(turtles.map((t) => ({ id: t.id, nom: t.nom, equipe: t.equipe, nids: t.nids }))),
  };
}

// ---------- résultat d'une manche en équipes ----------
//  On compare la MOYENNE de nids par tortue (les équipes peuvent avoir des tailles différentes).
//  R[e] = { e, nids, n, moyenne, membres, rang } ; R.liste = équipes rangées ; R.nb = nombre d'équipes ;
//  R.gagnant = numéro de l'équipe gagnante (0 si plusieurs équipes sont à égalité en tête).
export function resultatEquipes(liste) {
  const nums = [...new Set(liste.filter((t) => t.equipe > 0).map((t) => t.equipe))].sort((a, b) => a - b);
  if (!nums.length) return null;
  const R = { liste: [], nb: nums.length };
  for (const e of nums) {
    const m = liste.filter((t) => t.equipe === e);
    const nids = m.reduce((a, t) => a + t.nids, 0);
    R[e] = { e, nids, n: m.length, moyenne: nids / m.length, membres: m.map((t) => t.id) };
    R.liste.push(R[e]);
  }
  R.liste.sort((a, b) => b.moyenne - a.moyenne || a.e - b.e);
  let rang = 0, prev = null;
  R.liste.forEach((x, i) => { if (prev === null || Math.abs(x.moyenne - prev) > 1e-9) rang = i + 1; prev = x.moyenne; x.rang = rang; });
  for (const x of R.liste) x.exaequo = R.liste.filter((y) => y.rang === x.rang).length;
  const premiers = R.liste.filter((x) => x.rang === 1);
  R.gagnant = premiers.length === 1 ? premiers[0].e : 0;
  return R;
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
  if (s.pousses.length) lignes.push(`💥 A poussé ${s.pousses.length} tortue${s.pousses.length > 1 ? "s" : ""}${s.victimes ? ` (dont ${s.victimes} sur un requin !)` : ""}.`);
  if (s.poussee.length) lignes.push(`😤 S'est fait pousser ${s.poussee.length} fois.`);
  if (s.dons) lignes.push(`🤝 A donné ${s.dons} ⚡ à ses équipières.`);
  if (s.recus) lignes.push(`🎁 A reçu ${s.recus} ⚡ de ses équipières.`);
  if (s.soleil >= 10) lignes.push(`☀️ A passé beaucoup de temps au soleil sur la plage (−${s.soleil} ⚡).`);

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
  if (s.captures.filter((c) => c.par).length) conseils.push("Une tortue t'a poussée sur un requin ! Méfie-toi quand `tortue_a_cote()` est vrai (tutoriel avancé).");
  if (s.pousses.length >= 3 && !s.victimes) conseils.push("Tes `pousser()` coûtent 2 ⚡ chacun sans rien rapporter : pousse seulement si `requin_derriere_tortue()`.");
  if (s.soleil >= 15) conseils.push("Le jour, rester sur la plage fatigue (soleil). Va plutôt manger et reviens à la tombée de la nuit.");
  if (!conseils.length) conseils.push(t.nids >= 6
    ? "Très belle tortue ! Pour gagner encore : pars vers la plage avant la nuit, par exemple avec `heure() >= 16`."
    : "Pour pondre plus : remplis ton énergie le jour, puis va vers la plage un peu avant la nuit (`heure() >= 16`).");

  const marqueurs = [
    ...s.pontes.map((tick) => ({ tick, type: "nid" })),
    ...s.captures.map((c) => ({ tick: c.tick, type: "capture" })),
    ...s.plastiques.map((p) => ({ tick: p.tick, type: "plastique" })),
    ...s.epuisee.map((tick) => ({ tick, type: "epuisee" })),
    ...s.pousses.map((p) => ({ tick: p.tick, type: "pousse" })),
    ...sim.events.filter((e) => e.type === "don" && e.id === id).map((e) => ({ tick: e.tick, type: "don" })),
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

// ---------- missions du tutoriel avancé ----------
const RIVALE_GOURMANDE = `def tour():
    if algue_ici():
        manger()
    else:
        aller_vers_algue()
`;
const pleinAuTour = (sim) => { const i = sim.tortues.findIndex((t) => t.id === "t"); return sim.frames.findIndex((f) => f.tortues[i][2] >= 10); };
export const MISSIONS_AVANCEES = [
  {
    id: "A1", titre: "🔧 Le buffet est pris", notion: "aller_vers_algue_libre()",
    probleme: "😟 Les algues les plus proches sont déjà occupées par deux gourmandes. Ta tortue y va quand même… et attend.",
    objectif: "Être pleine d'énergie (10 ⚡) en 15 tours.",
    code: RIVALE_GOURMANDE,
    solution: `def tour():
    if algue_ici():
        manger()
    else:
        aller_vers_algue_libre()
`,
    indice: "Il existe un ordre qui va vers les algues où il n'y a PERSONNE : aller_vers_algue_libre().",
    appris: "<code>aller_vers_algue_libre()</code> évite les touffes déjà occupées : pas de bousculade, plus de repas.",
    scenario: { energie: 3, energies: { t: 3, u1: 2, u2: 2 }, requins: [], plastiques: [], heureDepart: 8, ticks: 20, repousse: false,
      herbes: [[10, 3, 3], [9, 3, 3], [15, 2, 5]], spawns: { t: [11, 4], u1: [10, 3], u2: [9, 3] } },
    autres: [{ id: "u1", nom: "Gourmande 1", couleur: "#9fb3c2", code: RIVALE_GOURMANDE }, { id: "u2", nom: "Gourmande 2", couleur: "#c9d6df", code: RIVALE_GOURMANDE }],
    reussi: (sim) => { const k = pleinAuTour(sim); return k >= 0 && k <= 15; },
    bilan: (sim) => { const k = pleinAuTour(sim); return k >= 0 ? `Pleine d'énergie au tour ${k}.` : "Jamais pleine d'énergie."; },
  },
  {
    id: "A2", titre: "🏴‍☠️ La pirate", notion: "requin_derriere_tortue()",
    probleme: "😟 Une rivale se repose sur la plage, collée à toi… et un requin attend juste derrière elle. Mais ta tortue a peur et s'enfuit.",
    objectif: "Pousser la rivale sur le requin (10 tours maximum).",
    code: `def tour():
    if requin_proche():
        fuir()
    elif tortue_a_cote():
        pousser()
    else:
        se_cacher()
`,
    solution: `def tour():
    if requin_derriere_tortue():
        pousser()
    elif requin_proche():
        fuir()
    else:
        se_cacher()
`,
    indice: "Le premier vrai gagne : requin_proche() est vrai, donc ta tortue fuit. Teste d'abord requin_derriere_tortue().",
    appris: "<code>pousser()</code> (−2 ⚡) envoie la voisine d'une case. Avec un requin derrière elle, elle est attrapée et perd un nid !",
    scenario: { energie: 8, requins: [[19, 6]], requinsFixes: true, plastiques: [], heureDepart: 10, ticks: 10, repousse: false, herbes: [], spawns: { t: [21, 6], u1: [20, 6] } },
    autres: [{ id: "u1", nom: "Rivale", couleur: "#9fb3c2", code: "def tour():\n    se_cacher()\n" }],
    reussi: (sim) => sim.tortues.find((t) => t.id === "t").stats.victimes >= 1,
    bilan: (sim) => { const s = sim.tortues.find((t) => t.id === "t").stats; return `${s.pousses.length} poussée(s), ${s.victimes} rivale(s) attrapée(s).`; },
  },
];
MISSIONS_AVANCEES.push({
  id: "A3", titre: "🍼 La nourrice", notion: "donner()", equipe: 1,
  probleme: "😟 Ton équipière 🔵 est sur la plage, la nuit… mais elle n'a plus assez d'énergie pour pondre. Toi, tu es pleine d'énergie, collée à elle. Mais ta tortue part manger !",
  objectif: "Que ton équipe ponde au moins 2 nids en 10 tours.",
  code: `def tour():
    if algue_ici():
        manger()
    else:
        aller_vers_algue()
`,
  solution: `def tour():
    if equipiere_fatiguee():
        donner()
    elif algue_ici():
        manger()
    else:
        aller_vers_algue()
`,
  indice: "Si une équipière collée à toi est fatiguée (equipiere_fatiguee()), donne-lui de l'énergie avec donner(). Teste-le en premier !",
  appris: "<code>donner()</code> passe 3 ⚡ à une équipière collée à toi. En équipe, c'est le <b>total de l'équipe</b> qui compte : aider rapporte autant que pondre soi-même !",
  scenario: { energie: 10, energies: { t: 10, u1: 3 }, requins: [], plastiques: [], heureDepart: 21, ticks: 10, repousse: false,
    herbes: [[15, 6, 5]], spawns: { t: [19, 6], u1: [20, 6] } },
  autres: [{ id: "u1", nom: "Équipière", couleur: "#2f6fdb", equipe: 1, code: `def tour():
    if sur_plage() and est_la_nuit() and energie() >= 6:
        pondre()
    else:
        se_cacher()
` }],
  reussi: (sim) => sim.tortues.filter((t) => t.equipe === 1).reduce((a, t) => a + t.nids, 0) >= 2,
  bilan: (sim) => `Nids de l'équipe : ${sim.tortues.filter((t) => t.equipe === 1).reduce((a, t) => a + t.nids, 0)} · énergie donnée : ${sim.tortues.find((t) => t.id === "t").stats.dons} ⚡.`,
});
