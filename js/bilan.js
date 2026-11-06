// =====================================================================
//  Lagon Arena — l'affichage des TESTS DE LA TORTUE (sous l'éditeur, et dans le tutoriel)
//  Le verdict en une ligne (🟢 / 🟠 / 🔴), les 4 actions clés, puis le tableau des
//  situations : on attend… / ta tortue fait… / ✅ ❌ ⚠️, avec l'explication ligne par ligne.
//  Les « ligne 7 » des explications sont des liens : un clic place le curseur sur la ligne.
// =====================================================================
import { diagnostiquer, enTexteRiche } from "./moteur/diagnostic.js";

const ETAT = {
  ok: ["✅", ""], inconnu: ["✅", ""],
  absente: ["❌", "absente"], jamais: ["❌", "jamais atteinte"], refusee: ["❌", "toujours refusée"],
};
// « ligne 7 », « lignes 6 à 9 » → liens vers l'éditeur
const avecLiens = (html) => html
  .replace(/\blignes (\d+) à (\d+)/g, (m, a, b) => `<button type="button" class="lien-ligne" data-l="${a}" data-f="${b}">lignes ${a} à ${b}</button>`)
  .replace(/\bligne (\d+)/g, (m, a) => `<button type="button" class="lien-ligne" data-l="${a}">ligne ${a}</button>`);
export const riche = (t) => avecLiens(enTexteRiche(t || ""));

// les lignes du code à surligner : celles qui posent problème (pour l'éditeur)
export function lignesEnCause(d) {
  if (!d.ok || d.verdict.couleur === "vert") return [];
  const r = d.remarques.find((x) => x.gravite === "rouge");
  if (r) { const [a, b] = r.lignes; return Array.from({ length: b - a + 1 }, (_, i) => a + i); }
  const t = d.tests.find((x) => x.niveau === "ponte" && !x.ok);
  return t && t.ligne ? [t.ligne] : [];
}

// le bloc complet ; options : ouvert (tableau déplié), titreTests
export function bilanHTML(source, { ouvert = false, compact = false } = {}) {
  const d = typeof source === "string" ? diagnostiquer(source) : source;
  if (!d.ok) return "";
  const v = d.verdict;
  const reussis = d.tests.filter((t) => t.ok).length;
  const cles = d.cles.map((k) => {
    const [ic, txt] = ETAT[k.etat];
    return `<li class="${k.etat === "ok" || k.etat === "inconnu" ? "ok" : "ko"}" title="${k.etat === "ok" ? "présente et utilisée" : txt}">${ic} ${k.icone} ${k.nom}${txt ? ` <small>(${txt})</small>` : ""}</li>`;
  }).join("");
  // une seule explication dépliée (le premier ❌, sinon le premier ⚠️) ; les autres s'ouvrent avec 🔍
  const premier = d.tests.find((t) => !t.ok && t.niveau === "ponte") || d.tests.find((t) => !t.ok);
  const lignes = d.tests.map((t, i) => {
    const marque = t.ok ? "✅" : `<button type="button" class="voir-pourquoi" data-i="${i}" aria-expanded="${t === premier}" title="Pourquoi ?">${t.niveau === "ponte" ? "❌" : "⚠️"} <span>🔍</span></button>`;
    const fait = t.erreur ? "🐞 erreur" : t.obtenu ? `<code>${t.obtenu}()</code>${t.ligne ? ` <small>${avecLiens("ligne " + t.ligne)}</small>` : ""}` : "<i>rien</i>";
    const exp = t.ok ? "" : `<tr class="explication t-${t.niveau}${t === premier ? "" : " cache"}" data-i="${i}"><td colspan="4">
      ${t.agit ? `<p>${riche(t.agit)}</p>` : ""}${t.raison ? `<p>${riche(t.raison)}</p>` : ""}${t.conseil ? `<p class="faire">👉 ${riche(t.conseil)}</p>` : ""}${t.pourquoi && t.niveau === "conseil" ? `<p class="muted petit">${riche(t.pourquoi)}</p>` : ""}</td></tr>`;
    return `<tr class="${t.ok ? "t-ok" : t.niveau === "ponte" ? "t-rate" : "t-conseil"}"><td>${t.titre}</td><td>${riche(t.attenduTxt)}</td><td>${fait}</td><td class="marque">${marque}</td></tr>${exp}`;
  }).join("");
  const autres = d.remarques.filter((r) => !(v.cause || "").includes(r.texte));   // (celle du verdict est déjà en tête)
  const remarques = autres.length
    ? `<ul class="remarques">${autres.map((r) => `<li class="${r.gravite}">${r.gravite === "rouge" ? "🧱" : "💬"} ${riche(r.texte)} ${r.conseil ? `<b>👉</b> ${riche(r.conseil)}` : ""}</li>`).join("")}</ul>`
    : "";
  return `<div class="bilan bilan-${v.couleur}${compact ? " compact" : ""}" role="status">
    <div class="bilan-verdict"><span class="bilan-icone" aria-hidden="true">${v.icone}</span>
      <div><b>${esc(v.titre)}</b>${v.cause ? `<div class="bilan-cause">${riche(v.cause)}</div>` : ""}</div></div>
    <ul class="cles" aria-label="Les 4 actions clés">${cles}</ul>
    <details class="bilan-tests"${ouvert ? " open" : ""}><summary>🧪 Les tests de ta tortue : <b>${reussis} / ${d.tests.length}</b> réussis</summary>
      <p class="petit muted">On fait jouer <b>un seul tour</b> à ta tortue dans chaque situation, et on regarde la <b>première action</b> qu'elle fait.</p>
      <div class="table-defile"><table class="tests-tortue"><thead><tr><th>Situation</th><th>On attend</th><th>Ta tortue fait</th><th></th></tr></thead><tbody>${lignes}</tbody></table></div>
      ${remarques}
    </details>
  </div>`;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

// les liens « ligne N » d'un conteneur mènent à la ligne dans l'éditeur
export function brancherLiens(box, ed) {
  box.addEventListener("click", (e) => {
    const v = e.target.closest(".voir-pourquoi");
    if (v) {
      const tr = box.querySelector(`tr.explication[data-i="${v.dataset.i}"]`);
      if (tr) { tr.classList.toggle("cache"); v.setAttribute("aria-expanded", String(!tr.classList.contains("cache"))); }
      return;
    }
    const b = e.target.closest(".lien-ligne");
    if (!b || !ed) return;
    const a = Number(b.dataset.l), f = Number(b.dataset.f || b.dataset.l);
    ed.marquer(Array.from({ length: f - a + 1 }, (_, i) => a + i));
    ed.allerA(a);
  });
}
