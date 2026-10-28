// =====================================================================
//  Lagon Arena — écran enseignant (à projeter au tableau)
// =====================================================================
import { db, MODE, synchroniserHorloge, secondesRestantes } from "./db.js";
import { CONFIG } from "./config.js";
import { TWISTS, TWIST_ORDER, TWIST_DUEL, BOTS, POINTS_RANG, BONUS_PROGRESSION, MAX_EQUIPES, equipeInfo, styleEquipe, resultatEquipes } from "./engine.js";
import { MatchViewer, tableauMatch } from "./viewer.js";
import { botsPourCompleter, lancerSimulation, calculerScores, classementCumule, meilleureProgression, estBot, infosManche, equipesCompletes, baremeEquipes } from "./brawl.js";
import { $, $$, el, esc, toast, store, mmss, jeton, twistCarte, cartesEquipesHTML, annonceEquipes, nomEquipe } from "./common.js";

const main = $("#main");
const mesSalles = () => store.get("lagon:prof", {});
const reglages = Object.assign({ duree1: CONFIG.DUREE_PROG_1, duree: CONFIG.DUREE_PROG, dureeDuel: 240, min: CONFIG.MIN_TORTUES }, store.get("lagon:reglages", {}));
const sauverReglages = () => store.set("lagon:reglages", reglages);

let CODE = null, SECRET = null, salle = null, joueurs = [], depots = [];
let viewer = null, sondage = null, chronoTimer = null;

$("#plein").addEventListener("click", () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); });
$("#panneau").addEventListener("click", () => { const l = $(".prof-layout"); if (l) l.classList.toggle("plein"); });

// =====================================================================
//  Accueil enseignant : créer ou reprendre une salle
// =====================================================================
function accueil() {
  CODE = null; SECRET = null; nettoyer();
  $("#info").innerHTML = MODE === "demo" ? `<span class="pill mode-demo">Mode démo</span>` : `<span class="pill" id="etat-db">⏳ Base de données…</span>`;
  if (MODE === "db") db.heureServeur()
    .then(() => { const p = $("#etat-db"); if (p) p.textContent = "🟢 Base de données"; })
    .catch((e) => { const p = $("#etat-db"); if (p) p.textContent = "🔴 Base de données"; toast(e.message, "err"); });
  const anciennes = Object.entries(mesSalles()).sort((a, b) => (b[1].cree || "").localeCompare(a[1].cree || ""));
  main.innerHTML = `<div class="grid2">
    <div class="card">
      <h2>🌊 Nouvelle séance</h2>
      <p>Créez une salle : un <b>code de 4 lettres</b> s'affiche, les élèves le tapent sur la page d'accueil avec un pseudo.</p>
      <button class="btn big corail" id="creer">➕ Créer une salle</button>
      ${MODE === "demo" ? `<div class="msg warn" style="margin-top:14px"><b>Mode démo</b> : la base de données n'est pas configurée (voir <code>js/config.js</code> et le README). Tout reste dans <b>ce navigateur</b> : pour tester, ouvrez des élèves dans d'autres onglets, ou ajoutez des élèves fictifs.</div>` : ""}
      ${anciennes.length ? `<div class="sep"></div><h3>Reprendre une salle</h3><ul class="joueurs-liste">${anciennes.map(([c, v]) => `<li><b>${c}</b><span class="petit muted">${v.cree ? new Date(v.cree).toLocaleString("fr-FR") : ""}</span><span class="etat"><button class="btn small" data-reprendre="${c}">Reprendre</button> <button class="x" data-oublier="${c}" title="Oublier">✕</button></span></li>`).join("")}</ul>` : ""}
    </div>
    <div class="card">
      <h2>⏱️ Déroulé conseillé (≈ 55 min)</h2>
      <ol class="seance">
        <li><b>Tutoriel</b> (10-15 min) : les élèves font <a href="tuto.html" target="_blank">le tutoriel</a> (règles + 3 missions de réparation).</li>
        <li><b>Manche 1</b> : ${Math.round(reglages.duree1 / 60)} min de programmation → brawl projeté (≈ 1 min 15) → 3 min de rapport.</li>
        <li><b>Manche 2 — rematch</b> avec une nouveauté : ${Math.round(reglages.duree / 60)} min → brawl → rapport.</li>
        <li><b>Manche 3 — finale</b> : ${Math.round(reglages.duree / 60)} min → brawl → rapport.</li>
        <li><b>Duel des champions</b> (facultatif) : les 3 premiers, dans la tempête.</li>
        <li><b>Bilan</b> : podium, meilleure progression, export CSV.</li>
      </ol>
      <h3>♾️ Manche longue (travail à la maison)</h3>
      <p>Dans « Préparer la manche », cochez <b>temps illimité</b> (ou le raccourci ♾️ Manche longue) : la manche reste ouverte jusqu'à ce que vous lanciez le brawl, au cours suivant par exemple. Chaque élève a un <b>code de session</b> pour se reconnecter depuis chez lui (bouton « 🏠 Mon code de session » de sa page ; vous les retrouvez tous avec « 🔑 Codes de session »). Une salle est gardée <b>60 jours</b> après sa dernière utilisation.</p>
      <h3>🧮 Points</h3>
      <p>Points selon le rang parmi les élèves : ${POINTS_RANG.slice(0, 6).join(", ")}… (1 point minimum), <b>+${BONUS_PROGRESSION}</b> si l'élève pond plus de nids qu'à la manche précédente. Les tortues d'entraînement 🤖 complètent le lagon s'il y a moins de ${reglages.min} élèves ; elles ne marquent pas de points.</p>
    </div></div>`;
  $("#creer").addEventListener("click", async () => {
    try {
      const r = await db.creerSalle();
      const s = mesSalles(); s[r.code] = { secret: r.secret, cree: new Date().toISOString() }; store.set("lagon:prof", s);
      ouvrir(r.code);
    } catch (e) { toast(e.message, "err"); }
  });
  $$("[data-reprendre]").forEach((b) => b.addEventListener("click", () => ouvrir(b.dataset.reprendre)));
  $$("[data-oublier]").forEach((b) => b.addEventListener("click", () => { const s = mesSalles(); delete s[b.dataset.oublier]; store.set("lagon:prof", s); accueil(); }));
  history.replaceState(null, "", "prof.html");
}

// =====================================================================
//  Salle ouverte
// =====================================================================
async function ouvrir(code) {
  const m = mesSalles()[code];
  if (!m) { toast("Cette salle n'a pas été créée sur ce navigateur.", "err"); return accueil(); }
  CODE = code; SECRET = m.secret;
  salle = await db.salle(CODE);
  if (!salle) { toast("Salle introuvable (supprimée après 60 jours sans utilisation ?).", "err"); const s = mesSalles(); delete s[code]; store.set("lagon:prof", s); return accueil(); }
  history.replaceState(null, "", "prof.html?salle=" + CODE);
  main.innerHTML = `<div class="prof-layout">
    <aside class="card cote">
      <div class="petit muted">Code de la salle</div>
      <div class="code-salle">${CODE}</div>
      <div class="petit lien-salle"><span id="url"></span> <button class="btn small ghost" id="copier" title="Copier le lien">📋</button></div>
      <div class="sep"></div>
      <h3 style="display:flex;gap:6px;align-items:center">🐢 Élèves <span class="pill sombre" id="nb">0</span></h3>
      <ul class="joueurs-liste" id="liste"></ul>
      ${MODE === "demo" ? `<div class="row" style="margin-top:8px"><button class="btn small ghost" id="faux">🤖 + 3 élèves fictifs</button><a class="btn small ghost" target="_blank" href="index.html?salle=${CODE}">➕ Ouvrir un élève</a></div>` : ""}
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
  const url = new URL("index.html?salle=" + CODE, location.href).href;
  $("#url").textContent = url.replace(/^https?:\/\//, "");
  $("#copier").addEventListener("click", () => navigator.clipboard.writeText(url).then(() => toast("Lien copié !"), () => toast(url)));
  $("#quitter").addEventListener("click", accueil);
  $("#autre-pc").addEventListener("click", () => {
    const lien = new URL(`prof.html?salle=${CODE}#cle=${SECRET}`, location.href).href;
    const o = el("div", { class: "overlay" }, el("div", { class: "boite", html: `<h2>🏠 Piloter depuis un autre ordinateur</h2>
      <p>Ouvrez ce <b>lien enseignant</b> sur l'autre ordinateur (envoyez-le-vous par la messagerie de l'établissement, par exemple) : la salle <b>${CODE}</b> s'y ajoutera à « Mes salles ».</p>
      <p class="lien-prof">${esc(lien)}</p>
      <p class="petit">⚠️ <b>Ne le donnez pas aux élèves</b> : ce lien permet de piloter la salle.</p>
      <p><button class="btn" id="copier-prof">📋 Copier le lien</button> <button class="btn ghost" id="fermer-prof">Fermer</button></p>` }));
    document.body.append(o);
    $("#copier-prof", o).addEventListener("click", () => navigator.clipboard.writeText(lien).then(() => toast("Lien enseignant copié !"), () => toast(lien)));
    $("#fermer-prof", o).addEventListener("click", () => o.remove());
  });
  $("#codes").addEventListener("click", async () => {
    let l;
    try { l = await db.codesSession(CODE, SECRET); } catch (e) { return toast("Codes de session indisponibles : relancez supabase.sql dans Supabase.", "err"); }
    const lisible = (c) => (c ? c.slice(0, 4) + "-" + c.slice(4) : "");
    const o = el("div", { class: "overlay" }, el("div", { class: "boite boite-large", html: `<h2>🔑 Codes de session · salle ${CODE}</h2>
      <p class="petit">Pour se reconnecter depuis un autre ordinateur (chez soi…), l'élève tape la salle, son pseudo et son code de session (« 🏠 Tu reviens depuis un autre ordinateur ? »). Chaque élève voit aussi le sien avec le bouton « 🏠 Mon code de session ».</p>
      <table class="scores codes-table"><tr><th>Pseudo</th><th>Code de session</th></tr>
        ${l.map((x) => `<tr><td>${esc(x.pseudo)}</td><td class="code-cell">${x.code ? lisible(x.code) : '<span class="muted petit">créé quand l\'élève ouvrira sa page</span>'}</td></tr>`).join("") || '<tr><td colspan="2" class="muted">Aucun élève</td></tr>'}</table>
      <p class="petit">⚠️ À ne pas projeter : chaque code permet d'envoyer une tortue à la place de l'élève.</p>
      <p><button class="btn ghost" id="imprimer-codes">🖨️ Imprimer</button> <button class="btn" id="fermer-codes">Fermer</button></p>` }));
    document.body.append(o);
    $("#fermer-codes", o).addEventListener("click", () => o.remove());
    $("#imprimer-codes", o).addEventListener("click", () => { document.body.classList.add("impr-codes"); window.print(); document.body.classList.remove("impr-codes"); });
  });
  if ($("#faux")) $("#faux").addEventListener("click", ajouterFaux);
  for (const [id, k, f] of [["r-d1", "duree1", 60], ["r-d", "duree", 60], ["r-dd", "dureeDuel", 60], ["r-min", "min", 1]])
    $("#" + id).addEventListener("change", (e) => { const v = parseFloat(e.target.value); if (v >= 0) { reglages[k] = Math.round(v * f); sauverReglages(); } });
  majInfo();
  await sonder();
  sondage = setInterval(sonder, 3000);
  rendreStage();
}

function nettoyer() {
  clearInterval(sondage); clearInterval(chronoTimer); sondage = chronoTimer = null;
  if (viewer) { viewer.destroy(); viewer = null; }
}
function majInfo() {
  if (!salle) return;
  const T = TWISTS[salle.nouveaute] || TWISTS.calme;
  $("#info").innerHTML = `<span class="pill">🔑 ${CODE}</span>` +
    (salle.manche > 0 ? `<span class="pill">${esc(titreManche())} · ${T.icone}</span>` : "") +
    (MODE === "demo" ? `<span class="pill mode-demo">Mode démo</span>` : "");
}

// --- élèves connectés et tortues envoyées ---
async function sonder() {
  if (!CODE) return;
  try {
    [joueurs, depots] = await Promise.all([db.joueurs(CODE), salle.manche > 0 ? db.depots(CODE, salle.manche) : Promise.resolve([])]);
  } catch (e) { return; }
  // les élèves peuvent arriver en cours de partie : on les annonce
  const connus = sonder.connus;
  sonder.connus = new Set(joueurs.map((j) => j.pseudo));
  if (connus && salle.manche > 0) for (const j of joueurs) if (!connus.has(j.pseudo)) toast(`🆕 ${j.pseudo} rejoint la partie : sa tortue jouera au prochain brawl.`);
  repartirRetardataires();
  const envoyes = new Set(depots.map((d) => d.pseudo));
  $("#nb").textContent = joueurs.length;
  const liste = $("#liste");
  liste.innerHTML = joueurs.length ? "" : `<li class="muted">Personne pour l'instant…</li>`;
  for (const j of joueurs) {
    const spect = salle.duel && !salle.duel.includes(j.pseudo);
    const etat = salle.manche === 0 ? "" : spect ? "👀" : envoyes.has(j.pseudo) ? "✅" : salle.phase === "prog" ? "⏳" : "·";
    const x = el("button", { class: "x", title: "Retirer cet élève (et ses tortues)" }, "✕");
    x.addEventListener("click", async () => {
      if (!confirm(`Retirer ${j.pseudo} de la salle ? (ses tortues sont supprimées)`)) return;
      try { await db.retirerJoueur(CODE, SECRET, j.pseudo); sonder(); } catch (e) { toast(e.message, "err"); }
    });
    const cle = el("button", { class: "x", title: "Débloquer ce pseudo : l'élève pourra se reconnecter depuis un autre ordinateur (il garde ses tortues et ses points)" }, "🔓");
    cle.addEventListener("click", async () => {
      if (!confirm(`Débloquer le pseudo ${j.pseudo} ?\nL'élève pourra le reprendre en rejoignant la salle depuis un autre ordinateur ; il garde ses tortues et ses points.`)) return;
      try { await db.libererPseudo(CODE, SECRET, j.pseudo); toast(`🔓 ${j.pseudo} peut se reconnecter.`); } catch (e) { toast(e.message, "err"); }
    });
    liste.append(el("li", {}, el("span", { class: "swatch", style: `background:${j.couleur}` }), j.pseudo,
      el("span", { class: "etat", title: etat === "✅" ? "tortue envoyée" : etat === "⏳" ? "pas encore envoyée" : "" }, etat), cle, x));
  }
  if (salle.phase === "attente") { const n = $("#nb-grand"); if (n) n.textContent = joueurs.length; }
  if (salle.phase === "prog") majEnvois();
}

// --- élèves fictifs (mode démo uniquement) ---
async function ajouterFaux() {
  const noms = ["Kaweni", "Mtsamboro", "Bandrele", "Sada", "Chirongui", "Dembeni", "Acoua", "Pamandzi", "Ouangani", "Tsingoni"];
  const faux = store.get("lagon:faux:" + CODE, []);
  for (let i = 0; i < 3; i++) {
    const p = "Test_" + noms[(faux.length) % noms.length] + (faux.length >= noms.length ? faux.length : "");
    const j = jeton();
    try { await db.rejoindre(CODE, p, j, ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#42d4f4"][faux.length % 6]); faux.push({ pseudo: p, jeton: j }); } catch (e) { toast(e.message, "err"); }
  }
  store.set("lagon:faux:" + CODE, faux);
  await envoyerFaux();
  sonder();
}
async function envoyerFaux() {
  if (MODE !== "demo" || !salle || salle.phase !== "prog") return;
  const faux = store.get("lagon:faux:" + CODE, []);
  for (const [i, f] of faux.entries()) {
    if (salle.duel && !salle.duel.includes(f.pseudo)) continue;
    const b = BOTS[(i + salle.manche) % BOTS.length];
    try { await db.deposer(CODE, f.pseudo, f.jeton, salle.manche, b.code); } catch { /* rien */ }
  }
}

// --- pilotage de la salle ---
async function piloter(changes) {
  const p = { manche: salle.manche, phase: salle.phase, duel: salle.duel, ...changes };
  await db.piloter(CODE, SECRET, p);
  salle = await db.salle(CODE);
  majInfo();
  rendreStage();
  sonder();
}

// =====================================================================
//  La scène (ce qui est projeté)
// =====================================================================
function rendreStage() {
  if (viewer) { viewer.destroy(); viewer = null; }
  clearInterval(chronoTimer);
  const st = $("#stage");
  const l = $(".prof-layout"); if (l) l.classList.toggle("plein", salle.phase === "brawl");
  ({ attente: scAttente, prog: scProg, brawl: scBrawl, resultats: scResultats, fin: scFin })[salle.phase](st);
}

function selectTwist(defaut) {
  const s = el("select", { id: "sel-twist" });
  for (const [k, T] of Object.entries(TWISTS)) s.append(el("option", { value: k, selected: k === defaut }, `${T.icone} ${T.nom}`));
  return s;
}

// ---------- attente ----------
function scAttente(st) {
  const url = new URL("index.html", location.href).href.replace(/^https?:\/\//, "");
  st.innerHTML = `<div class="stage-centre">
    <h2 class="titre-scene">🌊 Rejoignez le lagon !</h2>
    <p class="consigne">1. Allez sur <b>${esc(url)}</b><br>2. Tapez le code :</p>
    <div class="code-salle geant">${CODE}</div>
    <div id="qr" class="qr cache"></div>
    <p class="consigne"><b id="nb-grand">${joueurs.length}</b> élève(s) connecté(s)</p>
    <p class="petit muted">Conseil : laissez d'abord 10 à 15 minutes aux élèves pour le tutoriel (bouton « Commencer le tutoriel » sur l'accueil).</p>
  </div>
  <div id="prep"></div>`;
  dessinerQR($("#qr"), new URL("index.html?salle=" + CODE, location.href).href);
  chargerPrep(1, []);
  panneauPrep($("#prep"), []);
}
function dessinerQR(box, texte) {
  if (typeof window.qrcode !== "function") return;
  try {
    const qr = window.qrcode(0, "M"); qr.addData(texte); qr.make();
    box.innerHTML = qr.createImgTag(6, 8); box.classList.remove("cache");
  } catch { /* pas de QR code */ }
}

// manche « longue » : temps illimité (en pratique 400 jours ; la manche reste ouverte jusqu'au brawl)
const DUREE_ILLIMITEE = 400 * 24 * 3600;
const estIllimite = () => salle && salle.phase === "prog" && salle.fin_chrono && secondesRestantes(salle.fin_chrono) > 30 * 24 * 3600;
async function lancerManche() {
  const p = prep;
  if (p.qui === "choix" && !p.participants.length) return toast("Choisissez au moins un élève qui joue.", "err");
  if (p.mode === "equipes") completerEquipes();
  try {
    await publierPrep(true);
    await piloter({ manche: p.manche, phase: "prog", duree: p.illimite ? DUREE_ILLIMITEE : p.duree, nouveaute: p.nouveaute, duel: p.qui === "choix" ? p.participants.slice() : null });
    await envoyerFaux();
  } catch (e) { toast(e.message, "err"); }
}

// =====================================================================
//  Préparer la manche suivante (réglée à la main par l'enseignant)
//  Les réglages sont publiés tout de suite : les élèves voient la nouveauté,
//  les points… et leur équipe, pour préparer une stratégie AVANT la manche.
// =====================================================================
let prep = null, publierTimer = null, scoresPrep = [], selection = null;
const clePrep = () => "lagon:prep:" + CODE;
const configActuelle = () => (salle && salle.config && salle.config.manche === salle.manche ? salle.config : null);
function titreManche() {
  const c = configActuelle();
  return (c && c.titre) || (salle.duel ? "Manche spéciale" : "Manche " + salle.manche);
}
function prepDefaut(manche, scores) {
  const nb = new Set(scores.filter((x) => !x.duel).map((x) => x.manche)).size;
  return { manche, nouveaute: TWIST_ORDER[Math.min(TWIST_ORDER.length - 1, nb)], duree: manche === 1 ? reglages.duree1 : reglages.duree,
    coef: 1, bots: reglages.min, qui: "tous", participants: [], mode: "solo", equipes: {}, nbEquipes: 2, titre: "", illimite: false };
}
function chargerPrep(manche, scores) {
  scoresPrep = scores;
  const p = store.get(clePrep());
  prep = p && p.manche === manche ? p : prepDefaut(manche, scores);
  prep.nbEquipes ||= 2;
}
const configDe = (p) => ({ manche: p.manche, mode: p.mode, equipes: p.mode === "equipes" ? p.equipes : null, nbEquipes: p.mode === "equipes" ? p.nbEquipes : null, coef: p.coef, bots: p.bots,
  titre: p.titre, nouveaute: p.nouveaute, participants: p.qui === "choix" ? p.participants : null, illimite: !!p.illimite });
function publierPrep(immediat = false) {
  store.set(clePrep(), prep);
  clearTimeout(publierTimer);
  const go = () => db.definirConfig(CODE, SECRET, configDe(prep)).then(() => { salle.config = configDe(prep); }).catch((e) => toast(e.message, "err"));
  if (immediat) return go();
  publierTimer = setTimeout(go, 400);
}
const joueursPrep = () => (prep.qui === "choix" ? prep.participants.filter((p) => joueurs.some((j) => j.pseudo === p)) : joueurs.map((j) => j.pseudo));
// l'équipe qui a le moins d'élèves (parmi les équipes 1 à nb)
function plusPetiteEquipe(eq, nb) {
  const taille = (e) => Object.values(eq).filter((x) => x === e).length;
  let best = 1;
  for (let e = 2; e <= nb; e++) if (taille(e) < taille(best)) best = e;
  return best;
}
function completerEquipes() {
  const l = joueursPrep(), eq = {}, nb = prep.nbEquipes;
  for (const p of l) if (prep.equipes[p] >= 1 && prep.equipes[p] <= nb) eq[p] = prep.equipes[p];
  for (const p of l) if (!eq[p]) eq[p] = plusPetiteEquipe(eq, nb);
  const change = JSON.stringify(eq) !== JSON.stringify(prep.equipes);
  prep.equipes = eq;
  return change;
}
function equipesHasard() {
  const l = joueursPrep().slice();
  for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
  prep.equipes = Object.fromEntries(l.map((p, i) => [p, (i % prep.nbEquipes) + 1]));
}
function equipesEquilibrees() {
  // les élèves rangés selon le classement, répartis en « serpent » : 1, 2, 3, 3, 2, 1, 1, 2, 3…
  const cls = classementCumule(scoresPrep), rang = (p) => { const t = cls.find((x) => x.pseudo === p); return t ? t.rang : 999; };
  const l = joueursPrep().slice().sort((a, b) => rang(a) - rang(b) || a.localeCompare(b));
  const nb = prep.nbEquipes;
  prep.equipes = Object.fromEntries(l.map((p, i) => { const tour = Math.floor(i / nb), k = i % nb; return [p, tour % 2 ? nb - k : k + 1]; }));
}
// un élève qui arrive pendant une manche en équipes rejoint l'équipe la plus petite (et le voit tout de suite)
function repartirRetardataires() {
  if (!salle) return;
  if (prep && prep.mode === "equipes" && (salle.phase === "attente" || salle.phase === "resultats") && prep.manche === salle.manche + 1) {
    if (completerEquipes()) { publierPrep(); const b = $("#prep"); if (b && b.dataset.ouvert) panneauPrep(b, scoresPrep); }
  }
  const c = configActuelle();
  if (c && c.mode === "equipes" && salle.phase === "prog") {
    const l = salle.duel || joueurs.map((j) => j.pseudo);
    const eq = { ...(c.equipes || {}) };
    let change = false;
    for (const p of l) if (!eq[p]) { eq[p] = plusPetiteEquipe(eq, c.nbEquipes || 2); change = true; }
    if (change) { c.equipes = eq; db.definirConfig(CODE, SECRET, c).catch(() => {}); const r = $("#rosters"); if (r) r.innerHTML = rostersHTML(eq, l, c.nbEquipes); }
  }
}
const numerosEquipes = (equipes, nb) => Array.from({ length: Math.max(2, nb || 0, ...Object.values(equipes || {})) }, (_, i) => i + 1);
function rostersHTML(equipes, liste, nb) {
  const col = (e) => `<div class="eq" style="${styleEquipe(e)}"><h4>${nomEquipe(e)} (${liste.filter((p) => equipes[p] === e).length})</h4>
    <div class="eq-noms">${liste.filter((p) => equipes[p] === e).map((p) => `<span class="eq-nom">${esc(p)}</span>`).join("") || '<span class="muted petit">personne</span>'}</div></div>`;
  return `<div class="eq-cols">${numerosEquipes(equipes, nb).map(col).join("")}</div>`;
}

const PRESETS = {
  rematch: { label: "🔁 Rematch", titre: "", f: () => ({ mode: "solo", coef: 1, qui: "tous", titre: "", illimite: false, nouveaute: prepDefaut(prep.manche, scoresPrep).nouveaute, duree: prep.manche === 1 ? reglages.duree1 : reglages.duree }) },
  equipes: { label: "👥 En équipes", f: () => ({ mode: "equipes", coef: 1, qui: "tous", titre: "Manche en équipes", nbEquipes: prep.nbEquipes || 2 }) },
  duel: { label: "⛈️ Duel des champions", f: () => ({ mode: "solo", coef: 0, illimite: false, qui: "choix", participants: classementCumule(scoresPrep).slice(0, 3).map((t) => t.pseudo), nouveaute: TWIST_DUEL, duree: reglages.dureeDuel, titre: "Duel des champions" }) },
  entrainement: { label: "🏋️ Entraînement", f: () => ({ coef: 0, titre: "Manche d'entraînement" }) },
  longue: { label: "♾️ Manche longue", f: () => ({ illimite: true, titre: prep.titre || "Manche longue" }) },
};

function panneauPrep(box, scores) {
  scoresPrep = scores;
  box.dataset.ouvert = "1";
  if (prep.mode === "equipes") completerEquipes();
  const tous = joueurs.map((j) => j.pseudo);
  const liste = joueursPrep();
  box.innerHTML = `<div class="prep card">
    <h3>⚙️ Préparer la manche ${prep.manche}</h3>
    <div class="row presets"><span class="petit muted">Raccourcis :</span>${Object.entries(PRESETS).map(([k, v]) => `<button class="btn small ghost" data-preset="${k}">${v.label}</button>`).join("")}</div>
    <div class="prep-grille">
      <label class="champ petit">🏷️ Titre (facultatif)<input type="text" data-k="titre" maxlength="40" value="${esc(prep.titre)}" placeholder="Manche ${prep.manche}"></label>
      <label class="champ petit">🌊 Nouveauté<select data-k="nouveaute">${Object.entries(TWISTS).map(([k, T]) => `<option value="${k}" ${k === prep.nouveaute ? "selected" : ""}>${T.icone} ${T.nom}</option>`).join("")}</select></label>
      <label class="champ petit">⏱️ Programmation (min)<input type="number" data-k="dureeMin" min="0.5" max="30" step="0.5" value="${prep.duree / 60}" ${prep.illimite ? "disabled" : ""}>
        <span class="illimite"><input type="checkbox" data-k="illimite" ${prep.illimite ? "checked" : ""}> ♾️ temps illimité</span></label>
      <label class="champ petit">🧮 Points<select data-k="coef"><option value="1" ${prep.coef === 1 ? "selected" : ""}>normaux</option><option value="2" ${prep.coef === 2 ? "selected" : ""}>doubles (×2)</option><option value="0" ${prep.coef === 0 ? "selected" : ""}>hors classement</option></select></label>
      <label class="champ petit">🤖 Compléter jusqu'à (tortues)<input type="number" data-k="bots" min="0" max="20" value="${prep.bots}"></label>
    </div>
    <div class="prep-ligne"><b>🐢 Qui joue ?</b>
      <label><input type="radio" name="qui" value="tous" ${prep.qui === "tous" ? "checked" : ""}> toute la classe</label>
      <label><input type="radio" name="qui" value="choix" ${prep.qui === "choix" ? "checked" : ""}> seulement :</label>
      ${prep.qui === "choix" ? `<span class="choix-joueurs">${tous.map((p) => `<button class="chip ${prep.participants.includes(p) ? "on" : ""}" data-joueur="${esc(p)}">${esc(p)}</button>`).join("") || '<span class="muted petit">aucun élève connecté</span>'}</span>` : ""}
    </div>
    <div class="prep-ligne"><b>👥 Mode</b>
      <label><input type="radio" name="mode" value="solo" ${prep.mode === "solo" ? "checked" : ""}> chacun pour soi</label>
      <label><input type="radio" name="mode" value="equipes" ${prep.mode === "equipes" ? "checked" : ""}> en équipes (seul le rang de l'équipe compte)</label>
    </div>
    ${prep.mode === "equipes" ? `<div class="prep-equipes">
      <div class="prep-nb"><b>Nombre d'équipes :</b>${Array.from({ length: MAX_EQUIPES - 1 }, (_, i) => i + 2).map((n) => `<button class="btn small ghost nb ${n === prep.nbEquipes ? "on" : ""}" data-nb="${n}">${n}</button>`).join("")}
        <span class="petit muted">(${Array.from({ length: prep.nbEquipes }, (_, i) => equipeInfo(i + 1).icone).join(" ")} : la couleur est attribuée automatiquement)</span></div>
      <div class="row" style="margin-top:8px"><button class="btn small" data-eq="hasard">🎲 Au hasard</button><button class="btn small" data-eq="equilibre">⚖️ Équilibrées (classement)</button>
      <span class="petit muted">${selection ? `<b>${esc(selection)}</b> : clique sur l'équipe où le mettre.` : "À la main : clique sur un nom, puis sur son équipe (ou fais-le glisser)."}</span></div>
      <div class="eq-cols">${Array.from({ length: prep.nbEquipes }, (_, i) => i + 1).map((e) => `<div class="eq ${selection ? "cible" : ""}" data-equipe="${e}" style="${styleEquipe(e)}"><h4>${nomEquipe(e)} (${liste.filter((p) => prep.equipes[p] === e).length})</h4>
        <div class="eq-noms">${liste.filter((p) => prep.equipes[p] === e).map((p) => `<button class="eq-nom ${p === selection ? "sel" : ""}" draggable="true" data-bascule="${esc(p)}">${esc(p)}</button>`).join("") || '<span class="muted petit">personne</span>'}</div></div>`).join("")}</div>
      ${(() => { const vides = Array.from({ length: prep.nbEquipes }, (_, i) => i + 1).filter((e) => !liste.some((p) => prep.equipes[p] === e)); return vides.length && liste.length ? `<div class="msg warn petit">⚠️ ${vides.map(nomEquipe).join(", ")} : personne dans cette équipe, elle ne jouera pas (sauf si un élève arrive en retard : il ira dans l'équipe la plus petite).</div>` : ""; })()}
      <p class="petit">Points par élève selon le rang de son équipe : <b>${baremeEquipes(prep.nbEquipes).join(" / ")}</b> (× le coefficient ; des équipes à égalité se partagent les points). On classe les équipes selon la moyenne de nids par élève : les équipes peuvent avoir des tailles différentes. Les 🤖 ne sont dans aucune équipe : ce sont des concurrentes neutres.</p>
    </div>` : ""}
    <p class="petit ok-publie">📣 Publié : les élèves voient déjà ces réglages${prep.mode === "equipes" ? " et <b>leur équipe</b> (ils peuvent préparer une stratégie)" : ""}.</p>
    ${prep.illimite ? `<p class="petit">♾️ <b>Temps illimité</b> : les élèves peuvent programmer et envoyer leur tortue (même depuis chez eux, avec leur code de session) jusqu'à ce que vous lanciez le brawl.</p>` : ""}
    <div class="row"><button class="btn big corail" id="go">▶ Lancer la manche ${prep.manche}${prep.illimite ? " ♾️" : ""}${prep.mode === "equipes" ? " 👥" : ""}${prep.coef === 2 ? " (×2)" : prep.coef === 0 ? " (hors classement)" : ""}</button></div>
  </div>`;
  const maj = (redessiner = true) => { publierPrep(); if (redessiner) panneauPrep(box, scores); };
  box.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => { Object.assign(prep, PRESETS[b.dataset.preset].f()); if (prep.mode === "equipes" && !Object.keys(prep.equipes).length) equipesHasard(); maj(); }));
  box.querySelectorAll("[data-k]").forEach((i) => i.addEventListener("change", () => {
    const k = i.dataset.k;
    if (k === "dureeMin") prep.duree = Math.round(Math.max(0.5, parseFloat(i.value) || 1) * 60);
    else if (k === "illimite") prep.illimite = i.checked;
    else if (k === "coef" || k === "bots") prep[k] = parseInt(i.value, 10) || 0;
    else prep[k] = i.value;
    maj(k === "coef" || k === "illimite");
  }));
  box.querySelectorAll("input[name=qui]").forEach((r) => r.addEventListener("change", () => { prep.qui = r.value; if (prep.qui === "choix" && !prep.participants.length) prep.participants = tous.slice(); maj(); }));
  box.querySelectorAll("input[name=mode]").forEach((r) => r.addEventListener("change", () => { prep.mode = r.value; if (prep.mode === "equipes" && !Object.keys(prep.equipes).length) equipesHasard(); maj(); }));
  box.querySelectorAll("[data-joueur]").forEach((b) => b.addEventListener("click", () => {
    const p = b.dataset.joueur; prep.participants = prep.participants.includes(p) ? prep.participants.filter((x) => x !== p) : [...prep.participants, p]; maj();
  }));
  box.querySelectorAll("[data-eq]").forEach((b) => b.addEventListener("click", () => { if (b.dataset.eq === "hasard") equipesHasard(); else equipesEquilibrees(); maj(); }));
  // équipes à la main : clic sur un nom puis sur une équipe, ou glisser-déposer
  const deplacer = (p, e) => { selection = null; if (prep.equipes[p] !== e) { prep.equipes[p] = e; maj(); } else panneauPrep(box, scores); };
  box.querySelectorAll("[data-nb]").forEach((b) => b.addEventListener("click", () => { prep.nbEquipes = parseInt(b.dataset.nb, 10); selection = null; equipesHasard(); maj(); }));
  box.querySelectorAll("[data-bascule]").forEach((b) => {
    b.addEventListener("click", (ev) => { ev.stopPropagation(); const p = b.dataset.bascule; selection = selection === p ? null : p; panneauPrep(box, scores); });
    b.addEventListener("dragstart", (ev) => { ev.dataTransfer.setData("text/plain", b.dataset.bascule); ev.dataTransfer.effectAllowed = "move"; });
  });
  box.querySelectorAll("[data-equipe]").forEach((z) => {
    const e = parseInt(z.dataset.equipe, 10);
    z.addEventListener("click", () => { if (selection) deplacer(selection, e); });
    z.addEventListener("dragover", (ev) => { ev.preventDefault(); z.classList.add("survol"); });
    z.addEventListener("dragleave", () => z.classList.remove("survol"));
    z.addEventListener("drop", (ev) => { ev.preventDefault(); const p = ev.dataTransfer.getData("text/plain"); if (p && p in prep.equipes) deplacer(p, e); });
  });
  $("#go", box).addEventListener("click", lancerManche);
  publierPrep();
}

// ---------- programmation ----------
function scProg(st) {
  const T = TWISTS[salle.nouveaute] || TWISTS.calme;
  const c = configActuelle() || {};
  const liste = participantsHumains();
  st.innerHTML = `<div class="stage-centre">
    <h2 class="titre-scene">⌨️ ${esc(titreManche())} : programmez vos tortues !</h2>
    ${c.coef === 2 ? `<p class="consigne"><span class="pill or-pill">⭐ Points doubles</span></p>` : c.coef === 0 ? `<p class="consigne"><span class="pill sombre">Hors classement</span></p>` : ""}
    ${salle.duel ? `<p class="consigne">Jouent : <b>${salle.duel.map(esc).join(" · ")}</b></p>` : ""}
    ${c.mode === "equipes" ? `<div id="rosters">${rostersHTML(c.equipes || {}, liste, c.nbEquipes)}</div><p class="consigne">👥 Seul le <b>score de l'équipe</b> compte : mettez-vous d'accord !</p>` : ""}
    <div id="tw"></div>
    <div class="grand-chrono chrono" id="gc">--:--</div>
    <p class="consigne"><b id="nb-env">0</b> / <span id="nb-tot">0</span> tortues envoyées</p>
    <div class="jauge large"><div id="jg" style="width:0"></div></div>
    <div class="row centre" style="margin-top:16px">
      <button class="btn ghost" id="plus">+1 min</button>
      <button class="btn ghost cache" id="chrono5" title="Remplacer le temps illimité par un chrono de 5 minutes">⏱️ Chrono de 5 min</button>
      <button class="btn ghost" id="stop">⏹ Terminer le chrono</button>
      <button class="btn big corail" id="brawl">🎬 Lancer le brawl</button>
    </div>
    <p class="petit muted" id="aide-prog">Les élèves peuvent renvoyer leur tortue jusqu'à la fin du chrono. À 0, les tortues modifiées sont envoyées automatiquement.</p>
  </div>`;
  $("#tw").append(twistCarte(salle.nouveaute));
  $("#plus").addEventListener("click", () => {
    const r = Math.max(0, secondesRestantes(salle.fin_chrono) || 0);
    piloter({ duree: Math.round(r + 60) }).catch((e) => toast(e.message, "err"));
  });
  $("#stop").addEventListener("click", () => {
    if (!confirm((estIllimite() ? "Fermer les envois maintenant ?" : "Terminer le chrono maintenant ?") + " Les élèves connectés ont encore 5 secondes (envoi automatique).")) return;
    piloter({ duree: 5 }).catch((e) => toast(e.message, "err"));
  });
  $("#chrono5").addEventListener("click", () => piloter({ duree: 300 }).catch((e) => toast(e.message, "err")));
  $("#brawl").addEventListener("click", demarrerBrawl);
  let longPrec = null;
  const tick = () => {
    const r = secondesRestantes(salle.fin_chrono);
    const gc = $("#gc"); if (!gc) return;
    const long = estIllimite();
    if (long !== longPrec) {   // manche à temps illimité : pas de compte à rebours
      longPrec = long;
      $("#plus").classList.toggle("cache", long); $("#chrono5").classList.toggle("cache", !long);
      $("#stop").textContent = long ? "⏹ Fermer les envois" : "⏹ Terminer le chrono";
      $("#aide-prog").innerHTML = long
        ? "♾️ <b>Temps illimité</b> : les élèves programment et renvoient leur tortue quand ils veulent, même depuis chez eux (avec leur <b>code de session</b>), jusqu'à ce que vous lanciez le brawl."
        : "Les élèves peuvent renvoyer leur tortue jusqu'à la fin du chrono. À 0, les tortues modifiées sont envoyées automatiquement.";
    }
    gc.textContent = long ? "♾️" : r > 0 ? mmss(r) : "0:00";
    gc.classList.toggle("alerte", !long && r <= 30);
    $("#brawl").classList.toggle("pulse", !long && r <= 0);
  };
  tick(); chronoTimer = setInterval(tick, 250);
  majEnvois();
}
function participantsHumains() {
  return salle.duel ? salle.duel.filter((p) => joueurs.some((j) => j.pseudo === p)) : joueurs.map((j) => j.pseudo);
}
function majEnvois() {
  const e = $("#nb-env"); if (!e) return;
  const humains = participantsHumains(), env = new Set(depots.map((d) => d.pseudo));
  const n = humains.filter((p) => env.has(p)).length;
  e.textContent = n; $("#nb-tot").textContent = humains.length;
  $("#jg").style.width = (humains.length ? 100 * n / humains.length : 0) + "%";
}

let brawlEnCours = false;
async function demarrerBrawl() {
  if (brawlEnCours) return;
  const r = secondesRestantes(salle.fin_chrono);
  if (r > 3) {
    if (!confirm((estIllimite() ? "Fermer les envois et lancer le brawl maintenant ?" : "Le chrono n'est pas terminé. Lancer le brawl maintenant ?") + "\n(Les élèves connectés ont 5 secondes : les tortues modifiées sont envoyées automatiquement.)")) return;
    brawlEnCours = true;
    try { await piloter({ duree: 5 }); } catch (e) { toast(e.message, "err"); brawlEnCours = false; return; }
    $("#aide-prog").innerHTML = "<b>📤 Envoi automatique des dernières tortues…</b>";
    $("#brawl").disabled = true;
    await new Promise((res) => setTimeout(res, 7000));
  } else if (r > -3) {
    brawlEnCours = true; $("#brawl").disabled = true;
    await new Promise((res) => setTimeout(res, (r + 3) * 1000));
  }
  brawlEnCours = true;
  try { await piloter({ phase: "brawl" }); } catch (e) { toast(e.message, "err"); }
  brawlEnCours = false;
}

// ---------- brawl ----------
const FEED = {
  nid: (n, e) => [`🥚 <b>${n}</b> pond son ${e.n}${e.n > 1 ? "e" : "er"} nid !`, "nid"],
  capture: (n, e, noms) => [`🦈 <b>${n}</b> s'est fait attraper !${e.perdu ? " (−1 nid)" : ""}${e.par ? ` (poussée par ${esc(noms[e.par] ? noms[e.par].nom : e.par)})` : ""}`, "capture"],
  plastique: (n) => [`🛍️ <b>${n}</b> a avalé un sac plastique…`, "capture"],
  epuisee: (n) => [`😵 <b>${n}</b> est épuisée !`, "capture"],
  pousse: (n, e, noms) => [`💥 <b>${n}</b> pousse ${esc(noms[e.cible] ? noms[e.cible].nom : e.cible)}${e.requin ? " sur un requin !" : ""}`, "capture"],
  don: (n, e, noms) => [`🎁 <b>${n}</b> donne ${e.n} ⚡ à ${esc(noms[e.cible] ? noms[e.cible].nom : e.cible)}`, "nid"],
};
async function scBrawl(st) {
  st.innerHTML = `<div class="stage-centre"><div class="emoji">🌊</div><h2>Les tortues plongent…</h2></div>`;
  let tortues, scores;
  try { [tortues, scores, joueurs] = await Promise.all([db.tortues(CODE), db.scores(CODE), db.joueurs(CODE)]); }
  catch (e) { toast(e.message, "err"); return; }
  const m = salle.manche, c = configActuelle() || {};
  // participants : élèves (ou ceux choisis par l'enseignant) + tortues d'entraînement 🤖
  // seulement pour compléter le lagon jusqu'au minimum (8 par défaut)
  let pseudos = participantsHumains();
  pseudos = [...pseudos, ...botsPourCompleter(pseudos.length, c.bots ?? reglages.min)];
  if (!pseudos.length) { toast("Aucune tortue dans le lagon !", "err"); return; }
  const equipes = c.mode === "equipes" ? equipesCompletes(pseudos, c.equipes || {}, c.nbEquipes) : null;
  const sim = lancerSimulation(salle, m, pseudos, joueurs, tortues, salle.nouveaute, null, equipes);
  const T = TWISTS[salle.nouveaute] || TWISTS.calme;
  st.innerHTML = `<div class="brawl-grid">
    <div><h2 class="titre-scene gauche">🎬 ${esc(titreManche())} · ${T.icone} ${esc(T.nom)}</h2><div id="vue"></div></div>
    <div class="cote-brawl">
      ${equipes ? `<div class="card score-equipes" id="score-eq"></div>` : ""}
      <div class="card"><h3>🏆 En direct</h3><ol class="live-rank" id="live"></ol></div>
      <div class="card"><h3>📣 Le fil du match</h3><ul class="feed" id="feed"></ul></div>
      <button class="btn big or" id="fini" style="width:100%;justify-content:center;margin-top:12px">⏭ Voir les résultats</button>
    </div></div>`;
  viewer = new MatchViewer($("#vue"), { sim, pensee: false, vitesse: 2.4, autoplay: false, marqueurs: [] });
  const noms = Object.fromEntries(sim.tortues.map((t) => [t.id, t]));
  let dernier = -1;
  const majDirect = (t) => {
    const cpt = {}; for (const n of sim.nids) if (n.tick <= t && !(n.perdu != null && n.perdu <= t)) cpt[n.id] = (cpt[n.id] || 0) + 1;
    const cl = sim.tortues.map((x) => ({ ...x, n: cpt[x.id] || 0 })).sort((a, b) => b.n - a.n || estBot(a.id) - estBot(b.id) || String(a.nom).localeCompare(String(b.nom))).slice(0, 10);
    $("#live").innerHTML = cl.map((x) => `<li class="${estBot(x.id) ? "bot" : ""}">${x.equipe ? equipeInfo(x.equipe).icone : ""}<span class="swatch" style="background:${x.couleur}"></span>${esc(x.nom)}<span class="n">${x.n} 🥚</span></li>`).join("");
    if (equipes) {
      const E = resultatEquipes(sim.tortues.map((x) => ({ id: x.id, equipe: x.equipe, nids: cpt[x.id] || 0 })));
      $("#score-eq").innerHTML = cartesEquipesHTML(E, { ordre: "numero", decimales: 1 });
    }
    if (t < dernier) $("#feed").innerHTML = "";
    const ev = sim.events.filter((e) => e.tick > dernier && e.tick <= t && (e.type === "nid" || !estBot(e.id)));
    for (const e of ev) {
      const [txt, cls] = FEED[e.type](esc(noms[e.id] ? noms[e.id].nom : e.id), e, noms);
      $("#feed").prepend(el("li", { class: cls, html: txt }));
    }
    while ($("#feed").children.length > 9) $("#feed").lastChild.remove();
    dernier = t;
  };
  viewer.player.onTick = (t) => { viewer.onTick(t); majDirect(t); };
  majDirect(0);
  let fini = false;
  const terminer = async () => {
    if (fini) return; fini = true;
    $("#fini").disabled = true;
    const res = calculerScores(sim, m, scores, { coef: c.coef ?? (salle.duel ? 0 : 1) });
    try {
      await db.enregistrerScores(CODE, SECRET, m, res);
      await piloter({ phase: "resultats" });
    } catch (e) { toast(e.message, "err"); fini = false; $("#fini").disabled = false; }
  };
  viewer.player.onEnd = () => setTimeout(terminer, 2500);
  $("#fini").addEventListener("click", terminer);
  // petit compte à rebours avant le départ
  const box = $("#vue .lagon-box");
  const cd = el("div", { class: "decompte" }, "3"); box.append(cd);
  const v = viewer;
  for (const n of ["3", "2", "1", "🐢 GO !"]) { cd.textContent = n; await new Promise((r) => setTimeout(r, 700)); }
  cd.remove();
  if (viewer === v && v) v.player.play();   // (sauf si l'enseignant a déjà passé aux résultats)
}

// ---------- résultats d'une manche ----------
async function scResultats(st) {
  let scores, tortues;
  try { [scores, tortues, joueurs] = await Promise.all([db.scores(CODE), db.tortues(CODE), db.joueurs(CODE)]); }
  catch (e) { toast(e.message, "err"); return; }
  const info = infosManche(scores, salle.manche);
  if (!info) { st.innerHTML = `<p>Pas de scores pour cette manche.</p>`; return; }
  const T = TWISTS[info.twist] || TWISTS.calme;
  const sm = scores.filter((s) => s.manche === info.manche && !estBot(s.pseudo)).sort((a, b) => a.rang - b.rang || b.nids - a.nids);
  const sim = lancerSimulation(salle, info.manche, info.pseudos, joueurs, tortues, info.twist, null, info.equipes, info.version);
  const cap = Object.fromEntries(sim.resultats.map((r) => [r.id, r.captures]));
  const progres = sm.filter((s) => s.bonus > 0);
  const cls = classementCumule(scores);
  const E = sim.equipes;
  const bandeauEquipes = E ? `<div class="resultat-equipes">
      <div class="gagnant">${annonceEquipes(E)}</div>
      ${cartesEquipesHTML(E, { noms: (p) => esc(sim.tortues.find((t) => t.id === p).nom), points: info.duel ? null : (e) => (sm.find((x) => x.equipe === e) || { points: 0 }).points })}</div>` : "";
  st.innerHTML = `<h2 class="titre-scene">🏆 Résultats : ${esc(titreManche())} · ${T.icone}</h2>
    ${E ? bandeauEquipes : podium(sm.slice(0, 3).map((s) => ({ nom: s.pseudo, det: `${s.nids} 🥚${info.duel ? "" : ` · ${s.points + s.bonus} pts`}` })))}
    ${progres.length ? `<div class="msg ok centre-txt">📈 <b>Bonus progrès (+${BONUS_PROGRESSION})</b> : ${progres.map((s) => esc(s.pseudo)).join(", ")}</div>` : ""}
    <div class="grid2" style="margin-top:14px">
      <div><h3>Ce match</h3><table class="scores"><tr><th class="num">#</th><th>Élève</th><th class="num">🥚</th><th class="num">🦈</th><th class="num">Points</th></tr>
        ${sm.map((s) => `<tr><td class="num">${E ? s.equipe ? equipeInfo(s.equipe).icone : "" : s.rang}</td><td><span class="swatch" style="background:${(joueurs.find((j) => j.pseudo === s.pseudo) || {}).couleur || "#ccc"}"></span>${esc(s.pseudo)}</td><td class="num">${s.nids}</td><td class="num">${cap[s.pseudo] ?? "–"}</td><td class="num">${info.duel ? "–" : s.points + (s.bonus ? ` <small class="bonus">+${s.bonus}</small>` : "")}</td></tr>`).join("")}
        ${sim.resultats.filter((r) => estBot(r.id)).map((r) => `<tr class="bot"><td class="num">${r.equipe ? equipeInfo(r.equipe).icone : "🤖"}</td><td>${esc(r.nom)}</td><td class="num">${r.nids}</td><td class="num">${r.captures}</td><td class="num">–</td></tr>`).join("")}
      </table></div>
      <div><h3>Classement de la séance</h3>${tableauCumule(cls, 12)}</div>
    </div>
    <div class="msg info" style="margin-top:14px">🔍 <b>Laissez 2-3 minutes aux élèves</b> : sur leur écran, ils revoient le match en suivant leur tortue, ligne par ligne, avec des conseils. Pendant ce temps, préparez la manche suivante ci-dessous.</div>
    <div class="row centre actions-fin" id="actions"></div>
    <div id="replay" style="margin-top:14px"></div>
    <div id="prep"></div>`;
  const act = $("#actions");
  const bRevoir = el("button", { class: "btn ghost" }, "🎬 Revoir le match");
  bRevoir.addEventListener("click", () => {
    if (viewer) viewer.destroy();
    viewer = new MatchViewer($("#replay"), { sim, pensee: false, vitesse: 5, marqueurs: [] });
    $("#replay").scrollIntoView({ behavior: "smooth" });
  });
  const bFin = el("button", { class: "btn sombre" }, "🏁 Terminer la séance");
  bFin.addEventListener("click", () => { if (confirm("Terminer la séance et afficher le podium final ?")) piloter({ phase: "fin" }).catch((e) => toast(e.message, "err")); });
  act.append(bRevoir, bFin);
  chargerPrep(salle.manche + 1, scores);
  panneauPrep($("#prep"), scores);
}

function podium(top) {
  const ordre = [1, 0, 2].filter((i) => top[i]);
  return `<div class="podium">${ordre.map((i) => `<div class="marche p${i + 1}"><div class="nom">${esc(top[i].nom)}</div><div class="det">${top[i].det}</div><div class="socle">${["🥇", "🥈", "🥉"][i]}</div></div>`).join("")}</div>`;
}
function tableauCumule(cls, max = 100) {
  const manches = [...new Set(cls.flatMap((t) => Object.keys(t.parManche).map(Number)))].sort((a, b) => a - b);
  return `<table class="scores"><tr><th class="num">#</th><th>Élève</th>${manches.map((m) => `<th class="num">M${m}</th>`).join("")}<th class="num">Total</th></tr>` +
    cls.slice(0, max).map((t) => `<tr><td class="num">${t.rang}</td><td>${esc(t.pseudo)}</td>${manches.map((m) => { const s = t.parManche[m]; return `<td class="num">${s ? s.points + (s.bonus ? `<small class="bonus">+${s.bonus}</small>` : "") : "–"}</td>`; }).join("")}<td class="num"><b>${t.total}</b></td></tr>`).join("") +
    (cls.length > max ? `<tr><td colspan="${manches.length + 3}" class="muted">… et ${cls.length - max} autres</td></tr>` : "") + `</table>`;
}

// ---------- fin de séance ----------
async function scFin(st) {
  let scores;
  try { scores = await db.scores(CODE); } catch (e) { toast(e.message, "err"); return; }
  const cls = classementCumule(scores);
  const mp = meilleureProgression(scores);
  const duels = scores.filter((s) => s.duel && !estBot(s.pseudo));
  const mDuel = duels.length ? Math.max(...duels.map((s) => s.manche)) : null;
  const champion = mDuel != null ? duels.filter((s) => s.manche === mDuel).sort((a, b) => a.rang - b.rang)[0] : null;
  st.innerHTML = `<h2 class="titre-scene">🏁 Fin de la séance : bravo à toutes les tortues !</h2>
    ${podium(cls.slice(0, 3).map((t) => ({ nom: t.pseudo, det: `${t.total} pts · ${t.nids} 🥚` })))}
    <div class="row centre trophees">
      ${champion ? `<div class="trophee"><span class="ic">⭐</span><b>Meilleur·e de la manche spéciale</b>${esc(champion.pseudo)} (${champion.nids} 🥚)</div>` : ""}
      ${mp ? `<div class="trophee"><span class="ic">📈</span><b>Meilleure progression</b>${esc(mp.pseudo)} (de ${mp.de} à ${mp.a} nids)</div>` : ""}
    </div>
    <h3>Classement final</h3>${tableauCumule(cls)}
    <div class="row centre" style="margin-top:16px">
      <button class="btn" id="csv">⬇️ Exporter le classement (CSV)</button>
      <button class="btn ghost" id="nouvelle">🔄 Nouvelle séance</button>
    </div>`;
  $("#csv").addEventListener("click", () => exporterCSV(cls));
  $("#nouvelle").addEventListener("click", accueil);
}
function exporterCSV(cls) {
  const manches = [...new Set(cls.flatMap((t) => Object.keys(t.parManche).map(Number)))].sort((a, b) => a - b);
  const lignes = [["Rang", "Pseudo", ...manches.flatMap((m) => [`M${m} nids`, `M${m} points`]), "Bonus", "Nids total", "Total points"]];
  for (const t of cls) lignes.push([t.rang, t.pseudo, ...manches.flatMap((m) => { const s = t.parManche[m]; return s ? [s.nids, s.points] : ["", ""]; }), t.bonus, t.nids, t.total]);
  const csv = "﻿" + lignes.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const a = el("a", { href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })), download: `lagon-arena-${CODE}-${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.append(a); a.click(); a.remove();
}

// =====================================================================
await synchroniserHorloge();
const demande = (new URLSearchParams(location.search).get("salle") || "").toUpperCase();
// lien enseignant (…prof.html?salle=ABCD#cle=…) : la salle s'ajoute à « Mes salles » de cet ordinateur
const cleLien = new URLSearchParams(location.hash.slice(1)).get("cle");
if (demande && cleLien) {
  const s = mesSalles(); s[demande] = { secret: cleLien, cree: (s[demande] && s[demande].cree) || new Date().toISOString() }; store.set("lagon:prof", s);
  history.replaceState(null, "", "prof.html?salle=" + demande);
  toast(`🏠 Salle ${demande} ajoutée à vos salles sur cet ordinateur.`);
}
if (demande && mesSalles()[demande]) ouvrir(demande); else accueil();
