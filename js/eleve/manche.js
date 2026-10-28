// =====================================================================
//  Lagon Arena — élève : suivre la SALLE (toutes les 2 secondes) et réagir aux changements de phase
//    attente → programmation → brawl → résultats → … → fin
// =====================================================================
import { db, MODE } from "../db.js";
import { TWISTS, styleEquipe } from "../engine.js";
import { setEquipe } from "../primitives.js";
import { $, el, esc, toast, twistCarte, nomEquipe } from "../common.js";
import { S, SALLE, PSEUDO, couleur, configActuelle, configProchaine, titreManche, estFinaliste } from "./etat.js";
import { onglet, bandeau, overlay } from "./ui.js";
import { majTwistSB } from "./bac.js";
import { majEnvoi } from "./envoi.js";
import { chargerResultats } from "./resultats.js";
import { montrerCodeSession } from "./session.js";

// la barre du haut : salle, pseudo, code de session, manche
export function majInfo() {
  const info = $("#info"); info.innerHTML = "";
  const bCode = el("button", { class: "pill pill-btn", title: "Pour continuer sur un autre ordinateur (à la maison…)" }, "🏠 Mon code de session");
  bCode.addEventListener("click", montrerCodeSession);
  info.append(el("span", { class: "pill" }, "🔑 " + SALLE),
    el("span", { class: "pill" }, el("span", { class: "dot", style: `background:${couleur}` }), PSEUDO), bCode);
  if (S.salle && S.salle.manche > 0) info.append(el("span", { class: "pill" }, titreManche()));
  if (MODE === "demo") info.append(el("span", { class: "pill mode-demo" }, "Mode démo"));
}

let etatCle = "", cfgCle = "", twCle = "";
export async function rafraichir(premier = false) {
  try {
    const s = await db.salle(SALLE);
    if (!s) { overlay(`<div class="emoji">🤷</div><h2>Salle introuvable</h2><p>La salle ${esc(SALLE)} n'existe plus.</p><a class="btn" href="index.html">Retour à l'accueil</a>`); return; }
    S.salle = s;
    $("#info").classList.remove("hors-ligne");
  } catch { $("#info").classList.add("hors-ligne"); return; }
  const s = S.salle, cle = s.manche + "/" + s.phase + "/" + (s.duel || []).join(",");
  if (cle !== etatCle) { etatCle = cle; cfgCle = JSON.stringify(s.config || null); twCle = s.nouveaute; await changementPhase(premier); return; }
  if (s.nouveaute !== twCle) {   // l'enseignant a changé la nouveauté pendant une manche longue
    twCle = s.nouveaute; afficherNouveaute(); majTwistSB();
    const T = TWISTS[s.nouveaute] || TWISTS.calme;
    toast(`🌊 Nouveauté de la manche : ${T.icone} ${T.nom}`);
  }
  if (JSON.stringify(s.config || null) !== cfgCle) { cfgCle = JSON.stringify(s.config || null); majCarteManche(true); }
}

async function changementPhase(premier) {
  const s = S.salle;
  majInfo(); majTwistSB();
  const T = TWISTS[s.nouveaute] || TWISTS.calme;
  afficherNouveaute();
  overlay(null);
  switch (s.phase) {
    case "attente":
      bandeau("⏳ <b>La partie va bientôt commencer.</b> En attendant, prépare ta tortue et teste-la dans le bac à sable !"); break;
    case "prog":
      if (premier && s.manche > 1 && !S.dernierEnvoi && !s.duel) toast("🆕 La partie a déjà commencé : programme ta tortue et envoie-la, elle jouera au prochain brawl !");
      if (s.duel && !estFinaliste()) bandeau(`⭐ <b>${esc(titreManche())}</b> : ${s.duel.map(esc).join(", ")} préparent leur tortue. Toi, tu peux continuer à t'entraîner !`);
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
  if (premier && s.phase !== "resultats" && s.phase !== "fin") await chargerResultats(false);
  majEnvoi();
}

// la nouveauté de la manche en cours, puis la carte « manche »
function afficherNouveaute() {
  const s = S.salle;
  $("#twist").innerHTML = "";
  if (s.manche > 0 && s.phase !== "fin") $("#twist").append(el("div", { class: "petit muted" }, `Nouveauté (${titreManche()}) :`), twistCarte(s.nouveaute));
  $("#twist").append(el("div", { id: "manche-info" }));
  majCarteManche();
}

// la carte « manche » : nouveauté, points, temps illimité… et MON ÉQUIPE (pour préparer une stratégie)
function majCarteManche(annoncer = false) {
  const box = $("#manche-info"); if (!box) return;
  const s = S.salle, c = ["prog", "brawl"].includes(s.phase) ? configActuelle() : configProchaine();
  setEquipe(!!(c && c.mode === "equipes"));
  if (!c) { box.innerHTML = ""; return; }
  const prochaine = c.manche !== s.manche;
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
