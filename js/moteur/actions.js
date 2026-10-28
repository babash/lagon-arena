// =====================================================================
//  Lagon Arena — moteur : les ACTIONS (ce que fait la tortue, une seule par tour)
//  rec = la ligne de « pensée » de ce tour (on y écrit l'effet de l'action).
// =====================================================================
import { DIRS, inside, manh, bfs, stepDown } from "./carte.js";
import { P } from "./regles.js";

export function agir(m, t, tr, rec, tour) {
  const { tick, nuit, distAlgue, propres } = tour;
  const { turtles, sharks, plastics, herbes, events, nids, tileAt, turtleOK, version } = m;
  const move = (nx, ny) => { if (nx !== t.x) t.dir = nx > t.x ? 1 : 3; else if (ny !== t.y) t.dir = ny > t.y ? 2 : 0; t.x = nx; t.y = ny; };

  switch (tr.action) {
    case null: t.stats.immobile++; rec.effet = "aucune action"; break;
    case "manger": {
      t.mange = true;
      if (m.hasPlastic(t.x, t.y)) {
        const p = plastics.find((p) => p.retour === 0 && p.x === t.x && p.y === t.y);
        p.retour = p.fixe ? 9999 : 25; t.energie -= P.pertePlastique;
        t.stats.plastiques.push({ tick, ligne: tr.actionLine });
        events.push({ tick, type: "plastique", id: t.id }); rec.effet = "a avalé un sac plastique (−3)";
      } else if (m.algueIci(t.x, t.y)) {
        if (t.energie >= P.energieMax) { t.stats.pasFaim++; rec.effet = "n'a plus faim (énergie déjà à 10)"; }
        else {
          const h = m.touffe(t.x, t.y);
          t.energie = Math.min(P.energieMax, t.energie + P.gainAlgue); h.n--; t.stats.repas++;
          rec.effet = "mange une algue (+3)";
          if (h.n <= 0) {   // touffe finie : elle disparaît, une autre poussera ailleurs
            herbes.delete(t.x + "," + t.y);
            if (m.sc.repousse !== false) m.repousses.push(P.delaiRepousse);
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
      rec.effet = m.algueIci(t.x, t.y) ? "cachée dans les algues" : "reste sur place (pas d'algues pour se cacher)";
      break;
    case "fuir": {
      let best = [t.x, t.y], bestScore = -1;
      for (const [x, y] of [[t.x, t.y], ...DIRS.map(([dx, dy]) => [t.x + dx, t.y + dy])]) {
        if (!inside(x, y) || !turtleOK(x, y)) continue;
        const dmin = sharks.length ? Math.min(...sharks.map((s) => Math.abs(s.x - x) + Math.abs(s.y - y))) : 99;
        // fuir = s'éloigner, et surtout rejoindre un refuge (plage, ou algues où l'on est caché)
        const refuge = tileAt(x, y) === "plage" || m.algueIci(x, y);
        // cartes v2 : la plage (toujours sûre) d'abord, puis les algues (sûres seulement tant qu'on ne mange pas)
        const sc2 = dmin + (refuge ? 100 : 0) + (version >= 2 && tileAt(x, y) === "plage" ? 100 : 0);
        if (sc2 > bestScore) { bestScore = sc2; best = [x, y]; }
      }
      move(best[0], best[1]);
      rec.effet = tileAt(t.x, t.y) === "plage" ? "fuit (à l'abri sur la plage)" : m.algueIci(t.x, t.y) ? "fuit (cachée dans les algues)" : "fuit";
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
      const s = stepDown(m.C.distPlage, t.x, t.y, turtleOK);
      if (s) move(s[0], s[1]); else rec.effet = "déjà sur la plage";
      break;
    }
    case "donner": {
      const eq = m.voisines(t).filter((u) => m.equipiere(t, u) && u.energie < P.energieMax).sort((a, b) => a.energie - b.energie);
      if (!eq.length) { rec.effet = "personne à qui donner (il faut une équipière collée à toi)"; break; }
      if (t.energie <= P.don) { rec.effet = "pas assez d'énergie pour donner"; break; }
      const u = eq[0], d = Math.min(P.don, P.energieMax - u.energie);
      t.energie -= d; u.energie += d; t.stats.dons += d; u.stats.recus += d;
      events.push({ tick, type: "don", id: t.id, cible: u.id, n: d });
      rec.effet = `donne ${d} ⚡ à ${u.nom}`;
      break;
    }
    case "aller_vers_equipiere": {
      const eq = turtles.filter((u) => u !== t && u.bloquee === 0 && m.equipiere(t, u));
      if (!eq.length) { rec.effet = "pas d'équipière dans le lagon"; break; }
      if (eq.some((u) => manh(u, t) === 1)) { rec.effet = "déjà collée à une équipière"; break; }
      const d = bfs(eq.map((u) => [u.x, u.y]), turtleOK);
      const s = stepDown(d, t.x, t.y, turtleOK);
      if (s) move(s[0], s[1]); else rec.effet = "aucun chemin vers une équipière";
      break;
    }
    case "pousser": {
      const vs = m.voisines(t).filter((u) => m.poussable(t, u) && !m.equipiere(t, u));   // on ne pousse pas ses équipières
      if (!vs.length) { rec.effet = "personne à pousser ici"; break; }
      // plusieurs équipes (cartes v2) : on vise d'abord l'équipe rivale (la meilleure des autres)
      const r = version >= 2 ? m.equipeRivale(t) : 0, riv = (v) => r > 0 && v.equipe === r;
      const u = (r && vs.find((v) => m.versRequin(t, v) && riv(v))) || vs.find((v) => m.versRequin(t, v)) || (r && vs.find(riv)) || vs[0];
      const surRequin = m.versRequin(t, u);
      const [bx, by] = m.derriere(t, u);
      u.dir = bx > u.x ? 1 : bx < u.x ? 3 : by > u.y ? 2 : 0;
      u.x = bx; u.y = by; u.pousseePar = { id: t.id, tick };
      t.energie -= P.coutPousse;
      t.stats.pousses.push({ tick, cible: u.id, requin: surRequin });
      u.stats.poussee.push({ tick, par: t.id });
      events.push({ tick, type: "pousse", id: t.id, cible: u.id, requin: surRequin });
      rec.effet = `pousse ${u.nom} (−${P.coutPousse} ⚡)` + (surRequin ? " sur un requin !" : "");
      const lu = m.derniereTrace(u);
      if (lu && lu.tick === tick) lu.effet = (lu.effet ? lu.effet + " — " : "") + `poussée par ${t.nom}`;
      break;
    }
  }
}
