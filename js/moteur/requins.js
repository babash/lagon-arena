// =====================================================================
//  Lagon Arena — moteur : les REQUINS (chasse, patrouille, captures)
// =====================================================================
import { DIRS, inside, manh, bfs } from "./carte.js";
import { P } from "./regles.js";

// les requins bougent 2 tours sur 3 (à chaque tour s'ils sont « rapides »)
export function deplacerRequins(m, tick) {
  const { T, sc, sharkOK, R, ri } = m;
  const moveTick = T.rapides || tick % 3 !== 2;
  for (const s of m.sharks) {
    if (s.repos > 0) { s.repos--; continue; }
    if (!moveTick || sc.requinsFixes) continue;
    // la proie : la tortue non protégée la plus proche, si elle est en vue
    let cible = null, cd = Infinity;
    for (const t of m.turtles) {
      if (m.protegee(t)) continue;
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
    } else if (!cible) {   // patrouille
      if (!s.wp || (s.x === s.wp[0] && s.y === s.wp[1]) || R() < 0.03) s.wp = m.sharkCells[ri(m.sharkCells.length)];
      const dm = m.versPoint(s.wp);
      let bd = dm[s.y][s.x];
      for (const [dx, dy] of DIRS) {
        const ax = s.x + dx, ay = s.y + dy;
        if (inside(ax, ay) && sharkOK(ax, ay) && dm[ay][ax] < bd) { bd = dm[ay][ax]; nx = ax; ny = ay; }
      }
    }
    if (nx !== s.x || ny !== s.y) { s.fx = nx - s.x; s.fy = ny - s.y; }
    s.x = nx; s.y = ny;
  }
}

// un requin sur la case d'une tortue non protégée l'attrape : −1 nid, retour au départ, bloquée
export function captures(m, tick) {
  const { sharks, turtles, nids, events, version, C } = m;
  for (const s of sharks) {
    if (s.repos > 0) continue;
    for (const t of turtles) {
      if (t.x !== s.x || t.y !== s.y || m.protegee(t)) continue;
      const last = m.derniereTrace(t);
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
}
