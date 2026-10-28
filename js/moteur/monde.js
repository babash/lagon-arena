// =====================================================================
//  Lagon Arena — moteur : le MONDE d'une partie
//  Tortues, requins, algues, sacs plastique… et les petites questions qu'on se pose sur eux
//  (une tortue est-elle cachée ? protégée ? qui est collée à qui ? quelle équipe mène ?).
//  ⚠️ L'ordre des tirages au hasard (R) ne doit jamais changer : même graine = même partie.
// =====================================================================
import { check } from "../interp.js";
import { W, H, manh, inside, bfs, carteDe, CARTE_CLASSIQUE } from "./carte.js";
import { P, TICKS, TWISTS, heureDe, estNuit } from "./regles.js";
import { rng } from "./hasard.js";

export function creerMonde({ joueurs, graine, twist, ticks, scenario, version, leger }) {
  const T = TWISTS[twist] || TWISTS.calme;
  const sc = scenario || {};
  if (scenario) version = 1;   // tutoriels et missions : toujours la carte classique
  const C = version >= 2 ? carteDe(graine, joueurs.length) : CARTE_CLASSIQUE;
  const { tuile: tileAt, turtleOK, sharkOK } = C;
  const SPAWNS = C.spawns;
  ticks = ticks || sc.ticks || TICKS;
  const heureDepart = sc.heureDepart ?? 8;
  const R = rng(graine);
  const ri = (n) => Math.floor(R() * n);

  // --- les tortues (départs mélangés par la graine ; ordre des joueurs sans importance) ---
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

  // --- les herbiers (qui bougent) ---
  const herbes = new Map();   // "x,y" -> { x, y, n }
  for (const [x, y, n] of sc.herbes || C.herbiers.map(([x, y]) => [x, y, P.portionsHerbier])) herbes.set(x + "," + y, { x, y, n });
  const repousses = [];       // tours restants avant qu'une nouvelle touffe pousse
  const spawnSet = new Set(SPAWNS.map(([x, y]) => x + "," + y));
  const waterCells = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (tileAt(x, y) === "eau" && !spawnSet.has(x + "," + y)) waterCells.push([x, y]);
  const cellsRepousse = waterCells.filter(([x, y]) => C.distPlage[y][x] >= P.distPlageRepousse);
  function nouvelleTouffe() {
    for (let essai = 0; essai < 30; essai++) {
      const [x, y] = cellsRepousse[ri(cellsRepousse.length)];
      const k = x + "," + y;
      if (herbes.has(k) || turtles.some((t) => t.x === x && t.y === y)) continue;
      herbes.set(k, { x, y, n: P.portionsHerbier, ne: true });
      return;
    }
  }

  // --- les sacs plastique ---
  function randomPlasticCell(onHerbier) {
    const touffes = [...herbes.values()];
    if (onHerbier && touffes.length && R() < 0.8) { const h = touffes[ri(touffes.length)]; return [h.x, h.y]; }
    return waterCells[ri(waterCells.length)];
  }
  const vieSac = () => P.viePlastique + ri(P.viePlastique);
  const plastics = sc.plastiques
    ? sc.plastiques.map(([x, y]) => ({ x, y, retour: 0, fixe: true }))
    : Array.from({ length: T.plastiques }, () => { const [x, y] = randomPlasticCell(T.plastiqueHerbier); return { x, y, retour: 0, vie: vieSac() }; });

  // --- les requins (patrouille : sans proie en vue, un requin traverse le lagon vers un point choisi au hasard) ---
  const sharks = (sc.requins || C.requins.slice(0, T.requins)).map(([x, y]) => ({ x, y, sx: x, sy: y, repos: 0, wp: null, fx: 0, fy: 0 }));
  const sharkCells = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (sharkOK(x, y)) sharkCells.push([x, y]);
  const distPatrouille = new Map();
  const versPoint = ([x, y]) => { const k = x + "," + y; if (!distPatrouille.has(k)) distPatrouille.set(k, bfs([[x, y]], sharkOK)); return distPatrouille.get(k); };

  // --- ce que la partie enregistre (images pour le replay, événements, « pensées » des tortues) ---
  const frames = [], events = [], traces = {}, nids = [];
  for (const t of turtles) traces[t.id] = [];
  const tracer = leger ? (t, rec) => { traces[t.id][0] = rec; } : (t, rec) => traces[t.id].push(rec);   // léger : seulement le dernier tour
  const derniereTrace = (t) => traces[t.id][traces[t.id].length - 1];
  const nuitDe = (tick) => estNuit(heureDe(tick, heureDepart), T.nuit);

  // --- questions sur le monde ---
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
  // pousser : tortues voisines, case derrière, requin derrière
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

  return {
    // réglages de la partie
    twist, graine, version, leger, sc, T, C, ticks, heureDepart, R, ri, tileAt, turtleOK, sharkOK,
    // état
    turtles, sharks, plastics, herbes, repousses, sharkCells, frames, events, traces, nids,
    // outils
    tracer, derniereTrace, snapshot, nuitDe, nouvelleTouffe, randomPlasticCell, vieSac, versPoint,
    hasPlastic, touffe, algueIci, cachee, equipiere, enDuo, protegee, nidsEquipe, rangEquipe, equipeRivale,
    voisines, derriere, poussable, versRequin,
  };
}
