// =====================================================================
//  Lagon Arena — élève : RÉSULTATS du dernier brawl (rejeu, rapport, « Et si… ? ») et CLASSEMENT
// =====================================================================
import { db } from "../db.js";
import { TWISTS, BONUS_PROGRESSION, styleEquipe } from "../engine.js";
import { MatchViewer, rapportHTML, tableauMatch } from "../viewer.js";
import { lancerSimulation, codeDe, estBot, infosManche, classementCumule, baremeEquipes } from "../brawl.js";
import { $, el, esc, toast, store, cartesEquipesHTML, nomEquipe, placeTxt } from "../common.js";
import { ed, verifier, remplacerCode } from "./editeur.js";
import { S, SALLE, PSEUDO, cleCode } from "./etat.js";
import { onglet, notifier, overlay } from "./ui.js";

let resAffiches = "", viewerRes = null;
export async function chargerResultats(montrer) {
  let scores, tortues, joueurs;
  try { [scores, tortues, joueurs] = await Promise.all([db.scores(SALLE), db.tortues(SALLE), db.joueurs(SALLE)]); }
  catch (e) { toast(e.message, "err"); return; }
  // première connexion sur ce poste (base pas à jour) : on reprend le dernier code visible
  if (!store.get(cleCode) && tortues.some((t) => t.pseudo === PSEUDO)) remplacerCode(codeDe(PSEUDO, 999, tortues));
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
    if (S.salle.phase === "fin") montrerFin(scores);
  }
}

function afficherResultats(info, scores, tortues, joueurs) {
  const m = info.manche, T = TWISTS[info.twist] || TWISTS.calme;
  const sim = lancerSimulation(S.salle, m, info.pseudos, joueurs, tortues, info.twist, null, info.equipes, info.version);
  const joue = info.pseudos.includes(PSEUDO);
  const moi = scores.find((s) => s.manche === m && s.pseudo === PSEUDO);
  const titre = `📊 Manche ${m}${info.equipes ? " 👥" : ""}${info.duel ? " (hors classement)" : ""}`;
  const bloc = joue && moi ? (sim.equipes ? blocEquipe(sim, moi, info) : blocSolo(sim, moi, info, scores)) + `<h3>🔍 Ce qu'a fait ta tortue</h3>${rapportHTML(sim, PSEUDO)}`
    : info.duel ? `<p>Ce match était le duel des finalistes. Regarde-le quand même : que font les meilleures tortues ?</p>`
    : `<p>🆕 Tu es arrivé·e après ce match : ta tortue n'y était pas. Regarde-le quand même (que font les meilleures tortues ?) : <b>ta tortue jouera au prochain brawl</b>.</p>`;
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
  viewerRes = new MatchViewer($("#res-vue"), { sim, focus: joue ? PSEUDO : null, code: codeDe(PSEUDO, m, tortues), autoplay: false, vitesse: 2.4 });
  $("#rejouer").classList.toggle("cache", !joue);
  if (!joue) return;
  $("#modifier").addEventListener("click", () => { onglet("prog"); ed.ta.focus(); });
  $("#etsi").addEventListener("click", () => etSi(sim, info, joueurs, tortues));
}

function blocEquipe(sim, moi, info) {
  const E = sim.equipes, e = moi.equipe, x = E[e] || { rang: 0, exaequo: 1 }, ne = `<b>${nomEquipe(e)}</b>`;
  const verdict = x.rang === 1 && x.exaequo === 1 ? `🏆 Victoire de ton équipe ${ne} !`
    : x.rang === 1 ? `🤝 Ton équipe ${ne} est à égalité en tête !`
    : E.nb === 2 ? `😕 Défaite de ton équipe ${ne}…`
    : `${["🥈", "🥉"][x.rang - 2] || "🏅"} Ton équipe ${ne} finit ${placeTxt(x.rang)}${x.exaequo > 1 ? " (ex æquo)" : ""} sur ${E.nb}.`;
  return `<div class="mon-equipe" style="${styleEquipe(e)}">${verdict}</div>
    <div style="margin:10px 0">${cartesEquipesHTML(E, { moi: e })}</div>
    <div class="bigscore"><div class="bloc"><b>${moi.nids}</b>nid${moi.nids > 1 ? "s" : ""} pour ton équipe</div>${info.duel ? "" : `<div class="bloc"><b>+${moi.points}</b>points</div>`}</div>
    <p class="petit muted">En équipes, chaque élève marque les points du rang de son équipe : ${baremeEquipes(E.nb).join(" / ")} (des équipes à égalité se partagent les points).</p>`;
}

function blocSolo(sim, moi, info, scores) {
  const m = info.manche, nbH = info.pseudos.filter((p) => !estBot(p)).length;
  const avant = scores.filter((s) => s.pseudo === PSEUDO && s.manche < m && !s.duel).sort((a, b) => b.manche - a.manche)[0];
  const prog = avant && !info.duel ? `<p class="progres">${moi.nids > avant.nids ? "📈" : moi.nids < avant.nids ? "📉" : "➖"} Manche ${avant.manche} : ${avant.nids} nid${avant.nids > 1 ? "s" : ""} → manche ${m} : <b>${moi.nids} nid${moi.nids > 1 ? "s" : ""}</b>${moi.bonus ? ` · <b>bonus progrès +${moi.bonus}</b> 🎉` : ""}</p>` : "";
  return `<div class="bigscore">
      <div class="bloc"><b>${moi.rang}<sup>${moi.rang > 1 ? "e" : "er"}</sup></b>sur ${nbH} élève${nbH > 1 ? "s" : ""}</div>
      <div class="bloc"><b>${moi.nids}</b>nid${moi.nids > 1 ? "s" : ""} 🥚</div>
      ${info.duel ? "" : `<div class="bloc"><b>+${moi.points + moi.bonus}</b>points</div>`}
    </div>${prog}`;
}

// « Et si… ? » : rejouer EXACTEMENT le même match avec le code actuel de l'éditeur
function etSi(sim, info, joueurs, tortues) {
  const c = verifier();
  if (!c.ok) { toast("Corrige d'abord l'erreur de ton code.", "err"); return; }
  const sim2 = lancerSimulation(S.salle, info.manche, info.pseudos, joueurs, tortues, info.twist, { pseudo: PSEUDO, code: ed.value }, info.equipes, info.version);
  const a = sim.resultats.find((r) => r.id === PSEUDO), b = sim2.resultats.find((r) => r.id === PSEUDO);
  const fleche = b.nids > a.nids ? "📈" : b.nids < a.nids ? "📉" : "➖";
  $("#etsi-res").innerHTML = `<div class="compare" style="margin-top:12px">
      <div class="bloc-c"><div class="petit muted">Pendant le match</div><b>${a.nids} 🥚</b><div>${a.captures} × 🦈</div></div>
      <div class="fleche">${fleche}</div>
      <div class="bloc-c"><div class="petit muted">Avec ton nouveau code</div><b>${b.nids} 🥚</b><div>${b.captures} × 🦈</div></div></div>
      ${rapportHTML(sim2, PSEUDO)}
      <p class="petit">${S.salle.phase === "prog" ? "👉 Si c'est mieux, n'oublie pas d'<b>envoyer</b> ta tortue !" : "👉 Garde ce code : tu pourras l'envoyer à la prochaine manche."}</p>`;
  const voir = el("button", { class: "btn small ghost" }, "🎬 Voir ce match dans le lecteur");
  voir.addEventListener("click", () => { viewerRes.destroy(); viewerRes = new MatchViewer($("#res-vue"), { sim: sim2, focus: PSEUDO, code: ed.value, vitesse: 2.4 }); $("#res-vue").scrollIntoView({ behavior: "smooth" }); });
  $("#etsi-res").append(voir);
}
// raccourci depuis l'onglet Programmer : « 🔁 Rejouer le dernier brawl »
$("#rejouer").addEventListener("click", () => { onglet("res"); const b = $("#etsi"); if (b) { b.click(); $("#etsi-res").scrollIntoView({ behavior: "smooth", block: "center" }); } });

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
