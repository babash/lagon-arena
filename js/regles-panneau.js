// =====================================================================
//  Lagon Arena — le panneau « 🧩 Mes règles » (page élève, et dernière étape du tutoriel)
//  Les règles de la tortue, numérotées dans l'ordre où Python les lit (« 1. Si … → … »),
//  avec ⬆️ ⬇️ pour changer leur priorité, 🗑️ pour en retirer une, et « ➕ Ajouter une règle »
//  (une question, un ordre, et le rang : « tout en haut », « après la règle 2 »…).
//  Le code est réécrit tout seul, toujours en UNE seule chaîne if / elif / else.
// =====================================================================
import { P } from "./engine.js";
import { ACTIONS_INFO, visible } from "./primitives.js";
import { lireRegles, ajouterRegle, deplacerRegle, supprimerRegle, actionDe } from "./regles-code.js";
import { esc, toast } from "./common.js";
import { colorer } from "./editor.js";

const QUESTIONS = [
  ["requin_proche()", "🦈 un requin est proche"],
  [`sur_plage() and est_la_nuit() and energie() >= ${P.energiePonte}`, `🥚 sur la plage, la nuit, avec ${P.energiePonte} ⚡ ou plus`],
  ["sur_plage() and est_la_nuit()", "🏖️🌙 sur la plage et la nuit"],
  [`est_la_nuit() and energie() >= ${P.energiePonte}`, `🌙 il fait nuit et j'ai ${P.energiePonte} ⚡ ou plus`],
  ["est_la_nuit()", "🌙 il fait nuit"],
  ["algue_ici() and not plastique_ici()", "🌿 des algues ici, sans plastique"],
  ["algue_ici()", "🌿 des algues ici"],
  [`energie() < ${P.energiePonte}`, `⚡ j'ai moins de ${P.energiePonte} d'énergie`],
];
const code1 = (txt) => colorer(txt).join("");

// box : où dessiner ; lire() : le code actuel ; ecrire(code) : remplacer le code de l'éditeur
export function panneauRegles(box, { lire, ecrire }) {
  function dessiner() {
    if (box.classList.contains("cache")) return;
    const p = lireRegles(lire());
    if (!p.ok) {
      box.innerHTML = `<div class="mes-regles"><h3>🧩 Mes règles</h3><div class="msg warn">${p.raison === "deux"
        ? "Ta tortue a <b>deux blocs</b> <code>if</code> à la suite : le second n'est presque jamais lu. Fais-en d'abord <b>une seule chaîne</b> (le bilan sous ton code te montre où)."
        : p.raison === "autre" ? "Je n'arrive pas à lire ta tortue comme une liste de règles : garde une seule chaîne <code>if</code> / <code>elif</code> / <code>else</code>." : p.raison}</div></div>`;
      return;
    }
    const A = ACTIONS_INFO.filter((a) => visible(a));
    const n = p.regles.length;
    box.innerHTML = `<div class="mes-regles"><h3>🧩 Mes règles <small class="muted">· Python les lit de haut en bas : la 1<sup>re</sup> vraie gagne</small></h3>
      <ol class="mr-liste">${p.regles.map((r, i) => `<li class="carte-regle"><span class="rang">${i + 1}</span>
          <span class="mr-txt"><b>${i ? "Sinon, si" : "Si"}</b> <code class="mr-code">${code1(r.cond)}</code> <b>→</b> <code class="mr-code">${code1(actionDe(r.corps))}</code></span>
          <span class="fleches"><button type="button" class="btn small ghost" data-mr="monter" data-i="${i}" aria-label="Monter la règle ${i + 1}" ${i === 0 ? "disabled" : ""}>⬆️</button><button type="button" class="btn small ghost" data-mr="descendre" data-i="${i}" aria-label="Descendre la règle ${i + 1}" ${i === n - 1 ? "disabled" : ""}>⬇️</button><button type="button" class="btn small ghost" data-mr="suppr" data-i="${i}" aria-label="Supprimer la règle ${i + 1}">🗑️</button></span></li>`).join("")}
        ${p.sinon ? `<li class="carte-regle fixe"><span class="rang">${n + 1}</span><span class="mr-txt"><b>Sinon</b> <b>→</b> <code class="mr-code">${code1(actionDe(p.sinon.corps))}</code></span><span class="petit muted">(toujours en dernier)</span></li>` : ""}
      </ol>
      <form class="mr-ajout"><b>➕ Ajouter une règle :</b>
        <label>Si <select name="q" aria-label="la question">${QUESTIONS.map(([v, f]) => `<option value="${esc(v)}">${f}</option>`).join("")}<option value="autre">✏️ autre question…</option></select></label>
        <input name="autre" class="cache" placeholder="ex. heure() >= 17" aria-label="ta question" spellcheck="false">
        <label>→ <select name="a" aria-label="l'ordre">${A.map((a) => `<option value="${a.nom}()">${a.icone} ${a.nom}()</option>`).join("")}</select></label>
        <label>Place : <select name="rang" aria-label="la place de la règle"><option value="0">tout en haut (la plus urgente)</option>${p.regles.map((r, i) => `<option value="${i + 1}"${i === n - 1 ? " selected" : ""}>après la règle ${i + 1}${i === n - 1 && p.sinon ? " (juste avant « Sinon »)" : ""}</option>`).join("")}</select></label>
        <button class="btn small vert" type="submit">Ajouter</button>
      </form></div>`;
    const f = box.querySelector(".mr-ajout");
    f.q.addEventListener("change", () => { f.autre.classList.toggle("cache", f.q.value !== "autre"); if (f.q.value === "autre") f.autre.focus(); });
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const cond = f.q.value === "autre" ? f.autre.value.trim() : f.q.value;
      if (!cond) { f.autre.focus(); return; }
      const nv = ajouterRegle(lire(), { cond, action: f.a.value, rang: Number(f.rang.value) });
      if (nv) { ecrire(nv); toast(`➕ Règle ajoutée (n° ${Number(f.rang.value) + 1}).`); }
    });
  }
  box.addEventListener("click", (e) => {
    const b = e.target.closest("[data-mr]"); if (!b) return;
    const i = Number(b.dataset.i), k = b.dataset.mr;
    if (k === "suppr" && !confirm(`Supprimer la règle ${i + 1} ?`)) return;
    const nv = k === "monter" ? deplacerRegle(lire(), i, -1) : k === "descendre" ? deplacerRegle(lire(), i, 1) : supprimerRegle(lire(), i);
    if (nv) {
      ecrire(nv);
      const j = k === "monter" ? i - 1 : k === "descendre" ? i + 1 : -1;
      const f = j >= 0 && box.querySelector(`[data-mr="${k}"][data-i="${j}"]`) || box.querySelector(`[data-mr][data-i="${Math.max(0, j)}"]:not([disabled])`);
      if (f) f.focus();
    }
  });
  return { dessiner };
}
