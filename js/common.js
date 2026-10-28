// =====================================================================
//  Lagon Arena — petits outils partagés + aide-mémoire des règles
// =====================================================================
import { P, TWISTS, equipeInfo, styleEquipe } from "./engine.js";
import { CONFIG } from "./config.js";
import { CAPTEURS, ACTIONS_INFO } from "./primitives.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function toast(msg, type = "") {
  let box = document.getElementById("toasts");
  if (!box) { box = el("div", { id: "toasts" }); document.body.append(box); }
  const t = el("div", { class: "toast " + type }, msg);
  box.append(t);
  setTimeout(() => t.remove(), 4200);
}

// ---------- copier du code (bouton « Copier » sur tous les blocs de code) ----------
export async function copier(texte) {
  texte = texte.replace(/\s+$/, "") + "\n";
  try { await navigator.clipboard.writeText(texte); }
  catch {
    const t = document.createElement("textarea"); t.value = texte; t.style.position = "fixed"; t.style.opacity = "0";
    document.body.append(t); t.select(); try { document.execCommand("copy"); } catch { /* rien */ } t.remove();
  }
  toast("📋 Code copié !");
}
// texte d'un bloc .codeview (sans les numéros de ligne ni les étiquettes True/False)
export function texteCodeview(box) {
  const lignes = box.querySelectorAll(".l");
  if (!lignes.length) return box.textContent;
  return [...lignes].map((l) => { const c = l.cloneNode(true); c.querySelectorAll(".n, .tag").forEach((x) => x.remove()); return c.textContent.replace(/\u00a0/g, " "); }).join("\n");
}
// ajoute automatiquement un bouton « Copier » à chaque bloc de code affiché (même ceux créés plus tard)
export function activerCopie(racine = document.body) {
  const equiper = (el) => {
    if (el.dataset.copie || el.closest(".pas-copie")) return;
    el.dataset.copie = "1";
    const b = document.createElement("button"); b.type = "button"; b.className = "copier"; b.textContent = "📋 Copier"; b.title = "Copier ce code";
    b.addEventListener("click", (e) => { e.stopPropagation(); copier(el.matches("pre") ? el.innerText.replace("📋 Copier", "") : texteCodeview(el)); });
    el.append(b);
  };
  const scan = (n) => { if (n.nodeType !== 1) return; if (n.matches(".codeview, pre.modele")) equiper(n); n.querySelectorAll(".codeview, pre.modele").forEach(equiper); };
  scan(racine);
  new MutationObserver((ms) => { for (const m of ms) m.addedNodes.forEach(scan); }).observe(racine, { childList: true, subtree: true });
}

export const store = {
  get(k, def = null) { try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* rien */ } },
};
// ---------- liens à donner (élèves, enseignant, QR code) ----------
//  Toujours vers l'adresse publique du site (CONFIG.URL_SITE), même si la page est ouverte ailleurs.
//  En mode démo (sans base de données), tout reste dans ce navigateur : on garde l'adresse de la page.
export function lienSite(chemin) {
  const base = CONFIG.SUPABASE_URL && CONFIG.URL_SITE ? CONFIG.URL_SITE : location.href;
  return new URL(chemin, base).href;
}
export const sansProtocole = (url) => url.replace(/^https?:\/\//, "");
// un élève arrivé par un lien d'accès (index.html?salle=ABCD) : on garde la salle en mémoire
// pour le ramener dans cette salle après le tutoriel
export function salleInvitee() {
  const q = new URLSearchParams(location.search).get("salle");
  if (q) { try { localStorage.setItem("lagon:invitation", q.toUpperCase()); } catch { /* rien */ } return q.toUpperCase(); }
  try { return localStorage.getItem("lagon:invitation") || ""; } catch { return ""; }
}
export const lienPartie = () => { const s = salleInvitee(); return "index.html" + (s ? "?salle=" + encodeURIComponent(s) : ""); };

// ---------- code de session : pour reprendre son pseudo sur un autre ordinateur (à la maison…) ----------
//  8 caractères faciles à recopier (sans I, L, O, 0, 1). Le jeton secret de l'élève en est tiré.
const ALPHA_CODE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function nouveauCodePerso() {
  const a = new Uint32Array(8);
  (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => (a[i] = Math.random() * 1e9));
  return [...a].map((v) => ALPHA_CODE[v % ALPHA_CODE.length]).join("");
}
export const normaliserCode = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
export const codeValide = (s) => /^[A-HJKMNP-Z2-9]{8}$/.test(normaliserCode(s));
export const jetonDuCode = (code) => `perso-${normaliserCode(code)}-lagon`;
export const codeLisible = (c) => (c ? c.slice(0, 4) + "-" + c.slice(4) : "");
export const cleJeton = (salle, pseudo) => `lagon:jeton:${salle}:${pseudo}`;
export const cleCodePerso = (salle, pseudo) => `lagon:codeperso:${salle}:${pseudo}`;   // (lagon:code:… = le programme)

export function jeton() {
  const a = new Uint8Array(16);
  (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => (a[i] = Math.random() * 256));
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export const mmss = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
export const heureTxt = (h) => `${h} h`;
export const plural = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;

// ---------- aide-mémoire (onglet Aide de l'écran élève) ----------
const ligneP = (p) => `<tr><td class="ic">${p.icone}</td><td><code>${p.nom}()</code></td><td>${esc(p.role)}</td></tr>`;
export const AIDE_HTML = `
<ol class="regles-or">
  <li>À chaque tour, le jeu lance <code>tour()</code> : ta tortue fait <b>un seul ordre</b>.</li>
  <li>Python lit de <b>haut en bas</b> : il fait seulement le <b>premier <code>if</code> vrai</b>.</li>
  <li>1 point = <code>pondre()</code> <b>sur la plage</b>, <b>la nuit</b>, avec <b>${P.energiePonte} ⚡ ou plus</b>.</li>
</ol>
<h3>❓ Les questions (capteurs) : réponse True ou False</h3>
<table class="prims">${CAPTEURS.filter((c) => !c.avance && !c.equipe).map(ligneP).join("")}</table>
<h3>❗ Les ordres (actions) : un seul par tour</h3>
<table class="prims">${ACTIONS_INFO.filter((a) => !a.avance && !a.equipe).map(ligneP).join("")}</table>
<h3>✍️ Le modèle à suivre</h3>
<pre class="modele"><span class="tok-kw">def</span> tour():
    <span class="tok-kw">if</span> <i>question</i>:          <span class="tok-com"># si…</span>
        <i>ordre</i>()
    <span class="tok-kw">elif</span> <i>autre question</i>:  <span class="tok-com"># sinon, si…</span>
        <i>ordre</i>()
    <span class="tok-kw">else</span>:                 <span class="tok-com"># sinon</span>
        <i>ordre</i>()</pre>
<p>Pour relier des questions : <code>and</code> (et), <code>or</code> (ou), <code>not</code> (pas). Pour comparer : <code>energie() >= 6</code>, <code>heure() < 19</code>…</p>
<h3>⚠️ À savoir</h3>
<ul>
  <li>⚡ L'énergie baisse de 1 tous les ${P.perteEnergie} tours. À 0 : épuisée, retour au départ.</li>
  <li>🦈 Attrapée par un requin : retour au départ et <b>−1 nid</b>. Refuges : la <b>plage</b> et les <b>algues</b> (sauf quand tu manges).</li>
  <li>🛍️ Manger un sac plastique : <b>−${P.pertePlastique} ⚡</b>.</li>
  <li>🕐 Un match = 180 tours = 3 jours. Nuit de 19 h à 6 h (sauf nouveauté).</li>
  <li>🌿 Une touffe d'algues mangée jusqu'au bout disparaît : une nouvelle pousse ailleurs. Les sacs plastique dérivent et réapparaissent ailleurs.</li>
  <li>☀️ Le jour, sur la plage, le soleil fatigue : l'énergie baisse plus vite.</li>
</ul>
<details class="aide-avancee aide-equipe"><summary>👥 Jouer en équipes (<a href="tuto-avance.html?niveau=equipe">tutoriel 👥 Équipe</a>)</summary>
<p>Pendant une manche en équipes, <b>seul le score de l'équipe compte</b> (on classe les équipes selon la moyenne de nids de leurs tortues). Il peut y avoir 2 équipes ou plus (🔵 Bleue, 🔴 Rouge, 🟢 Verte, 🟡 Jaune…) : chaque tortue a un halo de la couleur de son équipe. Les 🤖 ne sont dans aucune équipe. Deux équipières <b>collées</b> sont protégées des requins, et on ne peut pas pousser une équipière.</p>
<h3>❓ Questions d'équipe</h3>
<table class="prims">${CAPTEURS.filter((c) => c.equipe).map(ligneP).join("")}</table>
<h3>❗ Ordres d'équipe</h3>
<table class="prims">${ACTIONS_INFO.filter((a) => a.equipe).map(ligneP).join("")}</table>
<p>Exemple : <code>if equipiere_fatiguee() and energie() >= 8:</code> puis <code>donner()</code></p>
<p><b>Plus de 2 équipes ?</b> L'équipe <b>rivale</b> est la meilleure des autres équipes en ce moment. <code>rang_equipe()</code> dit à quelle place est ton équipe, <code>equipe_en_tete()</code> si elle mène, <code>rivale_a_cote()</code> si une rivale est collée à toi ; <code>pousser()</code> vise l'équipe rivale en premier. Exemple : <code>if rivale_a_cote() and requin_derriere_adversaire():</code> puis <code>pousser()</code></p>
</details>
<details class="aide-avancee"><summary>🚀 Niveau avancé (voir le <a href="tuto-avance.html">tutoriel avancé</a>)</summary>
<h3>❓ Questions avancées</h3>
<table class="prims">${CAPTEURS.filter((c) => c.avance && !c.groupe).map(ligneP).join("")}</table>
<h3>🌿 Choisir ses algues (<a href="tuto-avance.html?niveau=expert">tutoriel 🥇 Expert</a>)</h3>
<table class="prims">${CAPTEURS.filter((c) => c.groupe === "algues").map(ligneP).join("")}</table>
<p>Exemple : <code>if requins_autour() >= 2 and not sur_plage():</code> puis <code>aller_vers_plage()</code> (zone dangereuse : direction le refuge).</p>
<h3>❗ Ordres avancés</h3>
<table class="prims">${ACTIONS_INFO.filter((a) => a.avance).map(ligneP).join("")}</table>
<p>Combiner : <code>if distance_requin() <= 2 or energie() < 3:</code> · <code>if not tortue_a_cote():</code> · <code>if est_la_nuit() and (sur_plage() or distance_plage() <= 1):</code></p>
</details>`;

export function twistCarte(key) {
  const T = TWISTS[key] || TWISTS.calme;
  return el("div", { class: "nouveaute" }, el("div", { class: "ico" }, T.icone), el("div", {}, el("b", {}, T.nom), T.texte));
}

// petite icône de tortue (SVG) pour les titres
export const TORTUE_SVG = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><ellipse cx="32" cy="11" rx="7" ry="6" fill="#7cc77f"/><ellipse cx="14" cy="22" rx="8" ry="5" fill="#7cc77f" transform="rotate(-35 14 22)"/><ellipse cx="50" cy="22" rx="8" ry="5" fill="#7cc77f" transform="rotate(35 50 22)"/><ellipse cx="16" cy="46" rx="7" ry="4.5" fill="#7cc77f" transform="rotate(35 16 46)"/><ellipse cx="48" cy="46" rx="7" ry="4.5" fill="#7cc77f" transform="rotate(-35 48 46)"/><ellipse cx="32" cy="34" rx="17" ry="20" fill="#2e8b57" stroke="#1d5d3a" stroke-width="3"/><path d="M32 18 L42 28 L38 44 L26 44 L22 28 Z" fill="#3fae6c" stroke="#1d5d3a" stroke-width="2"/><circle cx="29" cy="9" r="1.6" fill="#10233a"/><circle cx="35" cy="9" r="1.6" fill="#10233a"/></svg>`;

// ---------------------------------------------------------------------
//  Équipes : cartes de score (nombre d'équipes variable, couleur automatique)
// ---------------------------------------------------------------------
const MEDAILLES = ["🥇", "🥈", "🥉"];
export const nomEquipe = (e) => `${equipeInfo(e).icone} ${equipeInfo(e).nom}`;
export const placeTxt = (r) => (r === 1 ? "1re" : r + "e");
//  E = résultat de resultatEquipes() ; ordre "rang" (résultats) ou "numero" (score en direct)
export function cartesEquipesHTML(E, { ordre = "rang", noms = null, points = null, moi = 0, decimales = 2 } = {}) {
  if (!E) return "";
  const l = ordre === "rang" ? E.liste : E.liste.slice().sort((a, b) => a.e - b.e);
  const tete = (x) => x.rang === 1 && E.nb > 1 && x.moyenne > 0;   // pas de couronne quand tout le monde est à 0
  const carte = (x) => `<div class="eqb ${x.e === moi ? "moi" : ""} ${tete(x) ? "premier" : ""}" style="${styleEquipe(x.e)}">
      <span class="eqb-nom">${ordre === "rang" ? (MEDAILLES[x.rang - 1] || placeTxt(x.rang)) + " " : tete(x) ? "👑 " : ""}${nomEquipe(x.e)}</span>
      <b>${x.nids} 🥚</b><small>${x.n} élève${x.n > 1 ? "s" : ""} · moy. ${x.moyenne.toFixed(decimales)}</small>
      ${points ? `<small class="eqb-pts">+${points(x.e)} pts chacun</small>` : ""}
      ${noms ? `<div class="petit eqb-membres">${x.membres.map(noms).join(", ")}</div>` : ""}</div>`;
  return `<div class="duel-eq ${E.nb > 2 ? "multi" : ""}">${l.map(carte).join(E.nb === 2 ? '<div class="vs">VS</div>' : "")}</div>`;
}
export function annonceEquipes(E) {
  if (!E) return "";
  if (E.gagnant) return `🏆 Victoire de l'équipe ${equipeInfo(E.gagnant).icone} <b>${equipeInfo(E.gagnant).nom}</b> !`;
  const premiers = E.liste.filter((x) => x.rang === 1);
  return premiers.length === E.liste.length ? "🤝 Égalité parfaite entre les équipes !" : `🤝 Égalité en tête : ${premiers.map((x) => nomEquipe(x.e)).join(", ")} !`;
}
