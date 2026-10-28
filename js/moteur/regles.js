// =====================================================================
//  Lagon Arena — moteur : les règles du jeu (réglages, nouveautés de manche, heures, points)
//  Équilibrage vérifié par simulation : node outils/verifier.mjs
// =====================================================================

export const TICKS = 180;              // durée d'un match (en tours)

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
  // capteurs « choisir ses algues » (niveau avancé)
  zone: 5,              // requins_autour(), algues_autour() : à 5 cases ou moins de moi
  dangerAlgue: 4,       // une touffe est « dangereuse » si un requin est à 4 cases ou moins
  plageProche: 3,       // algue_pres_plage() : la touffe est à 3 cases ou moins d'une plage
};

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

// ---------- LAGON PERSONNALISÉ : des réglages fins par-dessus une nouveauté ----------
//  Chaque réglage absent (ou null) garde la valeur de la nouveauté. Les cartes sans réglage de corail
//  ni d'algues sont exactement celles d'avant (les anciennes manches se rejouent à l'identique).
export const LAGON_REGLAGES = {
  requins:          { nom: "Requins", icone: "🦈", min: 0, max: 6 },
  rapides:          { nom: "Requins rapides", icone: "💨", type: "oui-non" },
  vision:           { nom: "Vue des requins (cases)", icone: "👁️", min: 2, max: 7 },
  plastiques:       { nom: "Sacs plastique", icone: "🛍️", min: 0, max: 40 },
  plastiqueHerbier: { nom: "Plastique surtout sur les algues", icone: "🌿", type: "oui-non" },
  nuitDebut:        { nom: "Début de la nuit (h)", icone: "🌙", min: 17, max: 23 },
  nuitFin:          { nom: "Fin de la nuit (h)", icone: "🌅", min: 3, max: 8 },
  coraux:           { nom: "Massifs de corail", icone: "🪸", min: 0, max: 14, carte: true, defaut: "5 à 8" },
  algues:           { nom: "Touffes d'algues", icone: "🌿", min: 8, max: 35, carte: true, defaut: "19 à 23" },
};
// garde seulement des réglages valides (entiers dans les bornes, oui/non) ; null s'il n'y en a aucun
export function normaliserLagon(l) {
  if (!l || typeof l !== "object") return null;
  const out = {};
  for (const [k, R] of Object.entries(LAGON_REGLAGES)) {
    const v = l[k];
    if (v === null || v === undefined || v === "") continue;
    if (R.type === "oui-non") { if (typeof v === "boolean") out[k] = v; continue; }
    const n = Math.round(Number(v));
    if (Number.isFinite(n)) out[k] = Math.min(R.max, Math.max(R.min, n));
  }
  return Object.keys(out).length ? out : null;
}
// les règles d'une manche : la nouveauté, puis les réglages du lagon personnalisé
export function reglesManche(twist, lagon) {
  const T = TWISTS[twist] || TWISTS.calme, L = normaliserLagon(lagon);
  if (!L) return T;
  return { ...T, perso: true,
    requins: L.requins ?? T.requins, rapides: L.rapides ?? T.rapides, vision: L.vision ?? T.vision,
    plastiques: L.plastiques ?? T.plastiques, plastiqueHerbier: L.plastiqueHerbier ?? T.plastiqueHerbier,
    nuit: [L.nuitDebut ?? T.nuit[0], L.nuitFin ?? T.nuit[1]] };
}
// ce que change un lagon personnalisé, en quelques mots (pour l'afficher aux élèves)
export function decrireLagon(lagon, twist = "calme") {
  const L = normaliserLagon(lagon), T = TWISTS[twist] || TWISTS.calme;
  if (!L) return "";
  const m = [];
  if (L.requins !== undefined) m.push(`${L.requins} requin${L.requins > 1 ? "s" : ""}`);
  if (L.rapides !== undefined) m.push(L.rapides ? "requins rapides" : "requins lents");
  if (L.vision !== undefined) m.push(`les requins voient à ${L.vision} cases`);
  if (L.plastiques !== undefined) m.push(`${L.plastiques} sac${L.plastiques > 1 ? "s" : ""} plastique`);
  if (L.plastiqueHerbier !== undefined) m.push(L.plastiqueHerbier ? "plastique sur les algues" : "plastique n'importe où");
  if (L.nuitDebut !== undefined || L.nuitFin !== undefined) m.push(`nuit de ${L.nuitDebut ?? T.nuit[0]} h à ${L.nuitFin ?? T.nuit[1]} h`);
  if (L.coraux !== undefined) m.push(`${L.coraux} massif${L.coraux > 1 ? "s" : ""} de corail`);
  if (L.algues !== undefined) m.push(`${L.algues} touffes d'algues`);
  return m.join(", ");
}
// les réglages qui changent la CARTE (corail, algues)
export const optionsCarte = (lagon) => { const L = normaliserLagon(lagon) || {}; return { coraux: L.coraux, algues: L.algues }; };

export const heureDe = (tick, depart = 8) => (depart + Math.floor(tick * 24 / 60)) % 24;
export const estNuit = (h, nuit) => h >= nuit[0] || h < nuit[1];

// ---------- points de manche ----------
export const POINTS_RANG = [25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
export const BONUS_PROGRESSION = 3;
export const pointsPourRang = (r) => POINTS_RANG[r - 1] || 1;
