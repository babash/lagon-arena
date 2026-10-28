// =====================================================================
//  Lagon Arena — élève : proposer sa tortue au PANTHÉON (les meilleures de tous les temps)
//   1. la tortue passe le banc d'essai (20 lagons, toujours les mêmes) dans ce navigateur ;
//   2. l'élève voit sa moyenne et la place qu'elle aurait ;
//   3. il l'inscrit avec un pseudo (et son lycée, s'il veut) ; son CODE PANTHÉON lui permet
//      de l'améliorer plus tard, depuis n'importe quel ordinateur.
//  Son programme est gardé dans la base, mais personne d'autre ne peut le lire.
// =====================================================================
import { db } from "../db.js";
import { $, el, esc, toast, store, nouveauCodePerso, normaliserCode, codeValide, codeLisible } from "../common.js";
import { BANC, evaluerBanc, codeConnu } from "../pantheon.js";
import { PALIERS, PALIER_EQUIPE } from "../pouce.js";
import { ed, verifier } from "./editeur.js";
import { PSEUDO } from "./etat.js";
import { overlay } from "./ui.js";

const CLE = "lagon:pantheon";   // { code (code Panthéon), pseudo, lycee } — 1 jour, comme tout ce qui est à l'élève
const jetonPantheon = (c) => `pantheon-${c}-lagon`;
const nombre = (x) => Number(x).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// les programmes du coup de pouce (sans les « + » qui marquent les lignes nouvelles)
const codesPouce = () => [...PALIERS, PALIER_EQUIPE].map((p) => ({ nom: "un programme du coup de pouce", code: p.code.split("\n").map((l) => l.replace(/^\+/, "")).join("\n") }));

$("#pantheon").addEventListener("click", ouvrir);

async function ouvrir() {
  const c = verifier();
  if (!c.ok) { toast("Corrige d'abord l'erreur de ton programme.", "err"); return; }
  const code = ed.value;
  const connu = codeConnu(code, codesPouce());
  if (connu) {
    overlay(`<div class="emoji">🏛️</div><h2>C'est ${esc(connu.nom)} !</h2>
      <p>Le Panthéon accueille des tortues <b>inventées</b>. Modifie ce programme pour en faire <b>ta propre stratégie</b>, puis reviens ici.</p>`, true);
    return;
  }
  overlay(`<div class="emoji">🏛️</div><h2>Le banc d'essai du Panthéon</h2>
    <p>Ta tortue joue <b>${BANC.parties} parties</b> dans le lagon calme, contre les 5 tortues d'entraînement. Ce sont les mêmes ${BANC.parties} lagons pour tout le monde.</p>
    <div class="jauge"><div id="banc-jauge" style="width:0%"></div><span id="banc-txt">0 / ${BANC.parties}</span></div>`);
  let r, top = [];
  try {
    [r, top] = await Promise.all([
      evaluerBanc(code, (i, n) => { const j = $("#banc-jauge"); if (j) { j.style.width = (100 * i) / n + "%"; $("#banc-txt").textContent = `${i} / ${n}`; } }),
      db.pantheonTop(100).catch(() => []),
    ]);
  } catch (e) { overlay(`<h2>Oups</h2><p>${esc(e.message)}</p>`, true); return; }
  formulaire(code, r, top);
}

// la place qu'aurait cette moyenne dans le top 100
function placeVisee(moyenne, top) {
  const devant = top.filter((t) => Number(t.moyenne) >= moyenne).length;
  if (top.length >= 100 && devant >= 100) return { dedans: false, seuil: Number(top[99].moyenne) };
  return { dedans: true, rang: devant + 1 };
}

async function formulaire(code, r, top) {
  const memo = store.get(CLE, {}) || {};
  const place = placeVisee(r.moyenne, top);
  overlay(`<div class="emoji">🏛️</div><h2>${nombre(r.moyenne)} nids en moyenne</h2>
    <p class="petit">Sur les ${BANC.parties} lagons : de ${r.min} à ${r.max} nids, ${r.zeros} partie${r.zeros > 1 ? "s" : ""} sans nid.</p>
    <p>${place.dedans ? `👉 Ta tortue entrerait au Panthéon à la <b>${place.rang}${place.rang === 1 ? "re" : "e"} place</b>${place.rang === 1 ? " : la meilleure de tous les temps !" : "."}`
      : `Il faut plus de <b>${nombre(place.seuil)}</b> nids en moyenne pour entrer dans le top 100. Continue à l'améliorer !`}</p>
    <form id="pt-form" class="form-pantheon">
      <label class="champ"><span>Pseudo au Panthéon <span class="petit muted">(pas ton vrai nom)</span></span>
        <input type="text" id="pt-pseudo" maxlength="14" required value="${esc(memo.pseudo || PSEUDO || "")}" autocomplete="off"></label>
      <label class="champ"><span>Ton lycée <span class="petit muted">(facultatif)</span></span>
        <input type="text" id="pt-lycee" maxlength="60" list="pt-lycees" value="${esc(memo.lycee || "")}" placeholder="ex. Lycée de Chirongui" autocomplete="off"></label>
      <datalist id="pt-lycees"></datalist>
      <details ${memo.code ? "open" : ""}><summary>🔑 Ta tortue est déjà au Panthéon ?</summary>
        <label class="champ"><span>Ton code Panthéon <span class="petit muted">(la nouvelle tortue remplace l'ancienne si elle fait mieux)</span></span>
          <input type="text" id="pt-code" maxlength="12" class="input-code" value="${esc(codeLisible(memo.code || ""))}" placeholder="ex. K7PQ-2XMA" autocomplete="off" spellcheck="false"></label>
      </details>
      <p class="petit muted">Ton programme est gardé, mais <b>personne ne pourra le lire</b>. Ton pseudo, ton lycée et ta moyenne seront visibles par tous.</p>
      <div class="row" style="justify-content:center"><button class="btn big" type="submit">🏛️ Entrer au Panthéon</button>
        <button class="btn ghost" type="button" id="pt-annuler">Plus tard</button></div>
      <div id="pt-erreur" class="msg err cache"></div>
    </form>`);
  $("#pt-annuler").addEventListener("click", () => overlay(null));
  db.pantheonLycees().then((l) => { const d = $("#pt-lycees"); if (d) for (const x of l) d.append(el("option", { value: x.lycee })); }).catch(() => {});
  $("#pt-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = (m) => { const b = $("#pt-erreur"); b.innerHTML = m; b.classList.remove("cache"); };
    const saisi = normaliserCode($("#pt-code").value);
    if (saisi && !codeValide(saisi)) return err("Code Panthéon incorrect : 8 lettres ou chiffres, par exemple <b>K7PQ-2XMA</b>.");
    const codeP = saisi || nouveauCodePerso();
    const pseudo = $("#pt-pseudo").value.trim(), lycee = $("#pt-lycee").value.trim();
    try {
      const res = await db.proposerPantheon({ pseudo, lycee, code, moyenne: r.moyenne, banc: BANC.version, jeton: jetonPantheon(codeP) });
      store.set(CLE, { code: codeP, pseudo, lycee });
      bravo(res, codeP);
    } catch (ex) { err(esc(ex.message)); }
  });
}

function bravo(res, codeP) {
  const rang = `${res.rang}${res.rang === 1 ? "re" : "e"}`;
  const titre = res.statut === "moins_bien" ? "Ton ancienne tortue reste meilleure"
    : res.statut === "ameliore" ? `Tortue améliorée : ${rang} place !` : `Bienvenue au Panthéon : ${rang} place !`;
  overlay(`<div class="emoji">${res.statut === "moins_bien" ? "🤔" : "🏆"}</div><h2>${titre}</h2>
    <p>${res.statut === "moins_bien" ? `Celle du Panthéon fait <b>${nombre(res.moyenne)}</b> nids en moyenne : on la garde.` : `<b>${nombre(res.moyenne)}</b> nids en moyenne.`}
      ${res.rang > 100 ? "Elle n'est pas (encore) dans le top 100." : ""}</p>
    <div class="code-perso-box"><div class="petit">Ton <b>code Panthéon</b>, pour l'améliorer plus tard (même depuis un autre ordinateur) :</div>
      <div class="code-perso">${codeLisible(codeP)}</div><div class="petit muted">Note-le : il n'est gardé qu'un jour sur cet ordinateur.</div></div>
    <p class="petit muted">Le score sera vérifié (⏳) puis validé (✔).</p>
    <p><a class="btn" href="pantheon.html" target="_blank">Voir le Panthéon</a></p>`, true);
}
