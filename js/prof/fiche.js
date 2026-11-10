// =====================================================================
//  Lagon Arena — enseignant : CE QUE FONT LES TORTUES DE LA CLASSE (chantier 3)
//   • l'état de chaque tortue, d'après les tests de la tortue (js/moteur/diagnostic.js) :
//     🟢 elle pond · 🟠 pas souvent · 🔴 jamais (avec la cause) · 🐞 erreur · ⏳ rien envoyé ;
//   • la FICHE d'un élève : son code, ses tests, ses chiffres du match, « revoir le match » ;
//   • le RÉSUMÉ de la classe : qui ne pond pas, et pourquoi (un clic sur une cause → les élèves).
//  L'écran de l'enseignant est souvent projeté : la fiche s'ouvre avec un avertissement
//  et un bouton pour la masquer d'un coup (Échap marche aussi).
// =====================================================================
import { db } from "../db.js";
import { diagnostiquer, enTexteRiche } from "../moteur/diagnostic.js";
import { bilanHTML, brancherLiens } from "../bilan.js";
import { CodeView } from "../editor.js";
import { $, el, esc, toast, copier } from "../common.js";
import { S } from "./etat.js";
import { fenetre } from "./liens.js";

const riche = (t) => enTexteRiche(t || "");

// ---------- l'état d'une tortue, en une icône et une cause courte ----------
const ACTION_TXT = { manger: "mange", pondre: "pond", fuir: "fuit", se_cacher: "se cache", aller_vers_plage: "va vers la plage", aller_vers_algue: "va vers les algues" };
export function etatTortue(code) {
  if (code == null) return { cle: "rien", icone: "⏳", couleur: "rien", texte: "rien envoyé (tortue de départ)" };
  const d = diagnostiquer(code);
  if (!d.ok) return { cle: "bug", icone: "🐞", couleur: "bug", texte: "erreur dans le code", d };
  const v = d.verdict;
  if (v.couleur === "vert") return { cle: "pond", icone: "🟢", couleur: "vert", texte: "sait pondre", d };
  const T = Object.fromEntries(d.tests.map((t) => [t.id, t]));
  const rouge = (type) => d.remarques.some((r) => r.type === type && r.gravite === "rouge");
  const [kp, kplage] = d.cles;
  const c = (cle, texte) => ({ cle, icone: v.icone, couleur: v.couleur, texte, d });
  if (v.couleur === "rouge") {
    if (/bougera/.test(v.titre)) return c("immobile", "aucune action dans le code");
    if (kp.etat === "absente") return c("sans-pondre", "pas de `pondre()`");
    if (rouge("deux-blocs")) return c("deux-blocs", "deux blocs `if` à la suite");
    if (rouge("ordre") || rouge("doublon")) return c("ordre", "règles dans le mauvais ordre");
    if (!T.ponte.ok && T.ponte.obtenu === "manger") return c("mange-nuit", "manger passe avant pondre (la nuit, sur la plage)");
    if (kp.etat === "refusee") return c("refusee", "`pondre()` au mauvais moment (le jour, hors de la plage…)");
    if (kplage.etat === "absente" || kplage.etat === "jamais") return c("sans-plage", "jamais vers la plage");
    return c("jamais", "`pondre()` jamais atteint");
  }
  // 🟠 : elle peut pondre, mais rate une situation clé
  const rate = d.tests.find((t) => t.niveau === "ponte" && !t.ok);
  if (!rate) return c("pas-souvent", "pond, mais pas souvent");
  if ((rate.id === "rentrer" || rate.id === "rentrer_algues") && rate.obtenu === "manger") return c("mange-nuit-rentrer", "manger passe avant rentrer (la nuit)");
  if (rate.id === "repartir") return c("reste-plage", "reste sur la plage le jour (au lieu de manger)");
  const fait = rate.erreur ? "plante" : rate.obtenu ? ACTION_TXT[rate.obtenu] || `fait \`${rate.obtenu}()\`` : "ne fait rien";
  return c("rate-" + rate.id, `${rate.titre.replace(/,? \d+ ⚡/, "").replace(/^\S+ /, "")} : ${fait}`);
}

// ---------- la fiche d'un élève ----------
//  o : { pseudo, couleur, code, envoye (date), manche, mancheCode, match: { nids, captures, epuisee }, revoir: () => {} }
export function ficheEleve(o) {
  const st = etatTortue(o.code);
  const quand = o.envoye ? new Date(o.envoye).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : null;
  const origine = o.code == null ? "Aucune tortue envoyée : c'est la tortue de départ qui joue."
    : o.mancheCode != null && o.manche != null && o.mancheCode < o.manche ? `Tortue envoyée à la manche ${o.mancheCode} (pas encore renvoyée pour la manche ${o.manche}).`
    : `Tortue envoyée${o.mancheCode != null ? ` pour la manche ${o.mancheCode}` : ""}${quand ? ` à ${quand}` : ""}.`;
  const m = o.match;
  const box = fenetre(`<div class="fiche-alerte" role="alert"><span>👀 <b>Visible au tableau</b> si votre écran est projeté.</span>
      <button type="button" class="btn small sombre" data-masquer>🙈 Masquer</button></div>
    <h2 class="fiche-titre"><span class="swatch" style="background:${esc(o.couleur || "#ccc")}"></span>${esc(o.pseudo)} <span class="pill etat-${st.couleur}">${st.icone} ${riche(st.texte)}</span></h2>
    ${m ? `<div class="fiche-chiffres"><span><b>${m.nids}</b> 🥚 nid${m.nids > 1 ? "s" : ""}</span><span><b>${m.captures}</b> × 🦈 attrapée</span><span><b>${m.epuisee}</b> × 😵 épuisée</span></div>` : ""}
    <p class="petit muted">${esc(origine)}</p>
    <div class="fiche-grille"><div><h3>🐍 Son code</h3><div class="fiche-code"></div>
        <div class="row" style="margin-top:6px"><button type="button" class="btn small ghost" data-copier>📋 Copier le code</button>${o.revoir ? `<button type="button" class="btn small" data-revoir>▶ Revoir le match en suivant cette tortue</button>` : ""}</div></div>
      <div class="fiche-bilan">${o.code == null ? "" : bilanHTML(st.d || o.code, { compact: true })}</div></div>`, { large: true });
  box.classList.add("fiche-eleve");
  new CodeView($(".fiche-code", box)).setCode(o.code ?? "# (tortue de départ)");
  brancherLiens(box, null);
  const fermer = () => { box.remove(); document.removeEventListener("keydown", echap); };
  const echap = (e) => { if (e.key === "Escape") fermer(); };
  document.addEventListener("keydown", echap);
  $("[data-masquer]", box).addEventListener("click", fermer);
  $("[data-fermer]", box).addEventListener("click", fermer);
  $("[data-copier]", box).addEventListener("click", () => copier(o.code ?? "").then(() => toast("Code copié."), () => toast("Copie impossible.", "err")));
  if (o.revoir) $("[data-revoir]", box).addEventListener("click", () => { fermer(); o.revoir(); });
  return box;
}

// ---------- le résumé de la classe ----------
//  eleves : [{ pseudo, code, pondu (bool, s'il y a eu un match) }] ; ouvrir(pseudo) ouvre sa fiche
export function grouperCauses(eleves) {
  const groupes = new Map();
  for (const e of eleves) {
    const st = e.etat || etatTortue(e.code);
    const cle = e.pondu && st.cle !== "pond" ? "pond-quand-meme" : st.cle;
    if (!groupes.has(cle)) groupes.set(cle, { cle, icone: st.icone, texte: st.texte, eleves: [] });
    groupes.get(cle).eleves.push(e.pseudo);
  }
  return [...groupes.values()].sort((a, b) => b.eleves.length - a.eleves.length || a.texte.localeCompare(b.texte));
}

// match = true : après un brawl (« ont pondu » = au moins un nid pendant le match)
export function resumeClasseHTML(eleves, { match = false } = {}) {
  if (!eleves.length) return "";
  const ok = match ? eleves.filter((e) => e.pondu) : eleves.filter((e) => (e.etat || etatTortue(e.code)).cle === "pond");
  const autres = eleves.filter((e) => !ok.includes(e));
  const tete = match ? `🥚 <b>${ok.length} tortue${ok.length > 1 ? "s" : ""} sur ${eleves.length}</b> ${ok.length > 1 ? "ont" : "a"} pondu pendant le match.`
    : `🥚 <b>${ok.length} tortue${ok.length > 1 ? "s" : ""} sur ${eleves.length}</b> ${ok.length > 1 ? "savent" : "sait"} pondre (d'après leurs tests).`;
  const groupes = grouperCauses(autres.map((e) => ({ ...e, pondu: false }))).map((g) => {
    const texte = g.cle === "pond" && match ? "savent pondre, mais 0 nid ce match (requins, énergie…)" : g.texte;
    return `<li><button type="button" class="cause" data-cause="${esc(g.cle)}" aria-expanded="false"><b>${g.eleves.length}</b> ${g.icone} ${riche(texte)}</button>
      <div class="cause-eleves cache">${g.eleves.map((p) => `<button type="button" class="btn small ghost" data-eleve="${esc(p)}">${esc(p)}</button>`).join("")}</div></li>`;
  }).join("");
  return `<div class="resume-classe"><p class="resume-tete">${tete}${autres.length ? ` Les ${autres.length} autre${autres.length > 1 ? "s" : ""} :` : " 🎉"}</p>
    ${autres.length ? `<ul class="causes">${groupes}</ul><p class="petit muted">Un clic sur une cause montre les élèves concernés, un clic sur un élève ouvre sa fiche.</p>` : ""}</div>`;
}
export function brancherResume(box, ouvrir) {
  box.addEventListener("click", (e) => {
    const c = e.target.closest("[data-cause]");
    if (c) { const l = c.nextElementSibling; l.classList.toggle("cache"); c.setAttribute("aria-expanded", String(!l.classList.contains("cache"))); return; }
    const p = e.target.closest("[data-eleve]");
    if (p) ouvrir(p.dataset.eleve);
  });
}

// ---------- les codes de la classe (dernière tortue de chaque élève, manche <= la manche en cours) ----------
//  Pendant la programmation, seule la fonction codes_manche (avec le secret de la salle) les donne ;
//  après le brawl, la table publique suffit (repli si la base n'est pas encore à jour).
export async function chargerCodes() {
  const m = S.salle.manche;
  let l = null;
  try { l = await db.codesManche(S.code, S.secret, m); } catch { l = null; }
  if (!l && S.salle.phase !== "prog" && S.salle.phase !== "attente") {
    try {
      const t = await db.tortues(S.code), der = {};
      for (const x of t) if (x.manche <= m && (!der[x.pseudo] || x.manche > der[x.pseudo].manche)) der[x.pseudo] = x;
      l = Object.values(der);
    } catch { l = null; }
  }
  if (!l) return null;
  return Object.fromEntries(l.map((x) => [x.pseudo, { code: x.code, manche: x.manche, depose_le: x.depose_le || null }]));
}

// la fenêtre « 🩺 Les tortues de la classe » (pendant la programmation)
export function fenetreClasse(eleves, ouvrir) {
  const o = fenetre(`<div class="fiche-alerte" role="alert"><span>👀 <b>Visible au tableau</b> si votre écran est projeté.</span>
      <button type="button" class="btn small sombre" data-masquer>🙈 Masquer</button></div>
    <h2>🩺 Les tortues de la classe</h2>
    <p class="petit muted">D'après la <b>dernière tortue envoyée</b> par chaque élève, et ses tests (une situation à la fois : la nuit sur la plage, le jour sur des algues…).</p>
    ${resumeClasseHTML(eleves) || "<p>Aucun élève pour l'instant.</p>"}`, { large: true });
  o.classList.add("fenetre-classe");
  const fermer = () => { o.remove(); document.removeEventListener("keydown", echap); };
  const echap = (e) => { if (e.key === "Escape") fermer(); };
  document.addEventListener("keydown", echap);
  $("[data-masquer]", o).addEventListener("click", fermer);
  brancherResume(o, (p) => { fermer(); ouvrir(p); });
}

export const iconeEtat = (st) => el("span", { class: "etat etat-" + st.couleur, title: st.texte.replace(/`/g, "") }, st.icone);
