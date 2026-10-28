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
  // avancé : choisir ses algues (lire le lagon autour de soi)
  { nom: "requins_autour", icone: "🦈🔢", role: `Combien de requins à ${P.zone} cases ou moins de moi ? (zone dangereuse ?)`, rep: "un nombre", avance: true, groupe: "algues" },
  { nom: "algues_autour", icone: "🌿🔢", role: `Combien de touffes d'algues propres à ${P.zone} cases ou moins de moi ? (zone riche ?)`, rep: "un nombre", avance: true, groupe: "algues" },
  { nom: "requins_pres_algue", icone: "🌿🦈", role: `Combien de requins à ${P.dangerAlgue} cases ou moins des algues les plus proches ?`, rep: "un nombre", avance: true, groupe: "algues" },
  { nom: "distance_algue_sure", icone: "📏🌿🛡️", role: `À combien de cases sont les algues SANS requin autour (à ${P.dangerAlgue} cases) ? (99 = aucune)`, rep: "un nombre", avance: true, groupe: "algues" },
  { nom: "algue_pres_plage", icone: "🌿🏖️", role: `Les algues les plus proches sont-elles à ${P.plageProche} cases ou moins d'une plage ?`, rep: "True / False", avance: true, groupe: "algues" },
  { nom: "portions_algue", icone: "🌿🍽️", role: `Combien de repas reste-t-il dans les algues les plus proches ? (${P.portionsHerbier} au départ, 0 = aucune)`, rep: "un nombre", avance: true, groupe: "algues" },
  // jeu en équipes (visibles pendant une manche en équipes, ou en mode avancé)
  { nom: "mon_equipe", icone: "🏳️", role: "Le numéro de mon équipe : 1 = 🔵 Bleue, 2 = 🔴 Rouge, 3 = 🟢 Verte, 4 = 🟡 Jaune… (0 = chacun pour soi)", rep: "un nombre", equipe: true },
  { nom: "mes_nids", icone: "🥚", role: "Combien de nids me reste-t-il ?", rep: "un nombre", equipe: true },
  { nom: "nids_voisine", icone: "🐢🥚", role: "Combien de nids a la tortue collée à moi ? (0 s'il n'y en a pas)", rep: "un nombre", equipe: true },
  { nom: "nids_equipe", icone: "🥚🥚", role: "Combien de nids a mon équipe en tout ?", rep: "un nombre", equipe: true },
  { nom: "rang_equipe", icone: "🏅", role: "À quelle place est mon équipe en ce moment ? (1 = en tête ; on compare la moyenne de nids)", rep: "un nombre", equipe: true },
  { nom: "equipe_en_tete", icone: "👑", role: "Mon équipe est-elle en tête en ce moment (seule ou à égalité) ?", rep: "True / False", equipe: true },
  { nom: "equipe_rivale", icone: "🎯", role: "Le numéro de l'équipe RIVALE : la meilleure des autres équipes en ce moment", rep: "un nombre", equipe: true },
  { nom: "nids_adversaires", icone: "🥚🎯", role: "Combien de nids a l'équipe rivale en tout ?", rep: "un nombre", equipe: true },
  { nom: "equipiere_a_cote", icone: "🤝", role: "Une tortue de MON équipe est-elle collée à moi ?", rep: "True / False", equipe: true },
  { nom: "adversaire_a_cote", icone: "⚔️", role: "Une tortue ADVERSE (d'une autre équipe, ou 🤖) est-elle collée à moi ?", rep: "True / False", equipe: true },
  { nom: "equipiere_fatiguee", icone: "🤝😓", role: `Une équipière collée à moi a-t-elle moins de ${P.energiePonte} ⚡ (pas assez pour pondre) ?`, rep: "True / False", equipe: true },
  { nom: "requin_derriere_adversaire", icone: "⚔️🦈", role: "Si je pousse l'adversaire collée à moi, tombe-t-elle sur un requin ?", rep: "True / False", equipe: true },
  { nom: "rivale_a_cote", icone: "🎯🐢", role: "Une tortue de l'équipe RIVALE est-elle collée à moi ? (pousser() la vise en premier)", rep: "True / False", equipe: true },
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
  { nom: "pousser", icone: "💥", role: `Pousser une tortue collée à moi d'une case (−${P.coutPousse} ⚡). S'il y a un requin derrière elle… (en équipes : jamais une équipière, l'équipe rivale d'abord)`, avance: true },
  // jeu en équipes
  { nom: "donner", icone: "🎁", role: `Donner ${P.don} ⚡ à une équipière collée à moi.`, equipe: true },
  { nom: "aller_vers_equipiere", icone: "➡️🤝", role: "Nager vers l'équipière la plus proche (deux équipières collées sont protégées des requins).", equipe: true },
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
// mode équipes : activé par l'écran élève quand la manche se joue en équipes
let equipe = false;
export const estEquipe = () => equipe;
export function setEquipe(v) { if (equipe === !!v) return; equipe = !!v; document.dispatchEvent(new CustomEvent("lagon:avance", { detail: avance })); }
// une primitive est-elle proposée aux élèves en ce moment ?
export const visible = (p, forcerAvance = null) => !p.avance && !p.equipe ? true
  : p.avance ? (forcerAvance ?? avance) : (equipe || (forcerAvance ?? avance));
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
  "🌿 Une touffe d'algues mangée jusqu'au bout disparaît : une nouvelle pousse ailleurs.",
  "🏖️ Sur la plage, aucun requin ne peut t'attraper.",
  "✍️ Commence à taper un mot (ou en français : <i>si</i>, <i>sinon</i>, <i>nuit</i>…) : l'éditeur te propose la suite.",
];
