// =====================================================================
//  Lagon Arena — la page du PANTHÉON : les 100 meilleures tortues de tous les temps
//    pantheon.html          → le classement (tous les lycées, ou un seul), ma tortue
//    pantheon.html?admin    → l'administration (vérifier les scores, retirer une tortue)
// =====================================================================
import { db, MODE } from "../db.js";
import { $, el, esc, toast, store, normaliserCode, codeValide } from "../common.js";
import { reperes } from "../pantheon.js";
import { admin } from "./admin.js";

const params = new URLSearchParams(location.search);
const nombre = (x) => Number(x).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const medaille = (r) => ["🥇", "🥈", "🥉"][r - 1] || r;
const jetonPantheon = (c) => `pantheon-${c}-lagon`;
if (MODE === "demo") $("#demo").classList.remove("cache");

let lycee = params.get("lycee") || "", top = [], refs = [];

async function charger() {
  try {
    top = await db.pantheonTop(100, lycee || null);
  } catch (e) { $("#classement").innerHTML = `<tr><td colspan="5" class="msg err">${esc(e.message)}</td></tr>`; return; }
  afficher();
  $("#resume").textContent = top.length ? `${top.length} tortue${top.length > 1 ? "s" : ""}${lycee ? " dans ce lycée" : ""}` : "";
}

function afficher() {
  const moi = (store.get("lagon:pantheon", {}) || {}).pseudo;
  // les tortues d'entraînement s'intercalent à leur place, sans rang
  const lignes = top.map((t) => ({ ...t, type: "eleve" }));
  for (const r of refs) {
    const i = lignes.findIndex((l) => Number(l.moyenne) < r.moyenne);
    lignes.splice(i < 0 ? lignes.length : i, 0, { type: "repere", pseudo: r.nom, moyenne: r.moyenne });
  }
  const tb = $("#classement"); tb.innerHTML = "";
  if (!top.length) tb.append(el("tr", {}, el("td", { colspan: 5, class: "muted" }, lycee ? "Aucune tortue de ce lycée pour l'instant." : "Le Panthéon est encore vide : à toi d'y entrer le premier !")));
  for (const l of lignes) {
    if (l.type === "repere") {
      tb.append(el("tr", { class: "bot repere" }, el("td", { class: "num" }, ""), el("td", {}, `🤖 ${l.pseudo}`), el("td", {}, "tortue d'entraînement"),
        el("td", { class: "num" }, nombre(l.moyenne)), el("td", {}, "")));
      continue;
    }
    tb.append(el("tr", { class: l.pseudo === moi ? "moi" : l.rang <= 3 ? "top3" : "" },
      el("td", { class: "num" }, String(medaille(Number(l.rang)))),
      el("td", {}, el("b", {}, l.pseudo)),
      el("td", {}, l.lycee ? el("a", { href: "#", "data-lycee": l.lycee, title: "Voir ce lycée" }, l.lycee) : el("span", { class: "muted" }, "—")),
      el("td", { class: "num" }, nombre(l.moyenne)),
      el("td", { title: l.verifie ? "Score recalculé et vérifié" : "En attente de vérification" }, l.verifie ? "✔" : "⏳")));
  }
  tb.querySelectorAll("[data-lycee]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); choisirLycee(a.dataset.lycee); }));
}

function choisirLycee(l) {
  lycee = l; const s = $("#lycee");
  if (l && ![...s.options].some((o) => o.value.toLowerCase() === l.toLowerCase())) s.append(el("option", { value: l }, l));
  s.value = [...s.options].find((o) => o.value.toLowerCase() === l.toLowerCase())?.value || "";
  history.replaceState(null, "", "pantheon.html" + (l ? "?lycee=" + encodeURIComponent(l) : "") + (params.has("admin") ? (l ? "&" : "?") + "admin" : ""));
  charger();
}

async function lycees() {
  try {
    const l = await db.pantheonLycees();
    const s = $("#lycee");
    for (const x of l) s.append(el("option", { value: x.lycee }, `${x.lycee} (${x.tortues})`));
    if (lycee) choisirLycee(lycee);
    s.addEventListener("change", () => choisirLycee(s.value));
  } catch { /* le classement affichera l'erreur */ }
}

// ma tortue : avec le code Panthéon gardé sur ce poste, ou tapé
async function maTortue(code, annoncer = false) {
  const box = $("#ma-tortue");
  if (!code) { box.innerHTML = ""; return; }
  try {
    const t = await db.maTortuePantheon(jetonPantheon(code));
    if (!t) { box.innerHTML = ""; if (annoncer) toast("Aucune tortue avec ce code Panthéon.", "err"); return; }
    box.innerHTML = `<div class="msg ok">🐢 Ta tortue <b>${esc(t.pseudo)}</b>${t.lycee ? ` (${esc(t.lycee)})` : ""} est <b>${t.rang}${t.rang === 1 ? "re" : "e"}</b> du Panthéon avec <b>${nombre(t.moyenne)}</b> nids en moyenne ${t.verifie ? "✔" : "⏳"}.
      Pour l'améliorer : modifie-la dans le <a href="eleve.html?libre=1">bac à sable</a>, puis « 🏛️ Proposer au Panthéon » avec ton code.</div>`;
    store.set("lagon:pantheon", { ...(store.get("lagon:pantheon", {}) || {}), code, pseudo: t.pseudo, lycee: t.lycee || "" });
    afficher();
  } catch (e) { if (annoncer) toast(e.message, "err"); }
}
$("#retrouver").addEventListener("submit", (e) => {
  e.preventDefault();
  const c = normaliserCode($("#code-pt").value);
  if (!codeValide(c)) { toast("Code Panthéon incorrect : 8 lettres ou chiffres, par exemple K7PQ-2XMA.", "err"); return; }
  maTortue(c, true);
});

await Promise.all([charger(), lycees()]);
maTortue((store.get("lagon:pantheon", {}) || {}).code);
// les repères (tortues d'entraînement sur le même banc) : calculés ici, après l'affichage
setTimeout(async () => { refs = await reperes(); afficher(); }, 50);
if (params.has("admin")) admin({ recharger: charger });
