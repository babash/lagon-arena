// =====================================================================
//  Lagon Arena — enseignant : PRÉPARER LA MANCHE SUIVANTE (réglée à la main)
//  Les réglages sont publiés tout de suite : les élèves voient la nouveauté, les points…
//  et leur équipe, pour préparer une stratégie AVANT la manche.
// =====================================================================
import { db } from "../db.js";
import { TWISTS, TWIST_ORDER, TWIST_DUEL, MAX_EQUIPES, equipeInfo, styleEquipe, LAGON_REGLAGES, normaliserLagon, decrireLagon } from "../engine.js";
import { classementCumule, baremeEquipes } from "../brawl.js";
import { $, esc, toast, store, nomEquipe } from "../common.js";
import { S, reglages, configActuelle, piloter, DUREE_ILLIMITEE } from "./etat.js";
import { envoyerFaux } from "./demo.js";
import { fenetreLienEleves } from "./liens.js";

let prep = null, publierTimer = null, scoresPrep = [], selection = null, lagonOuvert = false;
const clePrep = () => "lagon:prep:" + S.code;
function prepDefaut(manche, scores) {
  const nb = new Set(scores.filter((x) => !x.duel).map((x) => x.manche)).size;
  return { manche, nouveaute: TWIST_ORDER[Math.min(TWIST_ORDER.length - 1, nb)], duree: manche === 1 ? reglages.duree1 : reglages.duree,
    coef: 1, bots: reglages.min, qui: "tous", participants: [], mode: "solo", equipes: {}, nbEquipes: 2, titre: "", illimite: false, lagon: null };
}
export function chargerPrep(manche, scores) {
  scoresPrep = scores;
  const p = store.get(clePrep());
  prep = p && p.manche === manche ? p : prepDefaut(manche, scores);
  prep.nbEquipes ||= 2;
}
const configDe = (p) => ({ manche: p.manche, mode: p.mode, equipes: p.mode === "equipes" ? p.equipes : null, nbEquipes: p.mode === "equipes" ? p.nbEquipes : null, coef: p.coef, bots: p.bots,
  titre: p.titre, nouveaute: p.nouveaute, participants: p.qui === "choix" ? p.participants : null, illimite: !!p.illimite, lagon: normaliserLagon(p.lagon) });
function publierPrep(immediat = false) {
  store.set(clePrep(), prep);
  clearTimeout(publierTimer);
  const go = () => db.definirConfig(S.code, S.secret, configDe(prep)).then(() => { S.salle.config = configDe(prep); }).catch((e) => toast(e.message, "err"));
  if (immediat) return go();
  publierTimer = setTimeout(go, 400);
}
const joueursPrep = () => (prep.qui === "choix" ? prep.participants.filter((p) => S.joueurs.some((j) => j.pseudo === p)) : S.joueurs.map((j) => j.pseudo));
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
export function repartirRetardataires() {
  if (!S.salle) return;
  if (prep && prep.mode === "equipes" && (S.salle.phase === "attente" || S.salle.phase === "resultats") && prep.manche === S.salle.manche + 1) {
    if (completerEquipes()) { publierPrep(); const b = $("#prep"); if (b && b.dataset.ouvert) panneauPrep(b, scoresPrep); }
  }
  const c = configActuelle();
  if (c && c.mode === "equipes" && S.salle.phase === "prog") {
    const l = S.salle.duel || S.joueurs.map((j) => j.pseudo);
    const eq = { ...(c.equipes || {}) };
    let change = false;
    for (const p of l) if (!eq[p]) { eq[p] = plusPetiteEquipe(eq, c.nbEquipes || 2); change = true; }
    if (change) { c.equipes = eq; db.definirConfig(S.code, S.secret, c).catch(() => {}); const r = $("#rosters"); if (r) r.innerHTML = rostersHTML(eq, l, c.nbEquipes); }
  }
}
const numerosEquipes = (equipes, nb) => Array.from({ length: Math.max(2, nb || 0, ...Object.values(equipes || {})) }, (_, i) => i + 1);
export function rostersHTML(equipes, liste, nb) {
  const col = (e) => `<div class="eq" style="${styleEquipe(e)}"><h4>${nomEquipe(e)} (${liste.filter((p) => equipes[p] === e).length})</h4>
    <div class="eq-noms">${liste.filter((p) => equipes[p] === e).map((p) => `<span class="eq-nom">${esc(p)}</span>`).join("") || '<span class="muted petit">personne</span>'}</div></div>`;
  return `<div class="eq-cols">${numerosEquipes(equipes, nb).map(col).join("")}</div>`;
}

const PRESETS = {
  rematch: { label: "🔁 Rematch", titre: "", f: () => ({ mode: "solo", coef: 1, qui: "tous", titre: "", illimite: false, lagon: null, nouveaute: prepDefaut(prep.manche, scoresPrep).nouveaute, duree: prep.manche === 1 ? reglages.duree1 : reglages.duree }) },
  equipes: { label: "👥 En équipes", f: () => ({ mode: "equipes", coef: 1, qui: "tous", titre: "Manche en équipes", nbEquipes: prep.nbEquipes || 2 }) },
  duel: { label: "⛈️ Duel des champions", f: () => ({ mode: "solo", coef: 0, illimite: false, lagon: null, qui: "choix", participants: classementCumule(scoresPrep).slice(0, 3).map((t) => t.pseudo), nouveaute: TWIST_DUEL, duree: reglages.dureeDuel, titre: "Duel des champions" }) },
  entrainement: { label: "🏋️ Entraînement", f: () => ({ coef: 0, titre: "Manche d'entraînement" }) },
  longue: { label: "♾️ Manche longue", f: () => ({ illimite: true, titre: prep.titre || "Manche longue" }) },
};

export function panneauPrep(box, scores) {
  scoresPrep = scores;
  box.dataset.ouvert = "1";
  if (prep.mode === "equipes") completerEquipes();
  const tous = S.joueurs.map((j) => j.pseudo);
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
    ${panneauLagon()}
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
    <div class="row"><button class="btn big corail" id="go">▶ Lancer ${prep.devoir && prep.manche === 1 ? "le devoir" : "la manche " + prep.manche}${prep.illimite ? " ♾️" : ""}${prep.mode === "equipes" ? " 👥" : ""}${prep.coef === 2 ? " (×2)" : prep.coef === 0 ? " (hors classement)" : ""}</button></div>
  </div>`;
  const maj = (redessiner = true) => { publierPrep(); if (redessiner) panneauPrep(box, scores); };
  box.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => { Object.assign(prep, PRESETS[b.dataset.preset].f()); if (prep.mode === "equipes" && !Object.keys(prep.equipes).length) equipesHasard(); maj(); }));
  box.querySelectorAll("[data-k]").forEach((i) => i.addEventListener("change", () => {
    const k = i.dataset.k;
    if (k === "dureeMin") prep.duree = Math.round(Math.max(0.5, parseFloat(i.value) || 1) * 60);
    else if (k === "illimite") prep.illimite = i.checked;
    else if (k === "coef" || k === "bots") prep[k] = parseInt(i.value, 10) || 0;
    else prep[k] = i.value;
    maj(k === "coef" || k === "illimite" || k === "nouveaute");   // (la nouveauté change les valeurs par défaut du lagon)
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
  // le lagon personnalisé
  const det = box.querySelector(".prep-lagon");
  det.addEventListener("toggle", () => { lagonOuvert = det.open; });
  box.querySelectorAll("[data-lagon]").forEach((i) => i.addEventListener("change", () => {
    const k = i.dataset.lagon, R = LAGON_REGLAGES[k];
    const v = R.type === "oui-non" ? (i.value === "" ? null : i.value === "1") : i.value === "" ? null : Number(i.value);
    prep.lagon = normaliserLagon({ ...(prep.lagon || {}), [k]: v });
    lagonOuvert = true; maj();
  }));
  const raz = box.querySelector("[data-lagon-raz]");
  if (raz) raz.addEventListener("click", () => { prep.lagon = null; maj(); });
  $("#go", box).addEventListener("click", lancerManche);
  publierPrep();
}

// 🗺️ le lagon : gros grain (la nouveauté, au-dessus) et grain fin (ici) ; une case vide garde la valeur de la nouveauté
function panneauLagon() {
  const T = TWISTS[prep.nouveaute] || TWISTS.calme, L = prep.lagon || {};
  const valeurNouveaute = { requins: T.requins, rapides: T.rapides, vision: T.vision, plastiques: T.plastiques, plastiqueHerbier: T.plastiqueHerbier, nuitDebut: T.nuit[0], nuitFin: T.nuit[1] };
  const champ = (k, R) => {
    const def = R.carte ? R.defaut : valeurNouveaute[k];
    if (R.type === "oui-non") return `<label class="champ petit">${R.icone} ${esc(R.nom)}<select data-lagon="${k}">
        <option value="" ${L[k] === undefined ? "selected" : ""}>comme la nouveauté (${def ? "oui" : "non"})</option>
        <option value="1" ${L[k] === true ? "selected" : ""}>oui</option><option value="0" ${L[k] === false ? "selected" : ""}>non</option></select></label>`;
    return `<label class="champ petit">${R.icone} ${esc(R.nom)}<input type="number" data-lagon="${k}" min="${R.min}" max="${R.max}" step="1" value="${L[k] ?? ""}" placeholder="${esc(String(def))}" class="${L[k] !== undefined ? "modifie" : ""}"></label>`;
  };
  const resume = decrireLagon(prep.lagon, prep.nouveaute);
  return `<details class="prep-lagon" ${lagonOuvert || resume ? "open" : ""}>
    <summary>🗺️ Personnaliser le lagon ${resume ? `<span class="pill lagon-perso">${esc(resume)}</span>` : `<span class="petit muted">(facultatif : par défaut, le lagon de la nouveauté ${T.icone})</span>`}</summary>
    <div class="lagon-grille">${Object.entries(LAGON_REGLAGES).map(([k, R]) => champ(k, R)).join("")}</div>
    <p class="petit muted">Une case vide garde la valeur de la nouveauté (en gris). Le corail et les algues changent la carte, toujours vérifiée sans blocage. Les élèves s'entraînent dans ce lagon dans leur bac à sable.
      ${resume ? `<button type="button" class="btn small ghost" data-lagon-raz>↺ Revenir au lagon de la nouveauté</button>` : ""}</p>
  </details>`;
}

// lancer la manche préparée
export async function lancerManche() {
  const p = prep;
  if (p.qui === "choix" && !p.participants.length) return toast("Choisissez au moins un élève qui joue.", "err");
  if (p.mode === "equipes") completerEquipes();
  try {
    await publierPrep(true);
    await piloter({ manche: p.manche, phase: "prog", duree: p.illimite ? DUREE_ILLIMITEE : p.duree, nouveaute: p.nouveaute, duel: p.qui === "choix" ? p.participants.slice() : null });
    await envoyerFaux();
    if (p.devoir) fenetreLienEleves({ devoir: true });   // devoir lancé : le lien à donner aux élèves
  } catch (e) { toast(e.message, "err"); }
}

// DEVOIR (salle créée hors cours) : la manche 1 est préparée sans limite de temps ;
// l'enseignant choisit la nouveauté, les équipes… puis la lance (le lien s'affiche alors).
export function prevoirDevoir(code) {
  store.set("lagon:prep:" + code, { ...prepDefaut(1, []), illimite: true, titre: "Devoir", devoir: true });
}
