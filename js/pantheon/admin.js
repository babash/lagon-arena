// =====================================================================
//  Lagon Arena — l'ADMINISTRATION du Panthéon (pantheon.html?admin)
//  Le mot de passe est choisi dans la base (voir l'en-tête de supabase.sql) ; il reste en mémoire
//  dans cette page seulement. L'administrateur peut :
//   • VÉRIFIER les scores : chaque tortue repasse le banc d'essai dans ce navigateur (le calcul
//     est déterministe), et son score est remplacé par le score recalculé, marqué ✔ ;
//   • lire le programme d'une tortue, et RETIRER une tortue (pseudo ou lycée inapproprié, triche).
// =====================================================================
import { db } from "../db.js";
import { $, el, esc, toast } from "../common.js";
import { BANC, evaluerBanc } from "../pantheon.js";

const nombre = (x) => Number(x).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let secret = "", liste = [], recharger = () => {};

export function admin(opts) {
  recharger = opts.recharger;
  const box = $("#admin"); box.classList.remove("cache");
  box.innerHTML = `<h2>🛠️ Administration du Panthéon</h2>
    <form id="adm-login" class="row">
      <input type="password" id="adm-secret" placeholder="Mot de passe administrateur" autocomplete="current-password" style="max-width:280px">
      <button class="btn small sombre" type="submit">Entrer</button>
      <span class="petit muted">Le mot de passe se choisit dans la base (en-tête de <code>supabase.sql</code>).</span>
    </form>
    <div id="adm-contenu"></div>`;
  $("#adm-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    secret = $("#adm-secret").value;
    try { liste = await db.pantheonAdmin(secret); $("#adm-login").classList.add("cache"); afficher(); }
    catch (ex) { toast(ex.message, "err"); }
  });
}

function afficher() {
  const box = $("#adm-contenu");
  const aVerifier = liste.filter((t) => !t.verifie).length;
  box.innerHTML = `<div class="row">
      <button class="btn small or" id="adm-verif" ${aVerifier ? "" : "disabled"}>🔁 Vérifier les ${aVerifier} score${aVerifier > 1 ? "s" : ""} en attente</button>
      <button class="btn small ghost" id="adm-tout">Tout revérifier (${liste.length})</button>
      <span class="petit muted" id="adm-etat"></span>
    </div>
    <table class="scores"><thead><tr><th class="num">#</th><th>Tortue</th><th>Lycée</th><th class="num">Moyenne</th><th>État</th><th></th></tr></thead><tbody id="adm-liste"></tbody></table>`;
  const tb = $("#adm-liste");
  liste.forEach((t, i) => {
    const code = el("details", {}, el("summary", {}, "programme"), el("pre", { class: "code-admin" }, t.code));
    const retirer = el("button", { class: "btn small ghost" }, "Retirer");
    retirer.addEventListener("click", async () => {
      if (!retirer.classList.contains("confirmer")) { retirer.classList.add("confirmer"); retirer.textContent = "Confirmer ?"; return; }
      try { await db.pantheonRetirer(secret, t.id); liste = liste.filter((x) => x.id !== t.id); afficher(); recharger(); toast(`${t.pseudo} retirée du Panthéon.`); }
      catch (ex) { toast(ex.message, "err"); }
    });
    tb.append(el("tr", { "data-id": t.id }, el("td", { class: "num" }, String(i + 1)), el("td", {}, el("b", {}, t.pseudo), code),
      el("td", {}, t.lycee || "—"), el("td", { class: "num moy" }, nombre(t.moyenne)), el("td", { class: "etat" }, t.verifie ? "✔" : "⏳"), el("td", {}, retirer)));
  });
  $("#adm-verif").addEventListener("click", () => verifier(liste.filter((t) => !t.verifie)));
  $("#adm-tout").addEventListener("click", () => verifier(liste));
}

// chaque tortue repasse le banc d'essai ; on enregistre le score recalculé
async function verifier(aFaire) {
  const etat = $("#adm-etat"); let ecarts = 0;
  for (const b of document.querySelectorAll("#adm-contenu button")) b.disabled = true;
  for (const [i, t] of aFaire.entries()) {
    etat.textContent = `${i + 1} / ${aFaire.length} : ${t.pseudo}…`;
    if (t.banc !== BANC.version) continue;
    const r = await evaluerBanc(t.code);
    const ecart = Math.abs(r.moyenne - Number(t.moyenne)) > 0.005;
    try { await db.pantheonValider(secret, t.id, r.moyenne); } catch (ex) { toast(ex.message, "err"); break; }
    const tr = document.querySelector(`#adm-liste tr[data-id="${t.id}"]`);
    if (tr) {
      tr.querySelector(".moy").innerHTML = ecart ? `<s>${nombre(t.moyenne)}</s> → <b class="ecart">${nombre(r.moyenne)}</b>` : nombre(r.moyenne);
      tr.querySelector(".etat").textContent = ecart ? "⚠️ corrigé" : "✔";
    }
    if (ecart) ecarts++;
    t.moyenne = r.moyenne; t.verifie = true;
  }
  etat.innerHTML = `Vérification terminée. ${ecarts ? `<b>${ecarts} score${ecarts > 1 ? "s" : ""} corrigé${ecarts > 1 ? "s" : ""}</b> (déclaré différent du score recalculé : à surveiller).` : "Tous les scores déclarés étaient exacts."}`;
  for (const b of document.querySelectorAll("#adm-contenu button")) b.disabled = false;
  const reste = liste.filter((t) => !t.verifie).length, bv = $("#adm-verif");
  bv.textContent = reste ? `🔁 Vérifier les ${reste} score${reste > 1 ? "s" : ""} en attente` : "✔ Tous les scores sont vérifiés";
  bv.disabled = !reste;
  recharger();
}
