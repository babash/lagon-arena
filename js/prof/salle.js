// =====================================================================
//  Lagon Arena — enseignant : une SALLE OUVERTE
//  Colonne de gauche (code, élèves connectés, réglages, liens) + la scène projetée.
// =====================================================================
import { db, MODE } from "../db.js";
import { TWISTS } from "../engine.js";
import { $, el, esc, toast } from "../common.js";
import { S, reglages, sauverReglages, mesSalles, oublierSalle, titreManche, quandPilotee, navigation } from "./etat.js";
import { rendreScene, majEnvois } from "./scenes.js";
import { repartirRetardataires } from "./preparer.js";
import { lienEleves, adresseCourte, fenetreLienEleves, fenetreLienEnseignant, fenetreCodesSession } from "./liens.js";
import { ajouterFaux } from "./demo.js";

// après chaque pilotage (nouvelle manche, brawl, résultats…), tout se redessine
quandPilotee(() => { majInfo(); rendreScene(); sonder(); });

export async function ouvrir(code) {
  const m = mesSalles()[code];
  if (!m) { toast("Cette salle n'a pas été créée sur ce navigateur.", "err"); return navigation.accueil(); }
  S.code = code; S.secret = m.secret;
  S.salle = await db.salle(code);
  if (!S.salle) { toast("Salle introuvable (supprimée après 60 jours sans utilisation ?).", "err"); oublierSalle(code); return navigation.accueil(); }
  history.replaceState(null, "", "prof.html?salle=" + code);
  $("#main").innerHTML = `<div class="prof-layout">
    <aside class="card cote">
      <div class="petit muted">Code de la salle${m.devoir ? ' · <span class="pill or-pill petit">📚 devoir</span>' : ""}</div>
      <div class="code-salle">${code}</div>
      <div class="petit lien-salle">${esc(adresseCourte())}</div>
      <button class="btn small" id="lien-eleves">🔗 Lien d'accès élèves</button>
      <div class="sep"></div>
      <h3 style="display:flex;gap:6px;align-items:center">🐢 Élèves <span class="pill sombre" id="nb">0</span></h3>
      <ul class="joueurs-liste" id="liste"></ul>
      ${MODE === "demo" ? `<div class="row" style="margin-top:8px"><button class="btn small ghost" id="faux">🤖 + 3 élèves fictifs</button><a class="btn small ghost" target="_blank" href="${lienEleves()}">➕ Ouvrir un élève</a></div>` : ""}
      <div class="sep"></div>
      <details class="reglages-d"><summary><b>⚙️ Réglages</b></summary>
        <div class="reglages" style="margin-top:8px">
          <label class="champ petit">1re programmation (min)<input type="number" min="1" max="30" step="0.5" id="r-d1" value="${reglages.duree1 / 60}"></label>
          <label class="champ petit">Rematchs (min)<input type="number" min="1" max="30" step="0.5" id="r-d" value="${reglages.duree / 60}"></label>
          <label class="champ petit">Duel (min)<input type="number" min="1" max="30" step="0.5" id="r-dd" value="${reglages.dureeDuel / 60}"></label>
          <label class="champ petit">Tortues minimum (🤖 sinon)<input type="number" min="0" max="20" id="r-min" value="${reglages.min}"></label>
        </div></details>
      <div class="sep"></div>
      <div class="row"><button class="btn small ghost" id="quitter">← Mes salles</button>
        <button class="btn small ghost" id="autre-pc" title="Piloter cette salle depuis un autre ordinateur (séance longue, à la maison…)">🏠 Autre ordinateur</button>
        <button class="btn small ghost" id="codes" title="Le code de session de chaque élève, pour se reconnecter depuis un autre ordinateur">🔑 Codes de session</button></div>
    </aside>
    <section class="card stage" id="stage"></section>
  </div>`;
  $("#lien-eleves").addEventListener("click", () => fenetreLienEleves({ devoir: !!m.devoir }));
  $("#quitter").addEventListener("click", () => navigation.accueil());
  $("#autre-pc").addEventListener("click", fenetreLienEnseignant);
  $("#codes").addEventListener("click", fenetreCodesSession);
  if ($("#faux")) $("#faux").addEventListener("click", () => ajouterFaux().then(sonder));
  for (const [id, k, f] of [["r-d1", "duree1", 60], ["r-d", "duree", 60], ["r-dd", "dureeDuel", 60], ["r-min", "min", 1]])
    $("#" + id).addEventListener("change", (e) => { const v = parseFloat(e.target.value); if (v >= 0) { reglages[k] = Math.round(v * f); sauverReglages(); } });
  majInfo();
  await sonder();
  S.sondage = setInterval(sonder, 3000);
  rendreScene();
}

// quitter la salle (retour à l'accueil)
export function fermer() {
  clearInterval(S.sondage); clearInterval(S.chrono); S.sondage = S.chrono = null;
  if (S.viewer) { S.viewer.destroy(); S.viewer = null; }
  S.code = S.secret = S.salle = null;
  connus = null;
}

function majInfo() {
  if (!S.salle) return;
  const T = TWISTS[S.salle.nouveaute] || TWISTS.calme;
  $("#info").innerHTML = `<span class="pill">🔑 ${S.code}</span>` +
    (S.salle.manche > 0 ? `<span class="pill">${esc(titreManche())} · ${T.icone}</span>` : "") +
    (MODE === "demo" ? `<span class="pill mode-demo">Mode démo</span>` : "");
}

// --- élèves connectés et tortues envoyées (toutes les 3 secondes) ---
let connus = null;
export async function sonder() {
  if (!S.code) return;
  try {
    [S.joueurs, S.depots] = await Promise.all([db.joueurs(S.code), S.salle.manche > 0 ? db.depots(S.code, S.salle.manche) : Promise.resolve([])]);
  } catch { return; }
  // les élèves peuvent arriver en cours de partie : on les annonce
  const avant = connus;
  connus = new Set(S.joueurs.map((j) => j.pseudo));
  if (avant && S.salle.manche > 0) for (const j of S.joueurs) if (!avant.has(j.pseudo)) toast(`🆕 ${j.pseudo} rejoint la partie : sa tortue jouera au prochain brawl.`);
  repartirRetardataires();
  listeEleves();
  if (S.salle.phase === "attente") { const n = $("#nb-grand"); if (n) n.textContent = S.joueurs.length; }
  if (S.salle.phase === "prog") majEnvois();
}

function listeEleves() {
  const envoyes = new Set(S.depots.map((d) => d.pseudo)), s = S.salle;
  $("#nb").textContent = S.joueurs.length;
  const liste = $("#liste");
  liste.innerHTML = S.joueurs.length ? "" : `<li class="muted">Personne pour l'instant…</li>`;
  for (const j of S.joueurs) {
    const spect = s.duel && !s.duel.includes(j.pseudo);
    const etat = s.manche === 0 ? "" : spect ? "👀" : envoyes.has(j.pseudo) ? "✅" : s.phase === "prog" ? "⏳" : "·";
    const x = el("button", { class: "x", title: "Retirer cet élève (et ses tortues)" }, "✕");
    x.addEventListener("click", async () => {
      if (!confirm(`Retirer ${j.pseudo} de la salle ? (ses tortues sont supprimées)`)) return;
      try { await db.retirerJoueur(S.code, S.secret, j.pseudo); sonder(); } catch (e) { toast(e.message, "err"); }
    });
    const cle = el("button", { class: "x", title: "Débloquer ce pseudo : l'élève pourra se reconnecter depuis un autre ordinateur sans code de session (il garde ses tortues et ses points)" }, "🔓");
    cle.addEventListener("click", async () => {
      if (!confirm(`Débloquer le pseudo ${j.pseudo} ?\nL'élève pourra le reprendre en rejoignant la salle depuis un autre ordinateur, sans code de session ; il garde ses tortues et ses points.`)) return;
      try { await db.libererPseudo(S.code, S.secret, j.pseudo); toast(`🔓 ${j.pseudo} peut se reconnecter.`); } catch (e) { toast(e.message, "err"); }
    });
    liste.append(el("li", {}, el("span", { class: "swatch", style: `background:${j.couleur}` }), j.pseudo,
      el("span", { class: "etat", title: etat === "✅" ? "tortue envoyée" : etat === "⏳" ? "pas encore envoyée" : "" }, etat), cle, x));
  }
}
