// =====================================================================
//  Lagon Arena — moteur : les CAPTEURS (les questions que pose le programme de l'élève)
//  Chaque capteur est une fonction sans argument, calculée seulement si le programme la demande.
//  (Leur description pour les élèves est dans js/primitives.js ; leur type dans js/interp.js.)
// =====================================================================
import { manh, bfs } from "./carte.js";
import { P } from "./regles.js";

// Les touffes autour d'une tortue (calculé une seule fois par tortue et par tour, seulement si besoin) :
//  la touffe propre la plus proche (en nombre de pas), et la plus proche SANS requin autour.
function analyseAlgues(m, t, tour) {
  if (tour.cache.has(t.id)) return tour.cache.get(t.id);
  const d = bfs([[t.x, t.y]], m.turtleOK);
  const pas = (h) => d[h.y][h.x];
  const dangereuse = (h) => m.sharks.some((s) => manh(s, h) <= P.dangerAlgue);
  const plusProche = (l) => l.filter((h) => pas(h) < Infinity)
    .reduce((b, h) => (!b || pas(h) < pas(b) || (pas(h) === pas(b) && (h.y < b.y || (h.y === b.y && h.x < b.x))) ? h : b), null);
  const proche = plusProche(tour.propres), sure = plusProche(tour.propres.filter((h) => !dangereuse(h)));
  const a = { proche, distSure: sure ? pas(sure) : 99 };
  tour.cache.set(t.id, a);
  return a;
}

// m = le monde (creerMonde), t = la tortue, tour = { tick, heure, nuit, propres, distAlgue }
export function capteurs(m, t, tour) {
  const { sharks, turtles, version } = m;
  const voisines = () => m.voisines(t);
  return {
    // --- débutant ---
    requin_proche: () => sharks.some((s) => manh(s, t) <= P.porteeRequin),
    algue_ici: () => m.algueIci(t.x, t.y),
    plastique_ici: () => m.hasPlastic(t.x, t.y),
    sur_plage: () => m.tileAt(t.x, t.y) === "plage",
    est_la_nuit: () => tour.nuit,
    energie: () => t.energie,
    heure: () => tour.heure,
    // --- avancé ---
    distance_algue: () => (tour.distAlgue[t.y][t.x] === Infinity ? 99 : tour.distAlgue[t.y][t.x]),
    distance_plage: () => m.C.distPlage[t.y][t.x],
    distance_requin: () => (sharks.length ? Math.min(...sharks.map((s) => manh(s, t))) : 99),
    tortue_a_cote: () => voisines().length > 0,
    requin_derriere_tortue: () => voisines().some((u) => m.versRequin(t, u)),
    // --- jeu en équipes ---
    mon_equipe: () => t.equipe,
    mes_nids: () => t.nids,
    nids_voisine: () => Math.max(0, ...voisines().map((u) => u.nids)),
    equipiere_a_cote: () => voisines().some((u) => m.equipiere(t, u)),
    adversaire_a_cote: () => voisines().some((u) => !m.equipiere(t, u)),
    equipiere_fatiguee: () => voisines().some((u) => m.equipiere(t, u) && u.energie < P.energiePonte),
    requin_derriere_adversaire: () => voisines().some((u) => !m.equipiere(t, u) && m.versRequin(t, u)),
    nids_equipe: () => m.nidsEquipe(t),
    // en équipes (cartes v2) : les nids de l'équipe rivale ; sinon : de toutes les autres tortues
    nids_adversaires: () => (version >= 2 && t.equipe > 0
      ? turtles.filter((u) => u.equipe > 0 && u.equipe === m.equipeRivale(t)).reduce((a, u) => a + u.nids, 0)
      : turtles.filter((u) => u !== t && !m.equipiere(t, u)).reduce((a, u) => a + u.nids, 0)),
    rang_equipe: () => m.rangEquipe(t),
    equipe_en_tete: () => m.rangEquipe(t) === 1,
    equipe_rivale: () => m.equipeRivale(t),
    rivale_a_cote: () => { const r = m.equipeRivale(t); return r > 0 && voisines().some((u) => u.equipe === r); },
    // --- avancé : choisir ses algues (lire le lagon autour de soi) ---
    requins_autour: () => sharks.filter((s) => manh(s, t) <= P.zone).length,
    algues_autour: () => tour.propres.filter((h) => manh(h, t) <= P.zone).length,
    requins_pres_algue: () => { const h = analyseAlgues(m, t, tour).proche; return h ? sharks.filter((s) => manh(s, h) <= P.dangerAlgue).length : 0; },
    distance_algue_sure: () => analyseAlgues(m, t, tour).distSure,
    algue_pres_plage: () => { const h = analyseAlgues(m, t, tour).proche; return !!h && m.C.distPlage[h.y][h.x] <= P.plageProche; },
    portions_algue: () => { const h = analyseAlgues(m, t, tour).proche; return h ? h.n : 0; },
  };
}
