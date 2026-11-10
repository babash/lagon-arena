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
import { etatTortue, ficheEleve, fenetreClasse, chargerCodes, iconeEtat } from "./fiche.js";

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
      <div class="petit etab-salle" id="etab-salle"></div>
      <div class="petit lien-salle">${esc(adresseCourte())}</div>
      <button class="btn small" id="lien-eleves">🔗 Lien d'accès élèves</button>
      <div class="sep"></div>
      <h3 style="display:flex;gap:6px;align-items:center">🐢 Élèves <span class="pill sombre" id="nb">0</span></h3>
      <button type="button" class="etat-classe cache" id="etat-classe" title="Qui ne pond pas, et pourquoi"></button>
      <ul class="joueurs-liste" id="liste"></ul>
      <p class="petit muted cache" id="aide-liste">👆 Un clic sur un pseudo : son code et ses tests.</p>
      ${MODE === "demo" ? `<div class="row" style="margin-top:8px"><button class="btn small ghost" id="faux">🤖 + 3 élèves fictif·ve·s</button><a class="btn small ghost" target="_blank" href="${lienEleves()}">➕ Ouvrir un·e élève</a></div>` : ""}
      <div class="sep"></div>
      <details class="reglages-d"><summary><b>⚙️ Réglages</b></summary>
        <div class="reglages" style="margin-top:8px">
          <label class="champ petit">1re programmation (min)<input type="number" min="1" max="30" step="0.5" id="r-d1" value="${reglages.duree1 / 60}"></label>
          <label class="champ petit">Rematchs (min)<input type="number" min="1" max="30" step="0.5" id="r-d" value="${reglages.duree / 60}"></label>
          <label class="champ petit">Duel (min)<input type="number" min="1" max="30" step="0.5" id="r-dd" value="${reglages.dureeDuel / 60}"></label>
          <label class="champ petit">Tortues minimum (🤖 sinon)<input type="number" min="0" max="20" id="r-min" value="${reglages.min}"></label>
          <label class="champ petit r-etab">🏫 Établissement (facultatif)<input type="text" maxlength="60" id="r-etab" value="${esc(S.salle.etablissement || "")}" placeholder="ex. Lycée de Chirongui"></label>
          <label class="champ petit r-pantheon"><span><input type="checkbox" id="r-pt" ${reglages.pantheonAuto !== false ? "checked" : ""}> 🏛️ Envoyer les meilleures tortues au Panthéon</span>
            <select id="r-pt-nb"><option value="1" ${reglages.pantheonNb === 3 ? "" : "selected"}>la meilleure de chaque manche</option><option value="3" ${reglages.pantheonNb === 3 ? "selected" : ""}>les 3 meilleures de chaque manche</option></select></label>
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
  $("#r-pt").addEventListener("change", (e) => { reglages.pantheonAuto = e.target.checked; sauverReglages(); });
  $("#r-pt-nb").addEventListener("change", (e) => { reglages.pantheonNb = Number(e.target.value); sauverReglages(); });
  $("#etat-classe").addEventListener("click", () => fenetreClasse(elevesClasse(), ouvrirFiche));
  // l'établissement de la salle : affiché sous le code, modifiable dans les réglages
  const montrerEtab = () => { $("#etab-salle").textContent = S.salle.etablissement ? "🏫 " + S.salle.etablissement : ""; };
  montrerEtab();
  $("#r-etab").addEventListener("change", async (e) => {
    try {
      S.salle.etablissement = await db.definirEtablissement(code, S.secret, e.target.value);
      e.target.value = S.salle.etablissement || "";
      montrerEtab();
      toast(S.salle.etablissement ? "🏫 Établissement enregistré." : "Établissement retiré.");
    } catch (err) { toast(/pas prête/.test(err.message) ? "L'établissement ne peut pas être enregistré : la base de données n'est pas à jour (relancer supabase.sql)." : err.message, "err"); e.target.value = S.salle.etablissement || ""; }
  });
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
  S.codes = null; S.resultats = null; sigCodes = "";
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
let connus = null, sigCodes = "";
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
  // les codes des élèves (pour leur état et leur fiche) : rechargés seulement quand quelque chose a changé
  const sig = `${S.code}:${S.salle.manche}:${S.salle.phase}:` + S.depots.map((d) => d.pseudo + "@" + d.depose_le).sort().join("|");
  if (S.salle.manche > 0 && sig !== sigCodes) { sigCodes = sig; S.codes = await chargerCodes(); }
  listeEleves();
  if (S.salle.phase === "attente") { const n = $("#nb-grand"); if (n) n.textContent = S.joueurs.length; }
  if (S.salle.phase === "prog") majEnvois();
}

// les élèves qui jouent la manche, avec le code de leur dernière tortue (null = rien envoyé)
function elevesClasse() {
  const s = S.salle;
  return S.joueurs.filter((j) => !(s.duel && !s.duel.includes(j.pseudo)))
    .map((j) => ({ pseudo: j.pseudo, code: S.codes && S.codes[j.pseudo] ? S.codes[j.pseudo].code : null }));
}

// la fiche d'un élève (après un brawl : avec ses chiffres du match et « revoir le match »)
export function ouvrirFiche(pseudo) {
  if (!S.codes) return toast("Les codes ne sont pas disponibles : relance supabase.sql dans Supabase (fonction codes_manche).", "err");
  const j = S.joueurs.find((x) => x.pseudo === pseudo) || {}, c = S.codes[pseudo] || null;
  const R = S.resultats && S.resultats.manche === S.salle.manche && ["resultats", "fin"].includes(S.salle.phase) ? S.resultats : null;
  const t = R && R.sim.tortues.find((x) => x.id === pseudo), r = R && R.sim.resultats.find((x) => x.id === pseudo);
  ficheEleve({
    pseudo, couleur: j.couleur, code: c ? c.code : null, envoye: c && c.depose_le, manche: S.salle.manche, mancheCode: c ? c.manche : null,
    match: t && r ? { nids: r.nids, captures: r.captures, epuisee: (t.stats.epuisee || []).length } : null,
    revoir: t ? () => R.revoir(pseudo, c ? c.code : null) : null,
  });
}

function listeEleves() {
  const envoyes = new Set(S.depots.map((d) => d.pseudo)), s = S.salle;
  $("#nb").textContent = S.joueurs.length;
  const liste = $("#liste");
  liste.innerHTML = S.joueurs.length ? "" : `<li class="muted">Personne pour l'instant…</li>`;
  // le compteur « 🥚 12 / 25 tortues pondent » (d'après la dernière tortue envoyée)
  const avecCodes = S.codes && s.manche > 0, eleves = avecCodes ? elevesClasse() : [];
  const bouton = $("#etat-classe");
  bouton.classList.toggle("cache", !avecCodes || !eleves.length);
  $("#aide-liste").classList.toggle("cache", !avecCodes || !S.joueurs.length);
  if (avecCodes && eleves.length) {
    const n = eleves.filter((e) => etatTortue(e.code).cle === "pond").length;
    bouton.innerHTML = `🥚 <b>${n} tortue${n > 1 ? "s" : ""} sur ${eleves.length}</b> ${n > 1 ? "pondent" : "pond"} <span class="petit">🩺 pourquoi ?</span>`;
  }
  for (const j of S.joueurs) {
    const spect = s.duel && !s.duel.includes(j.pseudo);
    const c = avecCodes ? S.codes[j.pseudo] : null;
    const etat = s.manche === 0 ? "" : spect ? "👀" : avecCodes ? null : envoyes.has(j.pseudo) ? "✅" : s.phase === "prog" ? "⏳" : "·";
    const x = el("button", { class: "x", title: "Retirer cet·te élève (et ses tortues)" }, "✕");
    x.addEventListener("click", async () => {
      if (!confirm(`Retirer ${j.pseudo} de la salle ? (ses tortues sont supprimées)`)) return;
      try { await db.retirerJoueur(S.code, S.secret, j.pseudo); sonder(); } catch (e) { toast(e.message, "err"); }
    });
    const cle = el("button", { class: "x", title: "Débloquer ce pseudo : l'élève pourra se reconnecter depuis un autre ordinateur sans code de session (ses tortues et ses points sont gardés)" }, "🔓");
    cle.addEventListener("click", async () => {
      if (!confirm(`Débloquer le pseudo ${j.pseudo} ?\nL'élève pourra le reprendre en rejoignant la salle depuis un autre ordinateur, sans code de session ; ses tortues et ses points sont gardés.`)) return;
      try { await db.libererPseudo(S.code, S.secret, j.pseudo); toast(`🔓 ${j.pseudo} peut se reconnecter.`); } catch (e) { toast(e.message, "err"); }
    });
    let marque;
    if (etat !== null) marque = el("span", { class: "etat", title: etat === "✅" ? "tortue envoyée" : etat === "⏳" ? "pas encore envoyée" : "" }, etat);
    else {   // l'état de sa dernière tortue : 🟢 🟠 🔴 🐞 ⏳ (pâle si elle date d'une manche précédente)
      const st = etatTortue(c ? c.code : null);
      marque = iconeEtat(st);
      if (c && s.phase === "prog" && !envoyes.has(j.pseudo)) { marque.classList.add("ancienne"); marque.title += ` · tortue de la manche ${c.manche}, pas encore renvoyée`; }
    }
    const nom = avecCodes ? el("button", { type: "button", class: "nom-eleve", title: "Voir son code et ses tests" }, j.pseudo) : document.createTextNode(j.pseudo);
    if (avecCodes) nom.addEventListener("click", () => ouvrirFiche(j.pseudo));
    liste.append(el("li", {}, el("span", { class: "swatch", style: `background:${j.couleur}` }), nom, marque, cle, x));
  }
}
