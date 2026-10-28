// =====================================================================
//  Lagon Arena — élève : l'ÉDITEUR (vérification en direct, coup de pouce, mode avancé, rappels)
// =====================================================================
import { check } from "../interp.js";
import { CodeEditor, boiteOutils } from "../editor.js";
import { CODE_DEPART } from "../engine.js";
import { coupDePouceHTML } from "../pouce.js";
import { RAPPELS, estAvance, setAvance, estEquipe } from "../primitives.js";
import { $, el, esc, toast, store, activerCopie } from "../common.js";
import { cleCode } from "./etat.js";

// à chaque modification du code (par l'élève ou par la page), d'autres parties se mettent à jour (envoi…)
const apresModif = [];
export const quandModifie = (f) => apresModif.push(f);
let minuterie = null;
export const ed = new CodeEditor($("#ed"), {
  value: store.get(cleCode) || CODE_DEPART,
  onChange: (v) => { store.set(cleCode, v); clearTimeout(minuterie); minuterie = setTimeout(verifier, 450); apresModif.forEach((f) => f()); },
});
boiteOutils($("#outils"), ed);
activerCopie();

// remplacer le code de l'éditeur (tortue de départ, tortue retrouvée sur un autre ordinateur…)
export function remplacerCode(code) {
  ed.value = code; store.set(cleCode, code); verifier();
  apresModif.forEach((f) => f());
}

export function verifier() {
  const c = check(ed.value), st = $("#statut");
  if (!c.ok) {
    ed.setErreur(c.error.line);
    st.innerHTML = `<div class="msg err">🐞 <b>Ligne ${c.error.line}</b> : ${esc(c.error.message)}</div>`;
  } else {
    st.innerHTML = (c.warnings.length ? "" : `<div class="msg ok">✅ Code valide : ta tortue est prête à nager.</div>`) +
      c.warnings.map((w) => `<div class="msg warn">⚠️ Ligne ${w.line} : ${esc(w.msg)}</div>`).join("");
  }
  return c;
}
verifier();
$("#reinit").addEventListener("click", () => {
  if (confirm("Remplacer ton code par la tortue de départ ? (ton code actuel sera perdu)")) remplacerCode(CODE_DEPART);
});

// mode avancé : affiche les primitives du tutoriel avancé (et la tortue Pirate dans le bac à sable)
{
  const input = el("input", { type: "checkbox" }); input.checked = estAvance();
  const sw = el("label", { class: "switch petit", title: "Affiche les primitives avancées (distances, pousser, choisir ses algues…) dans l'autocomplétion et la boîte à outils" },
    input, el("span", { class: "glissiere" }), el("span", { html: '🚀 Primitives avancées <a href="tuto-avance.html" target="_blank">(tutoriel avancé)</a>' }));
  input.addEventListener("change", () => { setAvance(input.checked); toast(input.checked ? "🚀 Mode avancé : nouvelles primitives disponibles !" : "Mode simple."); });
  $("#outils").before(el("div", { class: "row avance-sw" }, sw));
}

// coup de pouce : l'idée suivante, d'après ce qui manque dans le code
const pouce = $("#pouce");
$("#pouce-btn").addEventListener("click", () => {
  if (!pouce.classList.contains("cache")) { pouce.classList.add("cache"); return; }
  pouce.innerHTML = coupDePouceHTML(ed.value, { equipe: estEquipe() }) + `<button class="btn small ghost" id="pouce-fermer">Fermer</button>`;
  pouce.classList.remove("cache");
  $("#pouce-fermer").addEventListener("click", () => pouce.classList.add("cache"));
});

// un rappel différent toutes les 15 secondes
let iRappel = Math.floor(Math.random() * RAPPELS.length);
const rappel = () => { $("#rappel").innerHTML = "🔁 <b>Rappel</b> · " + RAPPELS[iRappel % RAPPELS.length]; iRappel++; };
rappel(); setInterval(rappel, 15000);
