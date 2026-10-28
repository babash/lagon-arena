// =====================================================================
//  Lagon Arena — tutoriel AVANCÉ : choisir son niveau, puis le suivre
//    tuto-avance.html                  → les trois niveaux
//    tuto-avance.html?niveau=moyen     → 🥈 Intermédiaire (pousser…)
//    tuto-avance.html?niveau=expert    → 🥇 Expert (lire le lagon, choisir ses algues)
//    tuto-avance.html?niveau=equipe    → 👥 Équipe (s'entraider, l'équipe rivale)
// =====================================================================
import { $, store } from "../common.js";
import { demarrer } from "../tutokit.js";
import { NIVEAUX } from "./commun.js";
import { ETAPES_MOYEN } from "./moyen.js";
import { ETAPES_EXPERT } from "./expert.js";
import { ETAPES_EQUIPE } from "./equipe.js";

const ETAPES = { moyen: ETAPES_MOYEN, expert: ETAPES_EXPERT, equipe: ETAPES_EQUIPE };
const niveau = new URLSearchParams(location.search).get("niveau");

// étoiles gagnées dans un niveau
function etoiles(n) {
  const faits = store.get(NIVEAUX[n].cle, { faits: [] }).faits || [];
  const avecEtoile = ETAPES[n].filter((e) => e.cle);
  return { faits: avecEtoile.filter((e) => faits.includes(e.cle)).length, total: avecEtoile.length };
}

if (ETAPES[niveau]) {
  const N = NIVEAUX[niveau];
  $("#niveau").textContent = `${N.icone} ${N.titre}`;
  demarrer(ETAPES[niveau], N.cle);
} else {
  // les trois niveaux
  $("#niveau").textContent = "Choisis ton niveau";
  for (const s of ["#nav", ".tuto-bas", "#progression"]) $(s).classList.add("cache");
  $("#etape").innerHTML = `<div class="niveaux-tete">
      <h2>🚀 Tutoriel avancé</h2>
      <p>Tu as fait le <a href="tuto.html">tutoriel</a> et tu sais écrire des <code>if</code> / <code>elif</code> / <code>else</code> ? Choisis un niveau. Tu peux les faire dans l'ordre, ou aller directement à celui qui t'intéresse.</p>
    </div>
    <div class="niveaux">${Object.entries(NIVEAUX).map(([k, N]) => {
      const e = etoiles(k), fini = e.total && e.faits === e.total;
      return `<a class="card niveau ${fini ? "fini" : ""}" href="tuto-avance.html?niveau=${k}">
        <div class="ico">${N.icone}</div><h3>${N.titre}</h3>
        <p>${N.resume}</p>
        <p class="petit"><b>${ETAPES[k].length} étapes</b> · défi : ${N.defi}</p>
        <div class="jauge"><div style="width:${e.total ? (100 * e.faits) / e.total : 0}%"></div><span>⭐ ${e.faits} / ${e.total}</span></div>
        <span class="btn ${fini ? "ghost" : ""}">${fini ? "✓ Revoir" : e.faits ? "Continuer →" : "Commencer →"}</span>
      </a>`;
    }).join("")}</div>`;
}
