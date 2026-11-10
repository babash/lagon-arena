// =====================================================================
//  Lagon Arena — les RÈGLES DU JEU en cartes (une idée par carte, de gros pictogrammes)
//  Une seule source pour : l'accueil (« Les règles en 1 minute »), le tutoriel, l'onglet
//  📜 Règles de la page élève, et l'aide-mémoire toujours visible sous l'éditeur.
//  Les nombres viennent des réglages du moteur (P) : ils ne peuvent pas être faux.
// =====================================================================
import { P, TICKS } from "./engine.js";

// les 6 cartes : { ic, titre, lignes: [[pictogramme, texte]], cle (pour les relier aux rappels) }
export const CARTES_REGLES = [
  { cle: "but", ic: "🎯", titre: "Le but", couleur: "or",
    lignes: [["🥚", "Pondre le plus de <b>nids</b> possible."], ["🏅", "<b>1 nid = 1 point.</b> Toutes les tortues de la classe jouent en même temps."]] },
  { cle: "pondre", ic: "🥚", titre: "Pour pondre", couleur: "vert",
    lignes: [["🏖️", "être <b>sur la plage</b>"], ["🌙", "<b>la nuit</b>"], ["⚡", `avoir <b>${P.energiePonte} d'énergie</b> ou plus`]],
    pied: `Les trois à la fois ! Pondre coûte ${P.coutPonte} ⚡.` },
  { cle: "energie", ic: "⚡", titre: "L'énergie", couleur: "bleu",
    lignes: [["⏳", `Elle baisse toute seule : <b>−1</b> tous les ${P.perteEnergie} tours.`], ["🌿", `Manger des algues : <b>+${P.gainAlgue}</b> par bouchée (une touffe a plusieurs bouchées).`], ["🍽️", `À <b>${P.energieMax}</b> (le maximum), elle n'a plus faim : <code>manger()</code> ne fait rien.`], ["🛍️", `Avaler un sac plastique : <b>−${P.pertePlastique}</b>.`], ["😵", "À <b>0</b> : épuisée, retour au départ."]] },
  { cle: "requins", ic: "🦈", titre: "Les requins", couleur: "corail",
    lignes: [["💥", "Attrapée : <b>−1 nid</b> et retour au départ."], ["🛡️", "À l'abri <b>sur la plage</b> et <b>dans les algues</b>… sauf pendant que tu manges."]] },
  { cle: "temps", ic: "🕐", titre: "Le temps", couleur: "nuit",
    lignes: [["📅", `Une partie = <b>3 jours</b> (${TICKS} tours).`], ["🌙", "La nuit : de <b>19 h à 6 h</b>."], ["☀️", "Le jour, sur la plage, le soleil fatigue."]] },
  { cle: "programme", ic: "🧠", titre: "Ton programme", couleur: "violet",
    lignes: [["1️⃣", "À chaque tour, ta tortue fait <b>une seule action</b>."], ["⬇️", "Python lit tes règles <b>de haut en bas</b> : c'est la <b>première règle vraie</b> qui gagne."]] },
];

const carte = (c, i) => `<article class="regle-carte rc-${c.couleur}" data-cle="${c.cle}">
  <header><span class="rc-num">${i + 1}</span><span class="rc-ic" aria-hidden="true">${c.ic}</span><h3>${c.titre}</h3></header>
  <ul>${c.lignes.map(([ic, t]) => `<li><span class="rc-li-ic" aria-hidden="true">${ic}</span><span>${t}</span></li>`).join("")}</ul>
  ${c.pied ? `<p class="rc-pied">${c.pied}</p>` : ""}
</article>`;

// toutes les cartes ; seulement : ["pondre", "energie"] pour n'en montrer que certaines
export function reglesCartesHTML({ seulement = null, titre = null } = {}) {
  const l = CARTES_REGLES.filter((c) => !seulement || seulement.includes(c.cle));
  return `${titre ? `<h2 class="regles-titre">${titre}</h2>` : ""}<div class="regles-cartes">${l.map((c) => carte(c, CARTES_REGLES.indexOf(c))).join("")}</div>`;
}

// l'aide-mémoire : une ligne de pastilles, toujours la même, lisible d'un coup d'œil
export function aideMemoireHTML({ lien = null } = {}) {
  const p = (ic, t, titre) => `<span class="am-pastille" title="${titre}"><span aria-hidden="true">${ic}</span> ${t}</span>`;
  return `<div class="aide-memoire" aria-label="Aide-mémoire des règles"><b class="am-titre">📌 À retenir</b>
    ${p("🥚", `= 🏖️ plage + 🌙 nuit + ⚡ ${P.energiePonte}`, "Pour pondre : sur la plage, la nuit, avec assez d'énergie")}
    ${p("🌿", `+${P.gainAlgue} ⚡`, "Manger des algues")}
    ${p("🛍️", `−${P.pertePlastique} ⚡`, "Avaler un sac plastique")}
    ${p("🦈", "−1 nid", "Attrapée par un requin")}
    ${p("🧠", "1 action par tour : la 1<sup>re</sup> règle vraie", "Python lit de haut en bas")}
    ${lien ? `<button type="button" class="btn small ghost am-lien" data-onglet="${lien}">📜 Toutes les règles</button>` : ""}
  </div>`;
}

// le modèle d'un programme, en français ET en Python, côte à côte
export function modeleHTML() {
  return `<div class="modele-duo">
    <div class="md-fr"><h4>🗣️ En français</h4><ol>
      <li><b>Si</b> <i>question</i> → <i>ordre</i></li>
      <li><b>Sinon, si</b> <i>autre question</i> → <i>ordre</i></li>
      <li><b>Sinon</b> → <i>ordre</i></li></ol></div>
    <pre class="modele md-py" aria-label="En Python"><span class="tok-kw">def</span> tour():
    <span class="tok-kw">if</span> <i>question</i>:
        <i>ordre</i>()
    <span class="tok-kw">elif</span> <i>autre question</i>:
        <i>ordre</i>()
    <span class="tok-kw">else</span>:
        <i>ordre</i>()</pre></div>`;
}
