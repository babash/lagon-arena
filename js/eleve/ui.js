// =====================================================================
//  Lagon Arena — élève : onglets, bandeau, fenêtre par-dessus la page, dates
// =====================================================================
import { $, $$, el, store } from "../common.js";
import { brancherRegles, brancherConseils } from "../aide.js";

// les onglets, tous au même niveau. Avec « côte à côte » (grand écran), Programmer et Tester s'affichent ensemble.
const ONGLETS = ["prog", "test", "res", "cls", "regles", "conseils"];
let actuel = "prog";
const cote = () => $("#cote").checked && matchMedia("(min-width: 1100px)").matches;
export function onglet(t) {
  actuel = t;
  const duo = cote() && (t === "prog" || t === "test");
  $$("#tabs .tab").forEach((b) => { const on = b.dataset.t === t || (duo && (b.dataset.t === "prog" || b.dataset.t === "test")); b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); });
  for (const k of ONGLETS) $("#t-" + k).classList.toggle("cache", !(k === t || (duo && (k === "prog" || k === "test"))));
  $("#espace").classList.toggle("duo", duo);
  const b = $(`#tabs [data-t="${t}"] .notif`); if (b) b.remove();
}
export const ongletActuel = () => actuel;
$$("#tabs .tab").forEach((b) => b.addEventListener("click", () => onglet(b.dataset.t)));
{
  const c = $("#cote");
  c.checked = !!store.get("lagon:cote", false);
  c.addEventListener("change", () => { store.set("lagon:cote", c.checked); onglet(actuel === "test" || actuel === "prog" ? actuel : "prog"); });
  addEventListener("resize", () => { if (actuel === "prog" || actuel === "test") onglet(actuel); });
  onglet("prog");
}
// une pastille sur un onglet (nouveau contenu)
export const notifier = (t) => { const b = $(`#tabs [data-t="${t}"]`); if (!b.classList.contains("on") && !b.querySelector(".notif")) b.append(el("span", { class: "notif" })); };
brancherRegles($("#aide-regles"));
brancherConseils($("#aide-conseils"));
// les liens « 📜 Toutes les règles » (aide-mémoire) ouvrent l'onglet des règles
document.addEventListener("click", (e) => { const b = e.target.closest("[data-onglet]"); if (b) onglet(b.dataset.onglet); });

export function bandeau(html, type = "info") {
  const b = $("#bandeau");
  if (!html) { b.classList.add("cache"); return; }
  b.className = "bandeau " + type; b.innerHTML = html;
}

export function overlay(html, fermable = false) {
  const o = $("#overlay");
  if (!html) { o.innerHTML = ""; return; }
  o.innerHTML = `<div class="overlay"><div class="boite">${html}${fermable ? '<p><button class="btn" id="fermer-ov">Fermer</button></p>' : ""}</div></div>`;
  if (fermable) $("#fermer-ov").addEventListener("click", () => overlay(null));
}

// « à 14:05 » aujourd'hui, « le 3 nov. à 14:05 » sinon
export const jourHeure = (iso) => {
  const d = new Date(iso), auj = new Date().toDateString() === d.toDateString();
  return (auj ? "" : "le " + d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) + " ") + "à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};
