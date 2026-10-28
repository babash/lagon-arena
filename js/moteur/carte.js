// =====================================================================
//  Lagon Arena — moteur : la carte du lagon
//   • la grille (24 x 14) et les distances (parcours en largeur) ;
//   • la carte CLASSIQUE (version 1) ;
//   • les cartes ALÉATOIRES (version 2), vérifiées pour qu'il n'y ait aucune situation de blocage.
// =====================================================================
import { rng } from "./hasard.js";

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
export const SHARK_STARTS = [[21, 3], [21, 10], [11, 0], [11, 13], [23, 0], [23, 13]];

const TILE = { ".": "eau", "#": "corail", "h": "eau", "P": "plage", "T": "eau" };
export const tileAt = (x, y) => TILE[MAP[y][x]];
export const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const manh = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const SPAWNS = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (MAP[y][x] === "T") SPAWNS.push([x, y]);

// ---------- distances (parcours en largeur) ----------
export function bfs(sources, passable) {
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

// un pas vers la case la plus proche de la cible (dist = carte des distances, 0 sur la cible)
export function stepDown(dist, x, y, passable = turtleOK) {
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
// opts : { coraux, algues } (lagon personnalisé) ; sans eux, la carte est exactement celle d'avant
export function genererCarte(graine, nbTortues = 8, opts = {}) {
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
    const massifs = opts.coraux ?? 5 + ri(4);
    for (let m = 0; m < massifs; m++) {
      let [x, y] = eauLoin[ri(eauLoin.length)];
      for (let k = 1 + ri(3); k > 0; k--) {
        if (inside(x, y) && g[y][x] === "." && dP0[y][x] >= 2) g[y][x] = "#";
        const [dx, dy] = DIRS[ri(4)]; x += dx; y += dy;
      }
    }
    // 2. herbiers : 19 à 23 touffes, par petits groupes, à 2 cases ou plus des plages
    const cible = opts.algues ?? 19 + ri(5);
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
export function carteDe(graine, nbTortues, opts = {}) {
  const k = graine + "/" + nbTortues + "/" + (opts.coraux ?? "") + "/" + (opts.algues ?? "");
  if (!cacheCartes.has(k)) { if (cacheCartes.size > 50) cacheCartes.clear(); cacheCartes.set(k, genererCarte(graine, nbTortues, opts)); }
  return cacheCartes.get(k);
}
