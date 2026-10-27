// =====================================================================
//  Lagon Arena — écran enseignant (à projeter au tableau)
// =====================================================================
import { db, MODE, synchroniserHorloge, secondesRestantes } from "./db.js";
import { CONFIG } from "./config.js";
import { TWISTS, TWIST_ORDER, TWIST_DUEL, BOTS, POINTS_RANG, BONUS_PROGRESSION } from "./engine.js";
import { MatchViewer, tableauMatch } from "./viewer.js";
import { botsPourCompleter, lancerSimulation, calculerScores, classementCumule, meilleureProgression, estBot, infosManche, BOT_PREFIXE } from "./brawl.js";
import { $, $$, el, esc, toast, store, mmss, jeton, twistCarte } from "./common.js";

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
  if (!salle) { toast("Salle introuvable (supprimée après 7 jours ?).", "err"); const s = mesSalles(); delete s[code]; store.set("lagon:prof", s); return accueil(); }
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
      <button class="btn small ghost" id="quitter">← Mes salles</button>
    </aside>
    <section class="card stage" id="stage"></section>
  </div>`;
  const url = new URL("index.html?salle=" + CODE, location.href).href;
  $("#url").textContent = url.replace(/^https?:\/\//, "");
  $("#copier").addEventListener("click", () => navigator.clipboard.writeText(url).then(() => toast("Lien copié !"), () => toast(url)));
  $("#quitter").addEventListener("click", accueil);
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
    (salle.manche > 0 ? `<span class="pill">${salle.duel ? "⛈️ Duel" : "Manche " + salle.manche} · ${T.icone}</span>` : "") +
    (MODE === "demo" ? `<span class="pill mode-demo">Mode démo</span>` : "");
}

// --- élèves connectés et tortues envoyées ---
async function sonder() {
  if (!CODE) return;
  try {
    [joueurs, depots] = await Promise.all([db.joueurs(CODE), salle.manche > 0 ? db.depots(CODE, salle.manche) : Promise.resolve([])]);
  } catch (e) { return; }
  const envoyes = new Set(depots.map((d) => d.pseudo));
  $("#nb").textContent = joueurs.length;
  const liste = $("#liste");
  liste.innerHTML = joueurs.length ? "" : `<li class="muted">Personne pour l'instant…</li>`;
  for (const j of joueurs) {
    const spect = salle.duel && !salle.duel.includes(j.pseudo);
    const etat = salle.manche === 0 ? "" : spect ? "👀" : envoyes.has(j.pseudo) ? "✅" : salle.phase === "prog" ? "⏳" : "·";
    const x = el("button", { class: "x", title: "Retirer cet élève" }, "✕");
    x.addEventListener("click", async () => {
      if (!confirm(`Retirer ${j.pseudo} de la salle ?`)) return;
      try { await db.retirerJoueur(CODE, SECRET, j.pseudo); sonder(); } catch (e) { toast(e.message, "err"); }
    });
    liste.append(el("li", {}, el("span", { class: "swatch", style: `background:${j.couleur}` }), j.pseudo,
      el("span", { class: "etat", title: etat === "✅" ? "tortue envoyée" : etat === "⏳" ? "pas encore envoyée" : "" }, etat), x));
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
    <div class="row centre" id="lancer"></div>
    <p class="petit muted">Conseil : laissez d'abord 10 à 15 minutes aux élèves pour le tutoriel (bouton « Commencer le tutoriel » sur l'accueil).</p>
  </div>`;
  dessinerQR($("#qr"), new URL("index.html?salle=" + CODE, location.href).href);
  const sel = selectTwist(TWIST_ORDER[0]);
  const b = el("button", { class: "btn big corail" }, "▶ Lancer la manche 1");
  b.addEventListener("click", () => lancerManche(1, sel.value, reglages.duree1, null));
  $("#lancer").append(el("label", { class: "champ petit" }, "Nouveauté", sel), b);
}
function dessinerQR(box, texte) {
  if (typeof window.qrcode !== "function") return;
  try {
    const qr = window.qrcode(0, "M"); qr.addData(texte); qr.make();
    box.innerHTML = qr.createImgTag(6, 8); box.classList.remove("cache");
  } catch { /* pas de QR code */ }
}

async function lancerManche(manche, twist, duree, duel) {
  try {
    await piloter({ manche, phase: "prog", duree, nouveaute: twist, duel });
    await envoyerFaux();
  } catch (e) { toast(e.message, "err"); }
}

// ---------- programmation ----------
function scProg(st) {
  const T = TWISTS[salle.nouveaute] || TWISTS.calme;
  st.innerHTML = `<div class="stage-centre">
    <h2 class="titre-scene">${salle.duel ? "⛈️ Duel des champions" : `⌨️ Manche ${salle.manche} : programmez vos tortues !`}</h2>
    ${salle.duel ? `<p class="consigne">Finalistes : <b>${salle.duel.map(esc).join(" · ")}</b> (+ la Championne 🤖)</p>` : ""}
    <div id="tw"></div>
    <div class="grand-chrono chrono" id="gc">--:--</div>
    <p class="consigne"><b id="nb-env">0</b> / <span id="nb-tot">0</span> tortues envoyées</p>
    <div class="jauge large"><div id="jg" style="width:0"></div></div>
    <div class="row centre" style="margin-top:16px">
      <button class="btn ghost" id="plus">+1 min</button>
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
    if (!confirm("Terminer le chrono maintenant ? Les élèves ont encore 5 secondes (envoi automatique).")) return;
    piloter({ duree: 5 }).catch((e) => toast(e.message, "err"));
  });
  $("#brawl").addEventListener("click", demarrerBrawl);
  const tick = () => {
    const r = secondesRestantes(salle.fin_chrono);
    const gc = $("#gc"); if (!gc) return;
    gc.textContent = r > 0 ? mmss(r) : "0:00";
    gc.classList.toggle("alerte", r <= 30);
    $("#brawl").classList.toggle("pulse", r <= 0);
  };
  tick(); chronoTimer = setInterval(tick, 250);
  majEnvois();
}
function participantsHumains() {
  return salle.duel ? salle.duel.slice() : joueurs.map((j) => j.pseudo);
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
    if (!confirm("Le chrono n'est pas terminé. Lancer le brawl maintenant ?\n(Les élèves ont 5 secondes : les tortues modifiées sont envoyées automatiquement.)")) return;
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
  capture: (n, e) => [`🦈 <b>${n}</b> s'est fait attraper !${e.perdu ? " (−1 nid)" : ""}`, "capture"],
  plastique: (n) => [`🛍️ <b>${n}</b> a avalé un sac plastique…`, "capture"],
  epuisee: (n) => [`😵 <b>${n}</b> est épuisée !`, "capture"],
};
async function scBrawl(st) {
  st.innerHTML = `<div class="stage-centre"><div class="emoji">🌊</div><h2>Les tortues plongent…</h2></div>`;
  let tortues, scores;
  try { [tortues, scores, joueurs] = await Promise.all([db.tortues(CODE), db.scores(CODE), db.joueurs(CODE)]); }
  catch (e) { toast(e.message, "err"); return; }
  const m = salle.manche, duel = !!salle.duel;
  // participants : élèves (ou finalistes) + tortues d'entraînement si besoin
  let pseudos = participantsHumains();
  pseudos = duel ? [...pseudos, BOT_PREFIXE + "Championne"] : [...pseudos, ...botsPourCompleter(pseudos.length, reglages.min)];
  if (!pseudos.length) { toast("Aucune tortue dans le lagon !", "err"); return; }
  const sim = lancerSimulation(salle, m, pseudos, joueurs, tortues, salle.nouveaute);
  const T = TWISTS[salle.nouveaute] || TWISTS.calme;
  st.innerHTML = `<div class="brawl-grid">
    <div><h2 class="titre-scene gauche">🎬 ${duel ? "Duel des champions" : "Manche " + m} · ${T.icone} ${esc(T.nom)}</h2><div id="vue"></div></div>
    <div class="cote-brawl">
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
    $("#live").innerHTML = cl.map((x) => `<li class="${estBot(x.id) ? "bot" : ""}"><span class="swatch" style="background:${x.couleur}"></span>${esc(x.nom)}<span class="n">${x.n} 🥚</span></li>`).join("");
    if (t < dernier) $("#feed").innerHTML = "";
    const ev = sim.events.filter((e) => e.tick > dernier && e.tick <= t && (e.type === "nid" || !estBot(e.id)));
    for (const e of ev) {
      const [txt, cls] = FEED[e.type](esc(noms[e.id] ? noms[e.id].nom : e.id), e);
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
    const res = calculerScores(sim, m, scores, duel);
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
  for (const n of ["3", "2", "1", "🐢 GO !"]) { cd.textContent = n; await new Promise((r) => setTimeout(r, 700)); }
  cd.remove();
  viewer.player.play();
}

// ---------- résultats d'une manche ----------
async function scResultats(st) {
  let scores, tortues;
  try { [scores, tortues, joueurs] = await Promise.all([db.scores(CODE), db.tortues(CODE), db.joueurs(CODE)]); }
  catch (e) { toast(e.message, "err"); return; }
  const info = infosManche(scores, salle.manche);
  if (!info) { st.innerHTML = `<p>Pas de scores pour cette manche.</p>`; return; }
  const T = TWISTS[info.twist] || TWISTS.calme;
  const sm = scores.filter((s) => s.manche === info.manche && !estBot(s.pseudo)).sort((a, b) => a.rang - b.rang);
  const sim = lancerSimulation(salle, info.manche, info.pseudos, joueurs, tortues, info.twist);
  const cap = Object.fromEntries(sim.resultats.map((r) => [r.id, r.captures]));
  const progres = sm.filter((s) => s.bonus > 0);
  const cls = classementCumule(scores);
  const prochaine = salle.manche + 1;
  const twistSuivant = TWIST_ORDER[Math.min(TWIST_ORDER.length - 1, scores.filter((s) => !s.duel).map((s) => s.manche).filter((v, i, a) => a.indexOf(v) === i).length)];
  st.innerHTML = `<h2 class="titre-scene">🏆 Résultats ${info.duel ? "du duel des champions" : "de la manche " + info.manche} · ${T.icone}</h2>
    ${podium(sm.slice(0, 3).map((s) => ({ nom: s.pseudo, det: `${s.nids} 🥚${info.duel ? "" : ` · ${s.points + s.bonus} pts`}` })))}
    ${progres.length ? `<div class="msg ok centre-txt">📈 <b>Bonus progrès (+${BONUS_PROGRESSION})</b> : ${progres.map((s) => esc(s.pseudo)).join(", ")}</div>` : ""}
    <div class="grid2" style="margin-top:14px">
      <div><h3>Ce match</h3><table class="scores"><tr><th class="num">#</th><th>Élève</th><th class="num">🥚</th><th class="num">🦈</th><th class="num">Points</th></tr>
        ${sm.map((s) => `<tr><td class="num">${s.rang}</td><td><span class="swatch" style="background:${(joueurs.find((j) => j.pseudo === s.pseudo) || {}).couleur || "#ccc"}"></span>${esc(s.pseudo)}</td><td class="num">${s.nids}</td><td class="num">${cap[s.pseudo] ?? "–"}</td><td class="num">${info.duel ? "–" : s.points + (s.bonus ? ` <small class="bonus">+${s.bonus}</small>` : "")}</td></tr>`).join("")}
        ${sim.resultats.filter((r) => estBot(r.id)).map((r) => `<tr class="bot"><td class="num">🤖</td><td>${esc(r.nom)}</td><td class="num">${r.nids}</td><td class="num">${r.captures}</td><td class="num">–</td></tr>`).join("")}
      </table></div>
      <div><h3>Classement de la séance</h3>${tableauCumule(cls, 12)}</div>
    </div>
    <div class="msg info" style="margin-top:14px">🔍 <b>Laissez 2-3 minutes aux élèves</b> : sur leur écran, ils revoient le match en suivant leur tortue, ligne par ligne, avec des conseils. Puis lancez le rematch !</div>
    <div class="row centre actions-fin" id="actions"></div>
    <div id="replay" style="margin-top:14px"></div>`;
  const act = $("#actions");
  const sel = selectTwist(twistSuivant);
  const bSuiv = el("button", { class: "btn big corail" }, `▶ ${info.duel ? "Nouvelle manche" : "Rematch : manche " + prochaine}`);
  bSuiv.addEventListener("click", () => lancerManche(prochaine, sel.value, reglages.duree, null));
  const bRevoir = el("button", { class: "btn ghost" }, "🎬 Revoir le match");
  bRevoir.addEventListener("click", () => {
    if (viewer) viewer.destroy();
    viewer = new MatchViewer($("#replay"), { sim, pensee: false, vitesse: 5, marqueurs: [] });
    $("#replay").scrollIntoView({ behavior: "smooth" });
  });
  const top3 = cls.slice(0, 3).map((t) => t.pseudo);
  const bDuel = el("button", { class: "btn or" }, "⛈️ Duel des champions");
  bDuel.title = "Les 3 premiers du classement s'affrontent dans la tempête (hors classement)";
  bDuel.addEventListener("click", () => {
    if (top3.length < 2) return toast("Il faut au moins 2 élèves classés.", "err");
    if (!confirm(`Duel des champions entre ${top3.join(", ")} (+ la Championne 🤖), nouveauté « Tempête ».\nLes autres élèves regardent et continuent à s'entraîner. On y va ?`)) return;
    lancerManche(prochaine, TWIST_DUEL, reglages.dureeDuel, top3);
  });
  const bFin = el("button", { class: "btn sombre" }, "🏁 Terminer la séance");
  bFin.addEventListener("click", () => { if (confirm("Terminer la séance et afficher le podium final ?")) piloter({ phase: "fin" }).catch((e) => toast(e.message, "err")); });
  act.append(bRevoir, el("label", { class: "champ petit" }, "Nouveauté suivante", sel), bSuiv);
  if (!info.duel && cls.length >= 2) act.append(bDuel);
  act.append(bFin);
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
      ${champion ? `<div class="trophee"><span class="ic">⛈️</span><b>Champion·ne du duel</b>${esc(champion.pseudo)} (${champion.nids} 🥚)</div>` : ""}
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
const demande = new URLSearchParams(location.search).get("salle");
if (demande && mesSalles()[demande.toUpperCase()]) ouvrir(demande.toUpperCase()); else accueil();
