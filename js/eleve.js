// =====================================================================
//  Lagon Arena — écran élève : programmer, tester, envoyer, comprendre
// =====================================================================
import { db, MODE, synchroniserHorloge, secondesRestantes } from "./db.js";
import { simulate, BOTS, BOT_PIRATE, CODE_DEPART, TWISTS, BONUS_PROGRESSION, styleEquipe } from "./engine.js";
import { check } from "./interp.js";
import { CodeEditor, boiteOutils } from "./editor.js";
import { coupDePouceHTML } from "./pouce.js";
import { RAPPELS, estAvance, setAvance, setEquipe, estEquipe } from "./primitives.js";
import { MatchViewer, rapportHTML, tableauMatch } from "./viewer.js";
import { lancerSimulation, codeDe, estBot, infosManche, classementCumule, baremeEquipes } from "./brawl.js";
import { $, $$, el, esc, toast, store, mmss, AIDE_HTML, twistCarte, activerCopie, cartesEquipesHTML, nomEquipe, placeTxt,
  copier, nouveauCodePerso, jetonDuCode, codeLisible, cleJeton, cleCodePerso } from "./common.js";

const q = new URLSearchParams(location.search);
const SALLE = (q.get("salle") || "").toUpperCase();
const LIBRE = q.has("libre") || !SALLE;
const PSEUDO = q.get("pseudo") || "";
let JETON = LIBRE ? null : store.get(cleJeton(SALLE, PSEUDO));
let CODE_PERSO = LIBRE ? null : store.get(cleCodePerso(SALLE, PSEUDO));
if (!LIBRE && !JETON) location.replace(`index.html?salle=${encodeURIComponent(SALLE)}`);

document.body.classList.add(LIBRE ? "mode-libre" : "mode-salle");
const couleur = store.get("lagon:couleur") || "#ff7b5c";
const BOT_COUL = ["#c9d6df", "#9fb3c2", "#e0e6eb", "#b3c4d1", "#d6dee5"];

// ---------------------------------------------------------------------
//  Onglets
// ---------------------------------------------------------------------
function onglet(t) {
  $$("#tabs .tab").forEach((b) => b.classList.toggle("on", b.dataset.t === t));
  for (const k of ["prog", "res", "cls", "aide"]) $("#t-" + k).classList.toggle("cache", k !== t);
  const b = $(`#tabs [data-t="${t}"] .notif`); if (b) b.remove();
}
$$("#tabs .tab").forEach((b) => b.addEventListener("click", () => onglet(b.dataset.t)));
const notifier = (t) => { const b = $(`#tabs [data-t="${t}"]`); if (!b.classList.contains("on") && !b.querySelector(".notif")) b.append(el("span", { class: "notif" })); };
$("#aide").innerHTML = "<h2>❓ Aide-mémoire</h2>" + AIDE_HTML;

// ---------------------------------------------------------------------
//  Éditeur + vérification en direct
// ---------------------------------------------------------------------
const cleCode = `lagon:code:${LIBRE ? "libre" : SALLE + ":" + PSEUDO}`;
const cleEnvoi = `lagon:envoi:${SALLE}:${PSEUDO}`;
let dernierEnvoi = LIBRE ? null : store.get(cleEnvoi);
let minuterie = null;
const ed = new CodeEditor($("#ed"), {
  value: store.get(cleCode) || CODE_DEPART,
  onChange: (v) => { store.set(cleCode, v); clearTimeout(minuterie); minuterie = setTimeout(verifier, 450); majEnvoi(); },
});
boiteOutils($("#outils"), ed);
activerCopie();

// mode avancé : affiche les primitives du tutoriel avancé (et la tortue Pirate dans le bac à sable)
{
  const input = el("input", { type: "checkbox" }); input.checked = estAvance();
  const sw = el("label", { class: "switch petit", title: "Affiche les primitives avancées (distances, pousser…) dans l'autocomplétion et la boîte à outils" },
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

function verifier() {
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
  if (!confirm("Remplacer ton code par la tortue de départ ? (ton code actuel sera perdu)")) return;
  ed.value = CODE_DEPART; store.set(cleCode, CODE_DEPART); verifier(); majEnvoi();
});

// ---------------------------------------------------------------------
//  Bac à sable : ta tortue contre les 5 tortues d'entraînement
// ---------------------------------------------------------------------
let salle = null, graineSB = null, viewerSB = null;
let twistLibre = store.get("lagon:twistLibre", "calme");
const twistActuel = () => (LIBRE ? twistLibre : salle && salle.manche > 0 ? salle.nouveaute : "calme");
const selT = $("#sel-twist");
for (const [k, T] of Object.entries(TWISTS)) selT.append(el("option", { value: k, selected: k === twistLibre }, `${T.icone} ${T.nom}`));
selT.addEventListener("change", () => { twistLibre = selT.value; store.set("lagon:twistLibre", twistLibre); majTwistSB(); tester(); });
function majTwistSB() { const T = TWISTS[twistActuel()]; $("#sb-twist").textContent = `nouveauté : ${T.icone} ${T.nom}`; }
majTwistSB();

// les tortues du bac à sable : la mienne + les tortues d'entraînement (+ la Pirate en mode avancé)
function joueursSB() {
  const bots = estAvance() ? [...BOTS, BOT_PIRATE] : BOTS;   // en mode avancé, la Pirate pousse les autres tortues !
  const joueurs = [{ id: "moi", nom: LIBRE ? "Ta tortue" : PSEUDO, couleur, code: ed.value },
    ...bots.map((b, i) => ({ id: "Bot-" + b.nom, nom: b.nom + " 🤖", couleur: BOT_COUL[i % BOT_COUL.length], code: b.code }))];
  if (estEquipe()) {   // manche en équipes : on s'entraîne aussi en équipes (ma vraie équipe, et autant d'équipes que dans la manche)
    const c = configActuelle() || configProchaine() || {};
    const nb = Math.max(2, c.nbEquipes || 2), mienne = (c.equipes || {})[PSEUDO] || 1;
    joueurs.forEach((j, i) => { j.equipe = ((mienne - 1 + i) % nb) + 1; });
  }
  return joueurs;
}
// ▶ Tester : un NOUVEAU lagon à chaque fois ; « Rejouer ce lagon » garde le même (pour vérifier une correction)
function tester(memeLagon = false) {
  const c = verifier();
  if (!c.ok) { toast("Corrige d'abord l'erreur de ton code (en rouge).", "err"); return; }
  if (!memeLagon || graineSB == null) graineSB = 1 + Math.floor(Math.random() * 2e9);
  $("#autre").disabled = false;
  const joueurs = joueursSB();
  const sim = simulate({ joueurs, graine: graineSB, twist: twistActuel() });
  if (viewerSB) viewerSB.destroy();
  viewerSB = new MatchViewer($("#sb-vue"), { sim, focus: "moi", code: ed.value, vitesse: 5 });
  const r = sim.resultats.find((x) => x.id === "moi");
  $("#sb-res").innerHTML = `<div class="sep"></div><h3>Résultat : ${r.nids} nid${r.nids > 1 ? "s" : ""} · ${r.rang}<sup>${r.rang > 1 ? "e" : "re"}</sup> sur ${sim.resultats.length}</h3>` +
    rapportHTML(sim, "moi") + `<details><summary>Classement du test</summary>${tableauMatch(sim, "moi", (id) => id.startsWith("Bot-"))}</details>`;
}
$("#tester").addEventListener("click", () => tester());
$("#rejouer").addEventListener("click", () => { onglet("res"); const b = $("#etsi"); if (b) { b.click(); $("#etsi-res").scrollIntoView({ behavior: "smooth", block: "center" }); } });
$("#autre").addEventListener("click", () => tester(true));

// ---------------------------------------------------------------------
//  Estimation : le nombre d'œufs MOYEN sur plusieurs parties (sans les afficher, en mode léger).
//  Toujours les mêmes lagons (graines fixes) : on peut comparer deux versions de son code.
// ---------------------------------------------------------------------
let estimEnCours = false;
const cleEstim = "lagon:estimations";
const virgule = (x, d = 1) => x.toFixed(d).replace(".", ",");
async function estimer() {
  if (estimEnCours) return;
  const c = verifier();
  if (!c.ok) { toast("Corrige d'abord l'erreur de ton code (en rouge).", "err"); return; }
  const n = parseInt($("#nb-estim").value, 10) || 20, twist = twistActuel(), code = ed.value;
  const joueurs = joueursSB(), box = $("#estim-res"), btn = $("#estimer");
  estimEnCours = true; btn.disabled = true;
  box.innerHTML = `<div class="jauge"><div id="estim-jg" style="width:0"></div></div><p class="petit muted" id="estim-txt">Partie 0 / ${n}…</p>`;
  const par = {};   // id -> { nids:[], captures, plastiques, epuisee }
  for (const j of joueurs) par[j.id] = { nom: j.nom, nids: [], captures: 0, plastiques: 0, epuisee: 0 };
  const t0 = performance.now();
  for (let i = 0; i < n; i++) {
    const sim = simulate({ joueurs, graine: 900001 + i * 7919, twist, leger: true });
    for (const t of sim.tortues) {
      const p = par[t.id]; p.nids.push(t.nids);
      p.captures += t.stats.captures.length; p.plastiques += t.stats.plastiques.length; p.epuisee += t.stats.epuisee.length;
    }
    if (performance.now() - t0 > 40 * (i + 1) || i % 2 === 1) {   // on laisse la page respirer
      const jg = $("#estim-jg"); if (jg) jg.style.width = (100 * (i + 1) / n) + "%";
      const tx = $("#estim-txt"); if (tx) tx.textContent = `Partie ${i + 1} / ${n}…`;
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  estimEnCours = false; btn.disabled = false;
  const moy = (l) => l.reduce((a, b) => a + b, 0) / l.length;
  const moi = par.moi, m = moy(moi.nids);
  const max = Math.max(...moi.nids), zero = moi.nids.filter((x) => x === 0).length;
  const histo = Array.from({ length: max + 1 }, (_, k) => moi.nids.filter((x) => x === k).length);
  const hmax = Math.max(...histo);
  const bots = Object.entries(par).filter(([id]) => id !== "moi").map(([, p]) => ({ nom: p.nom, m: moy(p.nids) }));
  const classes = [...bots, { nom: "Ta tortue", m, moi: true }].sort((a, b) => b.m - a.m);
  // mémoire : les estimations précédentes (même nouveauté, même nombre de parties)
  const hist = store.get(cleEstim, []).filter((h) => h.twist === twist && h.n === n && h.salle === (SALLE || ""));
  const avant = hist[hist.length - 1];
  const memeCode = avant && avant.code === code;
  if (!memeCode) { hist.push({ twist, n, salle: SALLE || "", m, code, quand: Date.now() }); }
  const tout = store.get(cleEstim, []).filter((h) => !(h.twist === twist && h.n === n && h.salle === (SALLE || ""))).concat(hist.slice(-6));
  store.set(cleEstim, tout.slice(-30));
  const T = TWISTS[twist] || TWISTS.calme;
  box.innerHTML = `<div class="estim-moy"><b>${virgule(m)}</b> œuf${m >= 2 ? "s" : ""} par partie en moyenne</div>
    <p class="petit">Sur ${n} lagons (${T.icone} ${esc(T.nom)}) : entre ${Math.min(...moi.nids)} et ${max} œufs · ${Math.round(100 * zero / n)} % des parties sans œuf ·
      🦈 ${virgule(moi.captures / n)} capture par partie · 🛍️ ${virgule(moi.plastiques / n)} sac · 😵 ${virgule(moi.epuisee / n)} épuisement.</p>
    ${avant && !memeCode ? `<p class="estim-avant">${m > avant.m + 0.05 ? "📈" : m < avant.m - 0.05 ? "📉" : "➖"} Estimation précédente : ${virgule(avant.m)} → maintenant <b>${virgule(m)}</b></p>` : ""}
    ${hist.length > 1 ? `<p class="petit muted">Tes estimations : ${hist.slice(-6).map((h) => virgule(h.m)).join(" → ")}</p>` : ""}
    <div class="histo" title="Combien de parties avec 0, 1, 2… œufs">${histo.map((v, k) => `<div><span style="height:${hmax ? Math.round(56 * v / hmax) : 0}px"></span><small>${k} 🥚</small><small class="muted">${v}×</small></div>`).join("")}</div>
    <table class="scores petit"><tr><th>#</th><th>Tortue</th><th class="num">🥚 moyenne</th></tr>
      ${classes.map((x, i) => `<tr class="${x.moi ? "moi" : "bot"}"><td class="num">${i + 1}</td><td>${esc(x.nom)}</td><td class="num">${virgule(x.m)}</td></tr>`).join("")}</table>
    ${m === 0 ? `<div class="msg warn">Ta tortue ne pond jamais : regarde le <b>💡 Coup de pouce</b>.</div>` : ""}`;
}
$("#estimer").addEventListener("click", estimer);

// ---------------------------------------------------------------------
//  Mode bac à sable seul : on s'arrête là
// ---------------------------------------------------------------------
if (LIBRE) {
  $("#info").append(el("span", { class: "pill" }, "🧪 Bac à sable"));
  if (MODE === "demo") $("#info").append(el("span", { class: "pill mode-demo" }, "Mode démo"));
}

// ---------------------------------------------------------------------
//  Mode salle
// ---------------------------------------------------------------------
const estFinaliste = () => !salle || !salle.duel || salle.duel.includes(PSEUDO);
const heureCourte = (iso) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

// manche « longue » : l'enseignant a choisi un temps illimité (la manche reste ouverte plusieurs jours)
const ILLIMITE = 30 * 24 * 3600;
const tempsIllimite = () => salle && salle.phase === "prog" && salle.fin_chrono && secondesRestantes(salle.fin_chrono) > ILLIMITE;
function majEnvoi() {
  if (LIBRE) return;
  const b = $("#envoyer"), box = $("#envoi");
  b.classList.remove("pulse");
  if (!salle || salle.phase !== "prog") {
    b.disabled = true;
    box.innerHTML = `<div class="msg info">${!salle || salle.phase === "attente" ? "⏳ La manche n'a pas encore commencé : entraîne-toi dans le bac à sable !" : "🔒 Les envois sont fermés pour cette manche."}</div>`;
    return;
  }
  if (!estFinaliste()) {
    b.disabled = true;
    box.innerHTML = `<div class="msg info">⭐ ${esc(titreManche())} : seuls ${salle.duel.map(esc).join(", ")} envoient une tortue. Regarde le match au tableau… et continue à t'entraîner !</div>`;
    return;
  }
  b.disabled = false;
  const long = tempsIllimite();
  const envoye = dernierEnvoi && dernierEnvoi.manche === salle.manche;
  if (envoye && dernierEnvoi.code === ed.value) {
    b.textContent = "📤 Renvoyer";
    box.innerHTML = `<div class="msg ok">✅ Tortue envoyée pour la manche ${salle.manche} (${jourHeure(dernierEnvoi.at)}). Tu peux encore l'améliorer et la renvoyer ${long ? "jusqu'au brawl, même depuis chez toi (🏠 Mon code de session)" : "avant la fin du chrono"}.</div>`;
  } else if (envoye) {
    b.textContent = "📤 Renvoyer"; b.classList.add("pulse");
    box.innerHTML = `<div class="msg warn">⚠️ Tu as modifié ton code depuis l'envoi. Renvoie-la, sinon c'est l'<b>ancienne version</b> qui jouera.</div>`;
  } else {
    b.textContent = "📤 Envoyer ma tortue"; b.classList.add("pulse");
    box.innerHTML = `<div class="msg warn">⏳ Pas encore envoyée. Si tu n'envoies rien, c'est ta tortue précédente (ou la tortue de départ) qui jouera.</div>`;
  }
}
const jourHeure = (iso) => {
  const d = new Date(iso), auj = new Date().toDateString() === d.toDateString();
  return (auj ? "" : "le " + d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) + " ") + "à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};

let envoiEnCours = false;
async function envoyer(auto = false) {
  if (LIBRE || envoiEnCours) return;
  const c = check(ed.value);
  if (!c.ok) { verifier(); if (!auto) toast("Corrige l'erreur avant d'envoyer ta tortue.", "err"); return; }
  if (!salle || salle.phase !== "prog") { if (!auto) toast("Ce n'est pas le moment d'envoyer ta tortue.", "err"); return; }
  envoiEnCours = true;
  const code = ed.value, manche = salle.manche;
  try {
    const at = await db.deposer(SALLE, PSEUDO, JETON, manche, code);
    dernierEnvoi = { manche, code, at: typeof at === "string" ? at : new Date().toISOString() };
    store.set(cleEnvoi, dernierEnvoi);
    toast(auto ? "⏰ Chrono terminé : ta tortue a été envoyée automatiquement." : "📤 Tortue envoyée ! Elle jouera au prochain brawl.");
  } catch (e) { toast(e.message, "err"); }
  envoiEnCours = false;
  majEnvoi();
}
$("#envoyer").addEventListener("click", () => envoyer(false));

// --- topbar, bandeau, chrono ---
function majInfo() {
  const info = $("#info"); info.innerHTML = "";
  const bCode = el("button", { class: "pill pill-btn", title: "Pour continuer sur un autre ordinateur (à la maison…)" }, "🏠 Mon code de session");
  bCode.addEventListener("click", montrerCodePerso);
  info.append(el("span", { class: "pill" }, "🔑 " + SALLE),
    el("span", { class: "pill" }, el("span", { class: "dot", style: `background:${couleur}` }), PSEUDO), bCode);
  if (salle && salle.manche > 0) info.append(el("span", { class: "pill" }, titreManche()));
  if (MODE === "demo") info.append(el("span", { class: "pill mode-demo" }, "Mode démo"));
}
function bandeau(html, type = "info") {
  const b = $("#bandeau");
  if (!html) { b.classList.add("cache"); return; }
  b.className = "bandeau " + type; b.innerHTML = html;
}
let autoEnvoiFait = "";
setInterval(() => {
  if (LIBRE || !salle) return;
  const c = $("#chrono");
  if (salle.phase !== "prog" || !salle.fin_chrono) { c.classList.add("cache"); return; }
  const r = secondesRestantes(salle.fin_chrono);
  c.classList.remove("cache");
  if (r > ILLIMITE) { c.textContent = "♾️ Temps illimité"; c.classList.remove("alerte"); return; }
  c.textContent = r > 0 ? "⏱️ " + mmss(r) : "⏱️ Temps écoulé";
  c.classList.toggle("alerte", r <= 30);
  // envoi automatique juste avant la fin du chrono, si le code a changé et qu'il est correct
  const cle = salle.manche + "";
  if (r <= 3 && r > -8 && autoEnvoiFait !== cle && estFinaliste()) {
    autoEnvoiFait = cle;
    const envoye = dernierEnvoi && dernierEnvoi.manche === salle.manche && dernierEnvoi.code === ed.value;
    if (!envoye && check(ed.value).ok) envoyer(true);
  }
}, 250);

// --- code de session : se reconnecter depuis un autre ordinateur (manches longues, travail à la maison) ---
// Les élèves arrivés avant les codes de session en reçoivent un (si la base de données est à jour).
async function assurerCodePerso() {
  if (LIBRE || CODE_PERSO) return CODE_PERSO;
  const code = nouveauCodePerso(), nv = jetonDuCode(code);
  try {
    await db.changerJeton(SALLE, PSEUDO, JETON, nv);
    JETON = nv; CODE_PERSO = code;
    store.set(cleJeton(SALLE, PSEUDO), nv); store.set(cleCodePerso(SALLE, PSEUDO), code);
  } catch { /* base de données pas encore à jour : pas de code de session */ }
  return CODE_PERSO;
}
async function montrerCodePerso() {
  const code = await assurerCodePerso();
  const site = new URL("index.html", location.href).href;
  if (!code) {
    overlay(`<h2>🏠 Continuer sur un autre ordinateur</h2><p>Ton code de session n'est pas encore disponible : ton enseignant doit mettre à jour la base de données.</p>
      <p>En attendant, sur l'autre ordinateur, demande à ton enseignant de <b>débloquer ton pseudo</b> (🔓).</p>`, true);
    return;
  }
  const lien = `${new URL("index.html", location.href).href}?salle=${encodeURIComponent(SALLE)}&pseudo=${encodeURIComponent(PSEUDO)}#code=${code}`;
  overlay(`<h2>🏠 Continuer chez toi (ou sur un autre ordinateur)</h2>
    <ol class="etapes-code">
      <li>Va sur <b>${esc(site.replace(/^https?:\/\//, ""))}</b></li>
      <li>Salle <b class="gros-code">${esc(SALLE)}</b> · pseudo <b>${esc(PSEUDO)}</b></li>
      <li>Clique sur « 🏠 Tu reviens depuis un autre ordinateur ? » et tape ton <b>code de session</b> :</li>
    </ol>
    <div class="code-perso">${codeLisible(code)}</div>
    <p>✍️ <b>Note-le dans ton cahier.</b> Ne le donne à personne : avec ce code, on peut envoyer une tortue à ta place.</p>
    <p class="petit">Ou garde ce lien personnel (il remplit tout seul le code) : <button class="btn small ghost" id="copier-lien">📋 Copier mon lien</button></p>
    <p class="petit muted">Sur l'autre ordinateur, tu retrouves ta dernière tortue envoyée et tes points. Pendant une <b>manche à temps illimité</b>, tu peux continuer à la programmer et la renvoyer jusqu'au brawl. Pense à l'envoyer avant de quitter un ordinateur : c'est elle que tu retrouveras sur l'autre.</p>`, true);
  $("#copier-lien").addEventListener("click", () => copier(lien).then(() => toast("Lien copié !"), () => toast(lien)));
}
// sur un nouvel ordinateur : on retrouve la dernière tortue envoyée (même celle de la manche en cours)
async function recupererDerniereTortue() {
  if (LIBRE) return;
  let t = null;
  try { t = await db.maTortue(SALLE, PSEUDO, JETON); } catch { return; }   // (base pas à jour : comportement d'avant)
  if (!t) return;
  if (!dernierEnvoi || t.manche > dernierEnvoi.manche || (t.manche === dernierEnvoi.manche && t.code !== dernierEnvoi.code)) {
    dernierEnvoi = { manche: t.manche, code: t.code, at: t.depose_le || new Date().toISOString() };
    store.set(cleEnvoi, dernierEnvoi);
  }
  if (!store.get(cleCode)) { ed.value = t.code; store.set(cleCode, t.code); verifier(); }
  majEnvoi();
}

// --- overlay ---
function overlay(html, fermable = false) {
  const o = $("#overlay");
  if (!html) { o.innerHTML = ""; return; }
  o.innerHTML = `<div class="overlay"><div class="boite">${html}${fermable ? '<p><button class="btn" id="fermer-ov">Fermer</button></p>' : ""}</div></div>`;
  if (fermable) $("#fermer-ov").addEventListener("click", () => overlay(null));
}

// --- changements de phase ---
let etatCle = "";
async function changementPhase(premier) {
  majInfo(); majTwistSB();
  const T = TWISTS[salle.nouveaute] || TWISTS.calme;
  $("#twist").innerHTML = "";
  if (salle.manche > 0 && salle.phase !== "fin") {
    $("#twist").append(el("div", { class: "petit muted" }, `Nouveauté (${titreManche()}) :`), twistCarte(salle.nouveaute));
  }
  $("#twist").append(el("div", { id: "manche-info" }));
  majCarteManche();
  overlay(null);
  switch (salle.phase) {
    case "attente":
      bandeau("⏳ <b>La partie va bientôt commencer.</b> En attendant, prépare ta tortue et teste-la dans le bac à sable !"); break;
    case "prog":
      if (premier && salle.manche > 1 && !dernierEnvoi && !salle.duel) toast("🆕 La partie a déjà commencé : programme ta tortue et envoie-la, elle jouera au prochain brawl !");
      if (salle.duel && !estFinaliste()) bandeau(`⭐ <b>${esc(titreManche())}</b> : ${salle.duel.map(esc).join(", ")} préparent leur tortue. Toi, tu peux continuer à t'entraîner !`);
      else bandeau(`⌨️ <b>${esc(titreManche())}</b> : ${T.icone} ${esc(T.nom)}. Améliore ta tortue, teste-la, puis <b>envoie-la</b> avant la fin du chrono !`, "action");
      if (!premier) { onglet("prog"); toast(`🔔 ${titreManche()} : à vos claviers !`); }
      break;
    case "brawl":
      bandeau("🎬 <b>Brawl en cours</b> : regarde le tableau !");
      overlay(`<div class="emoji">🎬</div><h2>Brawl en cours !</h2><p>Toutes les tortues sont dans le lagon.<br><b>Regarde le tableau</b> 👀</p><p class="petit muted">Juste après, tu pourras revoir le match sur ton écran et comprendre ce qu'a fait ta tortue.</p>`);
      break;
    case "resultats":
      bandeau("📊 <b>Résultats</b> : regarde ce qu'a fait ta tortue dans l'onglet Résultats, et prépare la suite !", "ok");
      await chargerResultats(true);
      break;
    case "fin":
      bandeau("🏁 <b>Fin de la séance.</b> Bravo à toutes les tortues !", "ok");
      await chargerResultats(true);
      break;
  }
  if (premier && salle.phase !== "resultats" && salle.phase !== "fin") await chargerResultats(false);
  majEnvoi();
}

async function rafraichir(premier = false) {
  try {
    const s = await db.salle(SALLE);
    if (!s) { overlay(`<div class="emoji">🤷</div><h2>Salle introuvable</h2><p>La salle ${esc(SALLE)} n'existe plus.</p><a class="btn" href="index.html">Retour à l'accueil</a>`); return; }
    salle = s;
    $("#info").classList.remove("hors-ligne");
  } catch (e) { $("#info").classList.add("hors-ligne"); return; }
  const cle = salle.manche + "/" + salle.phase + "/" + (salle.duel || []).join(",");
  if (cle !== etatCle) { etatCle = cle; cfgCle = JSON.stringify(salle.config || null); await changementPhase(premier); }
  else if (JSON.stringify(salle.config || null) !== cfgCle) { cfgCle = JSON.stringify(salle.config || null); majCarteManche(true); }
}

// ---------------------------------------------------------------------
//  Réglages de la manche (préparés par l'enseignant) : mode, points… et MON ÉQUIPE
// ---------------------------------------------------------------------
let cfgCle = "";
const configActuelle = () => (salle && salle.config && salle.config.manche === salle.manche ? salle.config : null);
const configProchaine = () => (salle && salle.config && salle.config.manche === salle.manche + 1 && ["attente", "resultats"].includes(salle.phase) ? salle.config : null);
function titreManche(c = configActuelle()) { return (c && c.titre) || (salle && salle.duel ? "Manche spéciale" : "Manche " + (c ? c.manche : salle.manche)); }
function majCarteManche(annoncer = false) {
  const box = $("#manche-info"); if (!box) return;
  const c = ["prog", "brawl"].includes(salle.phase) ? configActuelle() : configProchaine();
  setEquipe(!!(c && c.mode === "equipes"));
  if (!c) { box.innerHTML = ""; return; }
  const prochaine = c.manche !== salle.manche;
  const T = TWISTS[c.nouveaute] || null;
  const morceaux = [];
  if (prochaine && T) morceaux.push(`${T.icone} ${esc(T.nom)}`);
  if (c.coef === 2) morceaux.push("⭐ points doubles");
  if (c.coef === 0) morceaux.push("hors classement");
  if (c.illimite) morceaux.push("♾️ temps illimité : tu peux continuer chez toi (🏠 Mon code de session)");
  if (c.participants) morceaux.push(c.participants.includes(PSEUDO) ? "✅ tu joues" : "👀 tu regardes");
  let html = `<div class="carte-manche">${prochaine ? `<b>📣 Prochaine manche : ${esc(titreManche(c))}</b>` : ""}${morceaux.length ? `<div>${morceaux.join(" · ")}</div>` : ""}`;
  if (c.mode === "equipes") {
    const eq = c.equipes || {}, mienne = eq[PSEUDO];
    const nums = [...new Set(Object.values(eq))].sort((a, b) => a - b);
    const noms = (e) => Object.keys(eq).filter((p) => eq[p] === e && p !== PSEUDO).map(esc).join(", ") || "personne";
    const autres = nums.filter((e) => e !== mienne).map((e) => `${nomEquipe(e)} : ${noms(e)}`).join(" · ");
    html += mienne
      ? `<div class="mon-equipe" style="${styleEquipe(mienne)}">👥 ${noms(mienne) === "personne" ? `Tu es seul·e dans l'équipe <b>${nomEquipe(mienne)}</b>` : `Tu es dans l'équipe <b>${nomEquipe(mienne)}</b> avec : <b>${noms(mienne)}</b>`}.<br>
         Adversaires (${nums.length - 1} équipe${nums.length > 2 ? "s" : ""}) : ${autres}.<br>
         <span class="petit">Seul le <b>rang de ton équipe</b> compte (moyenne des nids). Mettez-vous d'accord sur une stratégie ! Nouvelles primitives : <code>donner()</code>, <code>equipiere_fatiguee()</code>…</span></div>`
      : c.participants && !c.participants.includes(PSEUDO)
        ? `<div class="mon-equipe">👥 Manche en équipes : ${nums.map((e) => `${nomEquipe(e)} (${noms(e)})`).join(" · ")}. Tu ne joues pas cette manche : observe leurs stratégies !</div>`
        : `<div class="mon-equipe">👥 Manche en équipes : ton enseignant va t'ajouter à une équipe.</div>`;
    if (annoncer && mienne) toast(`👥 Tu es dans l'équipe ${nomEquipe(mienne)} !`);
  }
  box.innerHTML = html + "</div>";
}

// ---------------------------------------------------------------------
//  Résultats et classement
// ---------------------------------------------------------------------
let resAffiches = "", viewerRes = null;
async function chargerResultats(montrer) {
  let scores, tortues, joueurs;
  try { [scores, tortues, joueurs] = await Promise.all([db.scores(SALLE), db.tortues(SALLE), db.joueurs(SALLE)]); }
  catch (e) { toast(e.message, "err"); return; }
  // première connexion sur ce poste : on récupère le dernier code envoyé
  if (!store.get(cleCode)) {
    const mes = tortues.filter((t) => t.pseudo === PSEUDO);
    if (mes.length) { ed.value = codeDe(PSEUDO, 999, tortues); store.set(cleCode, ed.value); verifier(); }
  }
  const manches = [...new Set(scores.map((s) => s.manche))].sort((a, b) => a - b);
  afficherClassement(scores);
  if (!manches.length) {
    $("#t-res").innerHTML = `<div class="card"><h2>📊 Résultats</h2><p>Pas encore de match joué. Les résultats apparaîtront ici après le premier brawl.</p></div>`;
    return;
  }
  const info = infosManche(scores, manches[manches.length - 1]);
  const cle = info.manche + ":" + scores.length;
  if (cle !== resAffiches) { resAffiches = cle; afficherResultats(info, scores, tortues, joueurs); if (!montrer) notifier("res"); }
  if (montrer) {
    onglet("res");
    if (salle.phase === "fin") montrerFin(scores);
  }
}

function afficherResultats(info, scores, tortues, joueurs) {
  const m = info.manche, T = TWISTS[info.twist] || TWISTS.calme;
  const sim = lancerSimulation(salle, m, info.pseudos, joueurs, tortues, info.twist, null, info.equipes, info.version);
  const joue = info.pseudos.includes(PSEUDO);
  const moi = scores.find((s) => s.manche === m && s.pseudo === PSEUDO);
  const nbH = info.pseudos.filter((p) => !estBot(p)).length;
  const avant = scores.filter((s) => s.pseudo === PSEUDO && s.manche < m && !s.duel).sort((a, b) => b.manche - a.manche)[0];
  const monCode = codeDe(PSEUDO, m, tortues);
  const titre = `📊 Manche ${m}${info.equipes ? " 👥" : ""}${info.duel ? " (hors classement)" : ""}`;
  const E = sim.equipes;

  let bloc;
  if (joue && moi && E) {
    const e = moi.equipe, x = E[e] || { rang: 0, exaequo: 1 };
    const ne = `<b>${nomEquipe(e)}</b>`;
    const verdict = x.rang === 1 && x.exaequo === 1 ? `🏆 Victoire de ton équipe ${ne} !`
      : x.rang === 1 ? `🤝 Ton équipe ${ne} est à égalité en tête !`
      : E.nb === 2 ? `😕 Défaite de ton équipe ${ne}…`
      : `${["🥈", "🥉"][x.rang - 2] || "🏅"} Ton équipe ${ne} finit ${placeTxt(x.rang)}${x.exaequo > 1 ? " (ex æquo)" : ""} sur ${E.nb}.`;
    bloc = `<div class="mon-equipe" style="${styleEquipe(e)}">${verdict}</div>
      <div style="margin:10px 0">${cartesEquipesHTML(E, { moi: e })}</div>
      <div class="bigscore"><div class="bloc"><b>${moi.nids}</b>nid${moi.nids > 1 ? "s" : ""} pour ton équipe</div>${info.duel ? "" : `<div class="bloc"><b>+${moi.points}</b>points</div>`}</div>
      <p class="petit muted">En équipes, chaque élève marque les points du rang de son équipe : ${baremeEquipes(E.nb).join(" / ")} (des équipes à égalité se partagent les points).</p>
      <h3>🔍 Ce qu'a fait ta tortue</h3>${rapportHTML(sim, PSEUDO)}`;
  } else if (joue && moi) {
    const prog = avant && !info.duel ? `<p class="progres">${moi.nids > avant.nids ? "📈" : moi.nids < avant.nids ? "📉" : "➖"} Manche ${avant.manche} : ${avant.nids} nid${avant.nids > 1 ? "s" : ""} → manche ${m} : <b>${moi.nids} nid${moi.nids > 1 ? "s" : ""}</b>${moi.bonus ? ` · <b>bonus progrès +${moi.bonus}</b> 🎉` : ""}</p>` : "";
    bloc = `<div class="bigscore">
        <div class="bloc"><b>${moi.rang}<sup>${moi.rang > 1 ? "e" : "er"}</sup></b>sur ${nbH} élève${nbH > 1 ? "s" : ""}</div>
        <div class="bloc"><b>${moi.nids}</b>nid${moi.nids > 1 ? "s" : ""} 🥚</div>
        ${info.duel ? "" : `<div class="bloc"><b>+${moi.points + moi.bonus}</b>points</div>`}
      </div>${prog}
      <h3>🔍 Ce qu'a fait ta tortue</h3>${rapportHTML(sim, PSEUDO)}`;
  } else {
    bloc = info.duel ? `<p>Ce match était le duel des finalistes. Regarde-le quand même : que font les meilleures tortues ?</p>`
      : `<p>🆕 Tu es arrivé·e après ce match : ta tortue n'y était pas. Regarde-le quand même (que font les meilleures tortues ?) : <b>ta tortue jouera au prochain brawl</b>.</p>`;
  }
  $("#t-res").innerHTML = `<div class="grid2"><div>
      <div class="card"><h2>${titre} · ${T.icone} ${esc(T.nom)}</h2>${bloc}</div>
      ${joue ? `<div class="card"><h2>🤔 Et si… ?</h2>
        <p>Corrige ta tortue dans l'onglet <b>⌨️ Programmer</b>, puis rejoue <b>exactement le même match</b> avec ton nouveau code pour vérifier que ta correction marche.</p>
        <div class="row"><button class="btn" id="etsi">▶ Rejouer avec mon nouveau code</button><button class="btn ghost small" id="modifier">✏️ Modifier mon code</button></div><div id="etsi-res"></div></div>` : ""}
      <div class="card"><h2>🏅 Classement du match</h2>${tableauMatch(sim, PSEUDO, estBot, Object.fromEntries(scores.filter((s) => s.manche === m).map((s) => [s.pseudo, s.rang])))}
        <p class="petit muted">Les tortues d'entraînement 🤖 ne comptent pas dans le classement des élèves.</p></div>
    </div><div class="card">
      <h2>🎬 Revois le match ${joue ? "en suivant ta tortue" : ""}</h2>
      <p class="petit muted" style="margin-top:0">${joue ? "Clique sur les icônes de la frise (🦈 attrapée, 🥚 nid, 🛍️ plastique, 😵 épuisée) pour aller directement aux moments importants, puis avance tour par tour." : ""}</p>
      <div id="res-vue"></div>
    </div></div>`;
  if (viewerRes) viewerRes.destroy();
  viewerRes = new MatchViewer($("#res-vue"), { sim, focus: joue ? PSEUDO : null, code: monCode, autoplay: false, vitesse: 2.4 });
  $("#rejouer").classList.toggle("cache", !joue);
  if (joue) $("#modifier").addEventListener("click", () => { onglet("prog"); ed.ta.focus(); });
  if (joue) $("#etsi").addEventListener("click", () => {
    const c = verifier();
    if (!c.ok) { toast("Corrige d'abord l'erreur de ton code.", "err"); return; }
    const sim2 = lancerSimulation(salle, m, info.pseudos, joueurs, tortues, info.twist, { pseudo: PSEUDO, code: ed.value }, info.equipes, info.version);
    const a = sim.resultats.find((r) => r.id === PSEUDO), b = sim2.resultats.find((r) => r.id === PSEUDO);
    const fleche = b.nids > a.nids ? "📈" : b.nids < a.nids ? "📉" : "➖";
    $("#etsi-res").innerHTML = `<div class="compare" style="margin-top:12px">
        <div class="bloc-c"><div class="petit muted">Pendant le match</div><b>${a.nids} 🥚</b><div>${a.captures} × 🦈</div></div>
        <div class="fleche">${fleche}</div>
        <div class="bloc-c"><div class="petit muted">Avec ton nouveau code</div><b>${b.nids} 🥚</b><div>${b.captures} × 🦈</div></div></div>
        ${rapportHTML(sim2, PSEUDO)}
        <p class="petit">${salle.phase === "prog" ? "👉 Si c'est mieux, n'oublie pas d'<b>envoyer</b> ta tortue !" : "👉 Garde ce code : tu pourras l'envoyer à la prochaine manche."}</p>`;
    const voir = el("button", { class: "btn small ghost" }, "🎬 Voir ce match dans le lecteur");
    voir.addEventListener("click", () => { viewerRes.destroy(); viewerRes = new MatchViewer($("#res-vue"), { sim: sim2, focus: PSEUDO, code: ed.value, vitesse: 2.4 }); $("#res-vue").scrollIntoView({ behavior: "smooth" }); });
    $("#etsi-res").append(voir);
  });
}

function afficherClassement(scores) {
  const cls = classementCumule(scores);
  const manches = [...new Set(scores.filter((s) => !s.duel).map((s) => s.manche))].sort((a, b) => a - b);
  if (!cls.length) { $("#t-cls").innerHTML = `<div class="card"><h2>🏆 Classement</h2><p>Le classement apparaîtra après le premier brawl.</p></div>`; return; }
  const rows = cls.map((t) => `<tr class="${t.pseudo === PSEUDO ? "moi" : ""}"><td class="num">${t.rang}</td><td>${esc(t.pseudo)}</td>` +
    manches.map((m) => { const s = t.parManche[m]; return `<td class="num">${s ? s.points + (s.bonus ? `<small class="bonus">+${s.bonus}</small>` : "") : "–"}</td>`; }).join("") +
    `<td class="num"><b>${t.total}</b></td></tr>`).join("");
  $("#t-cls").innerHTML = `<div class="card"><h2>🏆 Classement de la séance</h2>
    <table class="scores"><tr><th class="num">#</th><th>Pseudo</th>${manches.map((m) => `<th class="num">M${m}</th>`).join("")}<th class="num">Total</th></tr>${rows}</table>
    <p class="petit muted">Points par manche selon ton rang parmi les élèves (25, 20, 16, 13, 11…) + <b>${BONUS_PROGRESSION} points de bonus</b> si ta tortue pond plus de nids qu'à la manche précédente.</p></div>`;
}

let finMontree = false;
function montrerFin(scores) {
  if (finMontree) return; finMontree = true;
  const cls = classementCumule(scores), moi = cls.find((t) => t.pseudo === PSEUDO);
  overlay(`<div class="emoji">🏁</div><h2>Fin de la séance !</h2>` +
    (moi ? `<p style="font-size:1.2rem">Tu termines <b>${moi.rang}<sup>${moi.rang > 1 ? "e" : "er"}</sup></b> sur ${cls.length} avec <b>${moi.total} points</b> et ${moi.nids} nids au total.</p>` : "") +
    `<p>Merci d'avoir programmé ta tortue 🐢</p>`, true);
}

// ---------------------------------------------------------------------
//  Démarrage
// ---------------------------------------------------------------------
if (!LIBRE) {
  majInfo(); majEnvoi();
  await synchroniserHorloge();
  await rafraichir(true);
  setInterval(rafraichir, 2000);
  await recupererDerniereTortue();
  assurerCodePerso().then((c) => {
    const vu = `lagon:vuCode:${SALLE}:${PSEUDO}`;
    if (c && !store.get(vu)) { store.set(vu, 1); setTimeout(() => toast("🏠 Pour te reconnecter depuis un autre ordinateur (chez toi…), note ton code de session : bouton « 🏠 Mon code de session » en haut."), 2500); }
  });
} else {
  tester();
}
