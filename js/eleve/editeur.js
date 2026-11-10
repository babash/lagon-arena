// =====================================================================
//  Lagon Arena — élève : l'ÉDITEUR (vérification en direct, coup de pouce, mode avancé, aide-mémoire)
// =====================================================================
import { check } from "../interp.js";
import { CodeEditor, boiteOutils } from "../editor.js";
import { CODE_DEPART } from "../engine.js";
import { coupDePouceHTML } from "../pouce.js";
import { bilanHTML, brancherLiens, lignesEnCause } from "../bilan.js";
import { diagnostiquer } from "../moteur/diagnostic.js";
import { estAvance, setAvance, estEquipe } from "../primitives.js";
import { aideMemoireHTML } from "../regles-vue.js";
import { $, el, esc, toast, store, activerCopie, CLE_TORTUE_TUTO } from "../common.js";
import { cleCode } from "./etat.js";

// à chaque modification du code (par l'élève ou par la page), d'autres parties se mettent à jour (envoi…)
const apresModif = [];
export const quandModifie = (f) => apresModif.push(f);
let minuterie = null;
// la tortue construite à la fin du tutoriel : chargée d'office si l'éditeur est vide, proposée sinon
const tortueTuto = store.get(CLE_TORTUE_TUTO);
const dejaEcrit = store.get(cleCode);
const marquerPrise = () => { const t = store.get(CLE_TORTUE_TUTO); if (t) store.set(CLE_TORTUE_TUTO, { ...t, pris: [...(t.pris || []), cleCode] }); };
let aProposer = false, depart = dejaEcrit || CODE_DEPART;
if (tortueTuto && tortueTuto.code && !(tortueTuto.pris || []).includes(cleCode)) {
  if (!dejaEcrit) { depart = tortueTuto.code; store.set(cleCode, depart); marquerPrise(); setTimeout(() => toast("🐢 Ta tortue du tutoriel t'attend dans l'éditeur !"), 400); }
  else if (dejaEcrit !== tortueTuto.code) aProposer = true;
  else marquerPrise();
}
export const ed = new CodeEditor($("#ed"), {
  value: depart,
  onChange: (v) => { store.set(cleCode, v); clearTimeout(minuterie); minuterie = setTimeout(verifier, 450); apresModif.forEach((f) => f()); },
});
boiteOutils($("#outils"), ed);
activerCopie();

// remplacer le code de l'éditeur (tortue de départ, tortue retrouvée sur un autre ordinateur…)
export function remplacerCode(code) {
  ed.value = code; store.set(cleCode, code); verifier();
  apresModif.forEach((f) => f());
}

// à chaque modification : la syntaxe d'abord (🐞), puis les tests de la tortue (🟢 / 🟠 / 🔴)
let ouvert = store.get("lagon:tests-ouverts", false);
export function verifier() {
  const c = check(ed.value), st = $("#statut");
  if (!c.ok) {
    ed.setErreur(c.error.line);
    st.innerHTML = `<div class="msg err">🐞 <b>Ligne ${c.error.line}</b> : ${esc(c.error.message)}</div>`;
  } else {
    const d = diagnostiquer(ed.value);
    st.innerHTML = bilanHTML(d, { ouvert }) + c.warnings.map((w) => `<div class="msg warn">⚠️ Ligne ${w.line} : ${esc(w.msg)}</div>`).join("");
    ed.marquer(lignesEnCause(d));
    const det = st.querySelector(".bilan-tests");
    if (det) det.addEventListener("toggle", () => { ouvert = det.open; store.set("lagon:tests-ouverts", ouvert); });
  }
  return c;
}
brancherLiens($("#statut"), ed);
verifier();
if (aProposer) {
  const m = el("div", { class: "msg info proposer-tuto", html: `🐢 Tu as construit une tortue dans le tutoriel. <button type="button" class="btn small vert">Prendre ma tortue du tutoriel</button> <button type="button" class="btn small ghost">Non merci</button>` });
  const [oui, non] = m.querySelectorAll("button");
  oui.addEventListener("click", () => { if (!confirm("Remplacer ton code actuel par ta tortue du tutoriel ?")) return; remplacerCode(tortueTuto.code); marquerPrise(); m.remove(); toast("🐢 Ta tortue du tutoriel est dans l'éditeur."); });
  non.addEventListener("click", () => { marquerPrise(); m.remove(); });
  $("#statut").before(m);
}
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

// l'aide-mémoire des règles, toujours le même et toujours visible (le détail : onglet 📜 Règles)
$("#rappel").innerHTML = aideMemoireHTML({ lien: "regles" });
