// =====================================================================
//  Lagon Arena — écran élève : programmer, tester, envoyer, comprendre
// =====================================================================
import { db, MODE, synchroniserHorloge, secondesRestantes } from "./db.js";
import { simulate, BOTS, BOT_PIRATE, CODE_DEPART, TWISTS, BONUS_PROGRESSION, EQUIPES } from "./engine.js";
import { check } from "./interp.js";
import { CodeEditor, boiteOutils } from "./editor.js";
import { coupDePouceHTML } from "./pouce.js";
import { RAPPELS, estAvance, setAvance, setEquipe, estEquipe } from "./primitives.js";
import { MatchViewer, rapportHTML, tableauMatch } from "./viewer.js";
import { lancerSimulation, codeDe, estBot, infosManche, classementCumule, POINTS_EQUIPE } from "./brawl.js";
import { $, $$, el, esc, toast, store, mmss, AIDE_HTML, twistCarte, activerCopie } from "./common.js";

const q = new URLSearchParams(location.search);
const SALLE = (q.get("salle") || "").toUpperCase();
const LIBRE = q.has("libre") || !SALLE;
const PSEUDO = q.get("pseudo") || "";
const JETON = LIBRE ? null : store.get(`lagon:jeton:${SALLE}:${PSEUDO}`);
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
let salle = null, graineSB = store.get("lagon:graineSB", 1234), viewerSB = null;
let twistLibre = store.get("lagon:twistLibre", "calme");
const twistActuel = () => (LIBRE ? twistLibre : salle && salle.manche > 0 ? salle.nouveaute : "calme");
const selT = $("#sel-twist");
for (const [k, T] of Object.entries(TWISTS)) selT.append(el("option", { value: k, selected: k === twistLibre }, `${T.icone} ${T.nom}`));
selT.addEventListener("change", () => { twistLibre = selT.value; store.set("lagon:twistLibre", twistLibre); majTwistSB(); tester(); });
function majTwistSB() { const T = TWISTS[twistActuel()]; $("#sb-twist").textContent = `nouveauté : ${T.icone} ${T.nom}`; }
majTwistSB();

function tester() {
  const c = verifier();
  if (!c.ok) { toast("Corrige d'abord l'erreur de ton code (en rouge).", "err"); return; }
  const bots = estAvance() ? [...BOTS, BOT_PIRATE] : BOTS;   // en mode avancé, la Pirate pousse les autres tortues !
  const joueurs = [{ id: "moi", nom: LIBRE ? "Ta tortue" : PSEUDO, couleur, code: ed.value },
    ...bots.map((b, i) => ({ id: "Bot-" + b.nom, nom: b.nom + " 🤖", couleur: BOT_COUL[i % BOT_COUL.length], code: b.code }))];
  if (estEquipe()) joueurs.forEach((j, i) => { j.equipe = i % 2 === 0 ? 1 : 2; });   // manche en équipes : on s'entraîne aussi en équipes
  const sim = simulate({ joueurs, graine: graineSB, twist: twistActuel() });
  if (viewerSB) viewerSB.destroy();
  viewerSB = new MatchViewer($("#sb-vue"), { sim, focus: "moi", code: ed.value, vitesse: 5 });
  const r = sim.resultats.find((x) => x.id === "moi");
  $("#sb-res").innerHTML = `<div class="sep"></div><h3>Résultat : ${r.nids} nid${r.nids > 1 ? "s" : ""} · ${r.rang}<sup>${r.rang > 1 ? "e" : "re"}</sup> sur ${sim.resultats.length}</h3>` +
    rapportHTML(sim, "moi") + `<details><summary>Classement du test</summary>${tableauMatch(sim, "moi", (id) => id.startsWith("Bot-"))}</details>`;
}
$("#tester").addEventListener("click", tester);
$("#rejouer").addEventListener("click", () => { onglet("res"); const b = $("#etsi"); if (b) { b.click(); $("#etsi-res").scrollIntoView({ behavior: "smooth", block: "center" }); } });
$("#autre").addEventListener("click", () => { graineSB = 1 + Math.floor(Math.random() * 1e6); store.set("lagon:graineSB", graineSB); tester(); });

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
  const envoye = dernierEnvoi && dernierEnvoi.manche === salle.manche;
  if (envoye && dernierEnvoi.code === ed.value) {
    b.textContent = "📤 Renvoyer";
    box.innerHTML = `<div class="msg ok">✅ Tortue envoyée pour la manche ${salle.manche} (à ${heureCourte(dernierEnvoi.at)}). Tu peux encore l'améliorer et la renvoyer avant la fin du chrono.</div>`;
  } else if (envoye) {
    b.textContent = "📤 Renvoyer"; b.classList.add("pulse");
    box.innerHTML = `<div class="msg warn">⚠️ Tu as modifié ton code depuis l'envoi. Renvoie-la, sinon c'est l'<b>ancienne version</b> qui jouera.</div>`;
  } else {
    b.textContent = "📤 Envoyer ma tortue"; b.classList.add("pulse");
    box.innerHTML = `<div class="msg warn">⏳ Pas encore envoyée. Si tu n'envoies rien, c'est ta tortue précédente (ou la tortue de départ) qui jouera.</div>`;
  }
}

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
  info.append(el("span", { class: "pill" }, "🔑 " + SALLE),
    el("span", { class: "pill" }, el("span", { class: "dot", style: `background:${couleur}` }), PSEUDO));
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
  if (c.participants) morceaux.push(c.participants.includes(PSEUDO) ? "✅ tu joues" : "👀 tu regardes");
  let html = `<div class="carte-manche">${prochaine ? `<b>📣 Prochaine manche : ${esc(titreManche(c))}</b>` : ""}${morceaux.length ? `<div>${morceaux.join(" · ")}</div>` : ""}`;
  if (c.mode === "equipes") {
    const eq = c.equipes || {}, mienne = eq[PSEUDO];
    const noms = (e) => Object.keys(eq).filter((p) => eq[p] === e && p !== PSEUDO).map(esc).join(", ") || "—";
    html += mienne
      ? `<div class="mon-equipe eq${mienne}">👥 Tu es dans l'équipe <b>${EQUIPES[mienne].icone} ${EQUIPES[mienne].nom}</b> avec : <b>${noms(mienne)}</b>.<br>
         Adversaires ${EQUIPES[3 - mienne].icone} : ${noms(3 - mienne)}.<br>
         <span class="petit">Seul le <b>score de l'équipe</b> compte (moyenne des nids). Mettez-vous d'accord sur une stratégie ! Nouvelles primitives : <code>donner()</code>, <code>equipiere_fatiguee()</code>…</span></div>`
      : c.participants && !c.participants.includes(PSEUDO)
        ? `<div class="mon-equipe">👥 Manche en équipes : ${EQUIPES[1].icone} ${noms(1)} contre ${EQUIPES[2].icone} ${noms(2)}. Tu ne joues pas cette manche : observe leurs stratégies !</div>`
        : `<div class="mon-equipe">👥 Manche en équipes : ton enseignant va t'ajouter à une équipe.</div>`;
    if (annoncer && mienne) toast(`👥 Tu es dans l'équipe ${EQUIPES[mienne].icone} ${EQUIPES[mienne].nom} !`);
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
  const sim = lancerSimulation(salle, m, info.pseudos, joueurs, tortues, info.twist, null, info.equipes);
  const joue = info.pseudos.includes(PSEUDO);
  const moi = scores.find((s) => s.manche === m && s.pseudo === PSEUDO);
  const nbH = info.pseudos.filter((p) => !estBot(p)).length;
  const avant = scores.filter((s) => s.pseudo === PSEUDO && s.manche < m && !s.duel).sort((a, b) => b.manche - a.manche)[0];
  const monCode = codeDe(PSEUDO, m, tortues);
  const titre = `📊 Manche ${m}${info.equipes ? " 👥" : ""}${info.duel ? " (hors classement)" : ""}`;
  const E = sim.equipes;

  let bloc;
  if (joue && moi && E) {
    const e = moi.equipe, res = E.gagnant === 0 ? "egalite" : E.gagnant === e ? "gagne" : "perd";
    bloc = `<div class="mon-equipe eq${e}"><b>${res === "gagne" ? "🏆 Victoire" : res === "perd" ? "😕 Défaite" : "🤝 Égalité"}</b> de ton équipe ${EQUIPES[e].icone} ${EQUIPES[e].nom} !</div>
      <div class="duel-eq" style="margin:10px 0">${[1, 2].map((k) => `<div class="e${k}">${EQUIPES[k].icone} ${EQUIPES[k].nom}<b>${E[k].nids} 🥚</b><small>moyenne ${E[k].moyenne.toFixed(2)}</small></div>`).join('<div class="vs">VS</div>')}</div>
      <div class="bigscore"><div class="bloc"><b>${moi.nids}</b>nid${moi.nids > 1 ? "s" : ""} pour ton équipe</div>${info.duel ? "" : `<div class="bloc"><b>+${moi.points}</b>points</div>`}</div>
      <p class="petit muted">En équipes, chaque élève de l'équipe gagnante marque ${POINTS_EQUIPE.gagne} points (perdante : ${POINTS_EQUIPE.perd}, égalité : ${POINTS_EQUIPE.egalite}).</p>
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
    const sim2 = lancerSimulation(salle, m, info.pseudos, joueurs, tortues, info.twist, { pseudo: PSEUDO, code: ed.value }, info.equipes);
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
} else {
  tester();
}
