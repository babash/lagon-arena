// =====================================================================
//  Lagon Arena — élève : onglets, bandeau, fenêtre par-dessus la page, dates
// =====================================================================
import { $, $$, el, AIDE_HTML } from "../common.js";

export function onglet(t) {
  $$("#tabs .tab").forEach((b) => b.classList.toggle("on", b.dataset.t === t));
  for (const k of ["prog", "res", "cls", "aide"]) $("#t-" + k).classList.toggle("cache", k !== t);
  const b = $(`#tabs [data-t="${t}"] .notif`); if (b) b.remove();
}
$$("#tabs .tab").forEach((b) => b.addEventListener("click", () => onglet(b.dataset.t)));
// une pastille sur un onglet (nouveau contenu)
export const notifier = (t) => { const b = $(`#tabs [data-t="${t}"]`); if (!b.classList.contains("on") && !b.querySelector(".notif")) b.append(el("span", { class: "notif" })); };
$("#aide").innerHTML = "<h2>❓ Aide-mémoire</h2>" + AIDE_HTML;

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

// « Ta tortue » réduit : le lagon du bac à sable prend toute la largeur (les boutons Tester / Envoyer restent)
{
  const grille = $("#prog-grid"), b = $("#reduire");
  const appliquer = (r) => { grille.classList.toggle("reduite", r); b.textContent = r ? "▶ Agrandir" : "◀ Réduire"; b.title = r ? "Afficher à nouveau ton code" : "Réduire ce panneau pour agrandir le lagon"; };
  let reduite = false;
  try { reduite = localStorage.getItem("lagon:reduite") === "1"; } catch { /* rien */ }
  appliquer(reduite);
  b.addEventListener("click", () => { reduite = !reduite; appliquer(reduite); try { localStorage.setItem("lagon:reduite", reduite ? "1" : "0"); } catch { /* rien */ } });
}
