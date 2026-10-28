// =====================================================================
//  Lagon Arena — élève : le BAC À SABLE
//   • ▶ Tester : ma tortue contre les tortues d'entraînement, dans un NOUVEAU lagon à chaque fois ;
//   • 🔁 Rejouer ce lagon : le même lagon (pour vérifier une correction) ;
//   • 📊 Estimer : le nombre d'œufs MOYEN sur plusieurs parties, sans les afficher (mode léger).
// =====================================================================
import { simulate, BOTS, BOT_PIRATE, TWISTS } from "../engine.js";
import { MatchViewer, rapportHTML, tableauMatch } from "../viewer.js";
import { estAvance, estEquipe } from "../primitives.js";
import { $, el, esc, toast, store } from "../common.js";
import { ed, verifier } from "./editeur.js";
import { S, LIBRE, SALLE, PSEUDO, couleur, configActuelle, configProchaine } from "./etat.js";

const BOT_COUL = ["#c9d6df", "#9fb3c2", "#e0e6eb", "#b3c4d1", "#d6dee5"];
let graineSB = null, viewerSB = null;

// la nouveauté : celle de la manche en cours (salle), ou choisie (bac à sable seul)
let twistLibre = store.get("lagon:twistLibre", "calme");
const twistActuel = () => (LIBRE ? twistLibre : S.salle && S.salle.manche > 0 ? S.salle.nouveaute : "calme");
const selT = $("#sel-twist");
for (const [k, T] of Object.entries(TWISTS)) selT.append(el("option", { value: k, selected: k === twistLibre }, `${T.icone} ${T.nom}`));
selT.addEventListener("change", () => { twistLibre = selT.value; store.set("lagon:twistLibre", twistLibre); majTwistSB(); tester(); });
export function majTwistSB() { const T = TWISTS[twistActuel()]; $("#sb-twist").textContent = `nouveauté : ${T.icone} ${T.nom}`; }
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

export function tester(memeLagon = false) {
  const c = verifier();
  if (!c.ok) { toast("Corrige d'abord l'erreur de ton code (en rouge).", "err"); return; }
  if (!memeLagon || graineSB == null) graineSB = 1 + Math.floor(Math.random() * 2e9);
  $("#autre").disabled = false;
  const sim = simulate({ joueurs: joueursSB(), graine: graineSB, twist: twistActuel() });
  if (viewerSB) viewerSB.destroy();
  viewerSB = new MatchViewer($("#sb-vue"), { sim, focus: "moi", code: ed.value, vitesse: 5 });
  const r = sim.resultats.find((x) => x.id === "moi");
  $("#sb-res").innerHTML = `<div class="sep"></div><h3>Résultat : ${r.nids} nid${r.nids > 1 ? "s" : ""} · ${r.rang}<sup>${r.rang > 1 ? "e" : "re"}</sup> sur ${sim.resultats.length}</h3>` +
    rapportHTML(sim, "moi") + `<details><summary>Classement du test</summary>${tableauMatch(sim, "moi", (id) => id.startsWith("Bot-"))}</details>`;
}
$("#tester").addEventListener("click", () => tester());
$("#autre").addEventListener("click", () => tester(true));

// ---------------------------------------------------------------------
//  Estimation : toujours les mêmes lagons (graines fixes), pour comparer deux versions de son code
// ---------------------------------------------------------------------
let estimEnCours = false;
const cleEstim = "lagon:estimations";
const virgule = (x, d = 1) => x.toFixed(d).replace(".", ",");
const moyenne = (l) => l.reduce((a, b) => a + b, 0) / l.length;

async function estimer() {
  if (estimEnCours) return;
  const c = verifier();
  if (!c.ok) { toast("Corrige d'abord l'erreur de ton code (en rouge).", "err"); return; }
  const n = parseInt($("#nb-estim").value, 10) || 20, twist = twistActuel(), code = ed.value;
  const joueurs = joueursSB(), box = $("#estim-res"), btn = $("#estimer");
  estimEnCours = true; btn.disabled = true;
  box.innerHTML = `<div class="jauge"><div id="estim-jg" style="width:0"></div></div><p class="petit muted" id="estim-txt">Partie 0 / ${n}…</p>`;
  const par = {};   // id -> { nom, nids:[], captures, plastiques, epuisee }
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
  afficherEstimation(box, par, { n, twist, code });
}
$("#estimer").addEventListener("click", estimer);

function afficherEstimation(box, par, { n, twist, code }) {
  const moi = par.moi, m = moyenne(moi.nids);
  const max = Math.max(...moi.nids), zero = moi.nids.filter((x) => x === 0).length;
  const histo = Array.from({ length: max + 1 }, (_, k) => moi.nids.filter((x) => x === k).length);
  const hmax = Math.max(...histo);
  const bots = Object.entries(par).filter(([id]) => id !== "moi").map(([, p]) => ({ nom: p.nom, m: moyenne(p.nids) }));
  const classes = [...bots, { nom: "Ta tortue", m, moi: true }].sort((a, b) => b.m - a.m);
  // mémoire : les estimations précédentes (même nouveauté, même nombre de parties, même salle)
  const memeSerie = (h) => h.twist === twist && h.n === n && h.salle === (SALLE || "");
  const hist = store.get(cleEstim, []).filter(memeSerie);
  const avant = hist[hist.length - 1];
  const memeCode = avant && avant.code === code;
  if (!memeCode) hist.push({ twist, n, salle: SALLE || "", m, code, quand: Date.now() });
  store.set(cleEstim, store.get(cleEstim, []).filter((h) => !memeSerie(h)).concat(hist.slice(-6)).slice(-30));
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
