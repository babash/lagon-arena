// =====================================================================
//  Lagon Arena — petits outils partagés + aide-mémoire des règles
// =====================================================================
import { P, TWISTS } from "./engine.js";
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

export const store = {
  get(k, def = null) { try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* rien */ } },
};
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
<table class="prims">${CAPTEURS.map(ligneP).join("")}</table>
<h3>❗ Les ordres (actions) : un seul par tour</h3>
<table class="prims">${ACTIONS_INFO.map(ligneP).join("")}</table>
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
</ul>`;

export function twistCarte(key) {
  const T = TWISTS[key] || TWISTS.calme;
  return el("div", { class: "nouveaute" }, el("div", { class: "ico" }, T.icone), el("div", {}, el("b", {}, T.nom), T.texte));
}

// petite icône de tortue (SVG) pour les titres
export const TORTUE_SVG = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><ellipse cx="32" cy="11" rx="7" ry="6" fill="#7cc77f"/><ellipse cx="14" cy="22" rx="8" ry="5" fill="#7cc77f" transform="rotate(-35 14 22)"/><ellipse cx="50" cy="22" rx="8" ry="5" fill="#7cc77f" transform="rotate(35 50 22)"/><ellipse cx="16" cy="46" rx="7" ry="4.5" fill="#7cc77f" transform="rotate(35 16 46)"/><ellipse cx="48" cy="46" rx="7" ry="4.5" fill="#7cc77f" transform="rotate(-35 48 46)"/><ellipse cx="32" cy="34" rx="17" ry="20" fill="#2e8b57" stroke="#1d5d3a" stroke-width="3"/><path d="M32 18 L42 28 L38 44 L26 44 L22 28 Z" fill="#3fae6c" stroke="#1d5d3a" stroke-width="2"/><circle cx="29" cy="9" r="1.6" fill="#10233a"/><circle cx="35" cy="9" r="1.6" fill="#10233a"/></svg>`;
