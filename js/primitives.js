// =====================================================================
//  Lagon Arena — les primitives du jeu et leur rôle, en mots simples.
//  Source unique utilisée par l'autocomplétion, la boîte à outils, l'aide…
// =====================================================================
import { P } from "./engine.js";

// Capteurs = des QUESTIONS que se pose la tortue (réponse True ou False, ou un nombre)
export const CAPTEURS = [
  { nom: "requin_proche", icone: "🦈", role: `Un requin est-il près de moi (${P.porteeRequin} cases ou moins) ?`, rep: "True / False" },
  { nom: "algue_ici", icone: "🌿", role: "Y a-t-il des algues sur ma case ?", rep: "True / False" },
  { nom: "plastique_ici", icone: "🛍️", role: "Y a-t-il un sac plastique sur ma case ?", rep: "True / False" },
  { nom: "sur_plage", icone: "🏖️", role: "Suis-je sur la plage ?", rep: "True / False" },
  { nom: "est_la_nuit", icone: "🌙", role: "Fait-il nuit ?", rep: "True / False" },
  { nom: "energie", icone: "⚡", role: `Combien ai-je d'énergie ? (0 à ${P.energieMax})`, rep: "un nombre" },
  { nom: "heure", icone: "🕐", role: "Quelle heure est-il ? (0 à 23)", rep: "un nombre" },
  // niveau avancé (tutoriel avancé)
  { nom: "distance_algue", icone: "📏🌿", role: "À combien de cases sont les algues propres les plus proches ? (0 = ici)", rep: "un nombre", avance: true },
  { nom: "distance_plage", icone: "📏🏖️", role: "À combien de cases est la plage ? (0 = j'y suis)", rep: "un nombre", avance: true },
  { nom: "distance_requin", icone: "📏🦈", role: "À combien de cases est le requin le plus proche ?", rep: "un nombre", avance: true },
  { nom: "tortue_a_cote", icone: "🐢🐢", role: "Une autre tortue est-elle collée à moi ?", rep: "True / False", avance: true },
  { nom: "requin_derriere_tortue", icone: "🐢🦈", role: "Si je pousse la tortue voisine, tombe-t-elle sur un requin ?", rep: "True / False", avance: true },
];

// Actions = des ORDRES (une seule par tour)
export const ACTIONS_INFO = [
  { nom: "manger", icone: "😋", role: `Manger l'algue de ma case (+${P.gainAlgue} ⚡). Sur un sac plastique : −${P.pertePlastique} ⚡ !` },
  { nom: "pondre", icone: "🥚", role: `Pondre un nid = 1 point. Seulement sur la plage, la nuit, avec ${P.energiePonte} ⚡ ou plus.` },
  { nom: "fuir", icone: "💨", role: "Nager loin du requin le plus proche." },
  { nom: "se_cacher", icone: "🙈", role: "Ne pas bouger. Dans les algues, le requin ne me voit pas." },
  { nom: "aller_vers_algue", icone: "➡️🌿", role: "Nager d'une case vers les algues propres." },
  { nom: "aller_vers_plage", icone: "➡️🏖️", role: "Nager d'une case vers la plage." },
  // niveau avancé
  { nom: "aller_vers_algue_libre", icone: "➡️🌿✨", role: "Nager vers les algues propres où il n'y a PAS d'autre tortue.", avance: true },
  { nom: "pousser", icone: "💥", role: `Pousser une tortue collée à moi d'une case (−${P.coutPousse} ⚡). S'il y a un requin derrière elle…`, avance: true },
];

// Mots-clés Python, avec leur traduction (on peut les retrouver en tapant le mot français)
export const MOTS = [
  { nom: "if", fr: "si", role: "si … (la condition est vraie) : alors on fait le bloc en dessous" },
  { nom: "elif", fr: "sinon si", role: "sinon, si … : une autre condition, testée seulement si les précédentes sont fausses" },
  { nom: "else", fr: "sinon", role: "sinon : dans tous les autres cas" },
  { nom: "and", fr: "et", role: "et : les DEUX conditions doivent être vraies" },
  { nom: "or", fr: "ou", role: "ou : au moins UNE des conditions doit être vraie" },
  { nom: "not", fr: "pas", role: "ne … pas : inverse la condition (True ↔ False)" },
  { nom: "True", fr: "vrai", role: "vrai" },
  { nom: "False", fr: "faux", role: "faux" },
];

// ---------- mode avancé (primitives avancées visibles ou non) ----------
let avance = false;
try { avance = localStorage.getItem("lagon:avance") === "1"; } catch { /* stockage indisponible */ }
export const estAvance = () => avance;
export function setAvance(v) {
  avance = !!v;
  try { localStorage.setItem("lagon:avance", avance ? "1" : "0"); } catch { /* rien */ }
  document.dispatchEvent(new CustomEvent("lagon:avance", { detail: avance }));
}

export const INFO = Object.fromEntries([
  ...CAPTEURS.map((c) => [c.nom, { ...c, type: "capteur" }]),
  ...ACTIONS_INFO.map((a) => [a.nom, { ...a, type: "action" }]),
  ...MOTS.map((m) => [m.nom, { ...m, type: "mot", icone: "🔤" }]),
]);

// Rappels affichés à tour de rôle sous l'éditeur
export const RAPPELS = [
  "🥚 <code>pondre()</code> ne marche que <b>sur la plage</b>, <b>la nuit</b>, avec <b>6 ⚡ ou plus</b>.",
  "🔝 Python lit tes <code>if</code> de <b>haut en bas</b> et fait seulement le <b>premier vrai</b>.",
  "🦈 Mets <code>if requin_proche():</code> <b>tout en haut</b> : le danger d'abord !",
  "🌿 Dans les algues, ta tortue est invisible… <b>sauf quand elle mange</b>.",
  "🛍️ Avant de manger : <code>and not plastique_ici()</code> évite les sacs plastique.",
  "⌨️ Après <code>if …</code> il faut <b>deux-points</b> <code>:</code> et la ligne suivante <b>décalée</b> (touche Tab).",
  "🧠 Un capteur (<code>algue_ici()</code>…) pose une <b>question</b> ; une action (<code>manger()</code>…) donne un <b>ordre</b>.",
  "⚡ L'énergie baisse de 1 tous les 6 tours. À 0, ta tortue est épuisée !",
  "🏖️ Sur la plage, aucun requin ne peut t'attraper.",
  "✍️ Commence à taper un mot (ou en français : <i>si</i>, <i>sinon</i>, <i>nuit</i>…) : l'éditeur te propose la suite.",
];
