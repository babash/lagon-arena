// =====================================================================
//  Lagon Arena — enseignant : les SCÈNES projetées au tableau, selon la phase de la salle
//    attente → programmation → brawl → résultats → … → fin
// =====================================================================
import { db, secondesRestantes } from "../db.js";
import { TWISTS, BONUS_PROGRESSION, equipeInfo, resultatEquipes } from "../engine.js";
import { MatchViewer } from "../viewer.js";
import { botsPourCompleter, lancerSimulation, calculerScores, classementCumule, meilleureProgression, estBot, infosManche, equipesCompletes } from "../brawl.js";
import { $, el, esc, toast, mmss, twistCarte, cartesEquipesHTML, annonceEquipes } from "../common.js";
import { S, reglages, configActuelle, titreManche, participantsHumains, estIllimite, piloter, navigation } from "./etat.js";
import { chargerPrep, panneauPrep, rostersHTML } from "./preparer.js";
import { lienEleves, dessinerQR, adresseCourte, fenetreLienEleves } from "./liens.js";

// dessine la scène de la phase en cours
export function rendreScene() {
  if (S.viewer) { S.viewer.destroy(); S.viewer = null; }
  clearInterval(S.chrono);
  const st = $("#stage");
  const l = $(".prof-layout"); if (l) l.classList.toggle("plein", S.salle.phase === "brawl");
  ({ attente: scAttente, prog: scProg, brawl: scBrawl, resultats: scResultats, fin: scFin })[S.salle.phase](st);
}

// ---------- attente : le code de la salle en grand, et la préparation de la manche 1 ----------
function scAttente(st) {
  st.innerHTML = `<div class="stage-centre">
    <h2 class="titre-scene">🌊 Rejoignez le lagon !</h2>
    <p class="consigne">1. Allez sur <b>${esc(adresseCourte())}</b><br>2. Tapez le code :</p>
    <div class="code-salle geant">${S.code}</div>
    <div id="qr" class="qr cache"></div>
    <p class="consigne"><b id="nb-grand">${S.joueurs.length}</b> élève(s) connecté(s)</p>
    <p class="row centre"><button class="btn ghost" id="lien-acces">🔗 Lien d'accès à donner aux élèves</button></p>
    <p class="petit muted">Conseil : laissez d'abord 10 à 15 minutes aux élèves pour le tutoriel (bouton « Commencer le tutoriel » sur l'accueil).</p>
  </div>
  <div id="prep"></div>`;
  dessinerQR($("#qr"), lienEleves());
  $("#lien-acces").addEventListener("click", () => fenetreLienEleves());
  chargerPrep(1, []);
  panneauPrep($("#prep"), []);
}

// ---------- programmation ----------
function scProg(st) {
  const T = TWISTS[S.salle.nouveaute] || TWISTS.calme;
  const c = configActuelle() || {};
  const liste = participantsHumains();
  st.innerHTML = `<div class="stage-centre">
    <h2 class="titre-scene">⌨️ ${esc(titreManche())} : programmez vos tortues !</h2>
    ${c.coef === 2 ? `<p class="consigne"><span class="pill or-pill">⭐ Points doubles</span></p>` : c.coef === 0 ? `<p class="consigne"><span class="pill sombre">Hors classement</span></p>` : ""}
    ${S.salle.duel ? `<p class="consigne">Jouent : <b>${S.salle.duel.map(esc).join(" · ")}</b></p>` : ""}
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
  $("#tw").append(twistCarte(S.salle.nouveaute));
  $("#plus").addEventListener("click", () => {
    const r = Math.max(0, secondesRestantes(S.salle.fin_chrono) || 0);
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
    const r = secondesRestantes(S.salle.fin_chrono);
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
  tick(); S.chrono = setInterval(tick, 250);
  majEnvois();
}

export function majEnvois() {
  const e = $("#nb-env"); if (!e) return;
  const humains = participantsHumains(), env = new Set(S.depots.map((d) => d.pseudo));
  const n = humains.filter((p) => env.has(p)).length;
  e.textContent = n; $("#nb-tot").textContent = humains.length;
  $("#jg").style.width = (humains.length ? 100 * n / humains.length : 0) + "%";
}

let brawlEnCours = false;
async function demarrerBrawl() {
  if (brawlEnCours) return;
  const r = secondesRestantes(S.salle.fin_chrono);
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
  try { [tortues, scores, S.joueurs] = await Promise.all([db.tortues(S.code), db.scores(S.code), db.joueurs(S.code)]); }
  catch (e) { toast(e.message, "err"); return; }
  const m = S.salle.manche, c = configActuelle() || {};
  // participants : élèves (ou ceux choisis par l'enseignant) + tortues d'entraînement 🤖
  // seulement pour compléter le lagon jusqu'au minimum (8 par défaut)
  let pseudos = participantsHumains();
  pseudos = [...pseudos, ...botsPourCompleter(pseudos.length, c.bots ?? reglages.min)];
  if (!pseudos.length) { toast("Aucune tortue dans le lagon !", "err"); return; }
  const equipes = c.mode === "equipes" ? equipesCompletes(pseudos, c.equipes || {}, c.nbEquipes) : null;
  const sim = lancerSimulation(S.salle, m, pseudos, S.joueurs, tortues, S.salle.nouveaute, null, equipes);
  const T = TWISTS[S.salle.nouveaute] || TWISTS.calme;
  st.innerHTML = `<div class="brawl-grid">
    <div><h2 class="titre-scene gauche">🎬 ${esc(titreManche())} · ${T.icone} ${esc(T.nom)}</h2><div id="vue"></div></div>
    <div class="cote-brawl">
      ${equipes ? `<div class="card score-equipes" id="score-eq"></div>` : ""}
      <div class="card"><h3>🏆 En direct</h3><ol class="live-rank" id="live"></ol></div>
      <div class="card"><h3>📣 Le fil du match</h3><ul class="feed" id="feed"></ul></div>
      <button class="btn big or" id="fini" style="width:100%;justify-content:center;margin-top:12px">⏭ Voir les résultats</button>
    </div></div>`;
  S.viewer = new MatchViewer($("#vue"), { sim, pensee: false, vitesse: 2.4, autoplay: false, marqueurs: [] });
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
  S.viewer.player.onTick = (t) => { S.viewer.onTick(t); majDirect(t); };
  majDirect(0);
  let fini = false;
  const terminer = async () => {
    if (fini) return; fini = true;
    $("#fini").disabled = true;
    const res = calculerScores(sim, m, scores, { coef: c.coef ?? (S.salle.duel ? 0 : 1) });
    try {
      await db.enregistrerScores(S.code, S.secret, m, res);
      await piloter({ phase: "resultats" });
    } catch (e) { toast(e.message, "err"); fini = false; $("#fini").disabled = false; }
  };
  S.viewer.player.onEnd = () => setTimeout(terminer, 2500);
  $("#fini").addEventListener("click", terminer);
  // petit compte à rebours avant le départ
  const box = $("#vue .lagon-box");
  const cd = el("div", { class: "decompte" }, "3"); box.append(cd);
  const v = S.viewer;
  for (const n of ["3", "2", "1", "🐢 GO !"]) { cd.textContent = n; await new Promise((r) => setTimeout(r, 700)); }
  cd.remove();
  if (S.viewer === v && v) v.player.play();   // (sauf si l'enseignant a déjà passé aux résultats)
}

// ---------- résultats d'une manche ----------
async function scResultats(st) {
  let scores, tortues;
  try { [scores, tortues, S.joueurs] = await Promise.all([db.scores(S.code), db.tortues(S.code), db.joueurs(S.code)]); }
  catch (e) { toast(e.message, "err"); return; }
  const info = infosManche(scores, S.salle.manche);
  if (!info) { st.innerHTML = `<p>Pas de scores pour cette manche.</p>`; return; }
  const T = TWISTS[info.twist] || TWISTS.calme;
  const sm = scores.filter((s) => s.manche === info.manche && !estBot(s.pseudo)).sort((a, b) => a.rang - b.rang || b.nids - a.nids);
  const sim = lancerSimulation(S.salle, info.manche, info.pseudos, S.joueurs, tortues, info.twist, null, info.equipes, info.version);
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
        ${sm.map((s) => `<tr><td class="num">${E ? s.equipe ? equipeInfo(s.equipe).icone : "" : s.rang}</td><td><span class="swatch" style="background:${(S.joueurs.find((j) => j.pseudo === s.pseudo) || {}).couleur || "#ccc"}"></span>${esc(s.pseudo)}</td><td class="num">${s.nids}</td><td class="num">${cap[s.pseudo] ?? "–"}</td><td class="num">${info.duel ? "–" : s.points + (s.bonus ? ` <small class="bonus">+${s.bonus}</small>` : "")}</td></tr>`).join("")}
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
    if (S.viewer) S.viewer.destroy();
    S.viewer = new MatchViewer($("#replay"), { sim, pensee: false, vitesse: 5, marqueurs: [] });
    $("#replay").scrollIntoView({ behavior: "smooth" });
  });
  const bFin = el("button", { class: "btn sombre" }, "🏁 Terminer la séance");
  bFin.addEventListener("click", () => { if (confirm("Terminer la séance et afficher le podium final ?")) piloter({ phase: "fin" }).catch((e) => toast(e.message, "err")); });
  act.append(bRevoir, bFin);
  chargerPrep(S.salle.manche + 1, scores);
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
  try { scores = await db.scores(S.code); } catch (e) { toast(e.message, "err"); return; }
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
  $("#nouvelle").addEventListener("click", () => navigation.accueil());
}
function exporterCSV(cls) {
  const manches = [...new Set(cls.flatMap((t) => Object.keys(t.parManche).map(Number)))].sort((a, b) => a - b);
  const lignes = [["Rang", "Pseudo", ...manches.flatMap((m) => [`M${m} nids`, `M${m} points`]), "Bonus", "Nids total", "Total points"]];
  for (const t of cls) lignes.push([t.rang, t.pseudo, ...manches.flatMap((m) => { const s = t.parManche[m]; return s ? [s.nids, s.points] : ["", ""]; }), t.bonus, t.nids, t.total]);
  const csv = "﻿" + lignes.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const a = el("a", { href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })), download: `lagon-arena-${S.code}-${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.append(a); a.click(); a.remove();
}
