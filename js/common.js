// =====================================================================
//  Lagon Arena — petits outils partagés + aide-mémoire des règles
// =====================================================================
import { P, TWISTS } from "./engine.js";

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

// ---------- aide-mémoire (affiché dans le tutoriel, l'écran élève…) ----------
export const AIDE_HTML = `
<ol class="regles-or">
  <li>À chaque tour, le jeu appelle ta fonction <code>tour()</code> : ta tortue fait <b>une seule action</b>.</li>
  <li>Python lit tes <code>if</code> / <code>elif</code> de haut en bas : <b>le premier vrai gagne</b>, les suivants sont ignorés. L'ordre compte !</li>
  <li>Pour marquer un point : <code>pondre()</code> <b>sur une plage</b>, <b>la nuit</b>, avec <b>au moins ${P.energiePonte} d'énergie</b>.</li>
</ol>
<h3>🧭 Les capteurs (ce que ta tortue sait)</h3>
<table>
  <tr><td><code>requin_proche()</code></td><td><code>True</code> si un requin est à ${P.porteeRequin} cases ou moins</td></tr>
  <tr><td><code>algue_ici()</code></td><td><code>True</code> si ta tortue est sur des algues</td></tr>
  <tr><td><code>plastique_ici()</code></td><td><code>True</code> si un sac plastique est sur sa case</td></tr>
  <tr><td><code>sur_plage()</code></td><td><code>True</code> si ta tortue est sur une plage</td></tr>
  <tr><td><code>est_la_nuit()</code></td><td><code>True</code> la nuit (de 19 h à 6 h, sauf nouveauté)</td></tr>
  <tr><td><code>energie()</code></td><td>un nombre de 0 à ${P.energieMax}</td></tr>
  <tr><td><code>heure()</code></td><td>un nombre de 0 à 23</td></tr>
</table>
<h3>🐢 Les actions (une seule par tour)</h3>
<table>
  <tr><td><code>manger()</code></td><td>mange une algue : <b>+${P.gainAlgue}</b> d'énergie. Sur un sac plastique : <b>−${P.pertePlastique}</b> !</td></tr>
  <tr><td><code>pondre()</code></td><td>pond un nid (<b>1 point</b>), coûte ${P.coutPonte} d'énergie</td></tr>
  <tr><td><code>fuir()</code></td><td>s'éloigne d'une case du requin le plus proche</td></tr>
  <tr><td><code>se_cacher()</code></td><td>ne bouge pas. Dans les algues, ta tortue est <b>invisible</b> pour les requins</td></tr>
  <tr><td><code>aller_vers_algue()</code></td><td>avance d'une case vers les algues propres les plus proches</td></tr>
  <tr><td><code>aller_vers_plage()</code></td><td>avance d'une case vers la plage la plus proche</td></tr>
</table>
<h3>⚠️ À savoir</h3>
<ul>
  <li>L'énergie baisse de 1 tous les ${P.perteEnergie} tours. À 0, ta tortue est <b>épuisée</b> : retour au départ, bloquée ${P.bloquee} tours.</li>
  <li>Un requin qui touche ta tortue la renvoie au départ (bloquée ${P.bloquee} tours). Il ne va jamais sur la plage.</li>
  <li>Dans les algues, ta tortue est cachée… <b>sauf quand elle mange</b> (ça fait bouger les algues !).</li>
  <li>Un match dure 180 tours (3 jours et 3 nuits).</li>
</ul>`;

export function twistCarte(key) {
  const T = TWISTS[key] || TWISTS.calme;
  return el("div", { class: "nouveaute" }, el("div", { class: "ico" }, T.icone), el("div", {}, el("b", {}, T.nom), T.texte));
}

// petite icône de tortue (SVG) pour les titres
export const TORTUE_SVG = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><ellipse cx="32" cy="11" rx="7" ry="6" fill="#7cc77f"/><ellipse cx="14" cy="22" rx="8" ry="5" fill="#7cc77f" transform="rotate(-35 14 22)"/><ellipse cx="50" cy="22" rx="8" ry="5" fill="#7cc77f" transform="rotate(35 50 22)"/><ellipse cx="16" cy="46" rx="7" ry="4.5" fill="#7cc77f" transform="rotate(35 16 46)"/><ellipse cx="48" cy="46" rx="7" ry="4.5" fill="#7cc77f" transform="rotate(-35 48 46)"/><ellipse cx="32" cy="34" rx="17" ry="20" fill="#2e8b57" stroke="#1d5d3a" stroke-width="3"/><path d="M32 18 L42 28 L38 44 L26 44 L22 28 Z" fill="#3fae6c" stroke="#1d5d3a" stroke-width="2"/><circle cx="29" cy="9" r="1.6" fill="#10233a"/><circle cx="35" cy="9" r="1.6" fill="#10233a"/></svg>`;
