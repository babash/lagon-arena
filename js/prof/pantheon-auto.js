// =====================================================================
//  Lagon Arena — enseignant : le PANTHÉON AUTOMATIQUE (chantier 4)
//  À la fin de chaque manche, ce navigateur :
//   1. prend la meilleure tortue d'élève de la manche (ou les 3 meilleures : réglage) ;
//   2. écarte celles qui n'ont pondu aucun nid, et les copies (tortue de départ, tortues d'entraînement,
//      missions et stratégies des tutoriels, programmes du coup de pouce) ;
//   3. leur fait passer le banc d'essai du Panthéon (20 parties, par petits paquets : la page reste fluide) ;
//   4. les inscrit au Panthéon avec leur classe (le code de la salle) : fonction pantheon_classe.
//  Les doublons sont réglés par la base : même programme → pas inscrite ; même élève → remplacée si meilleure.
//  Chaque manche n'est traitée qu'une fois (mémorisé avec la salle, 60 jours).
// =====================================================================
import { db } from "../db.js";
import { MISSIONS_PONTE } from "../engine.js";
import { BANC, evaluerBanc, codeConnu, normaliser } from "../pantheon.js";
import { PALIERS, PALIER_EQUIPE } from "../pouce.js";
import { codeDe, estBot } from "../brawl.js";
import { $, esc } from "../common.js";
import { S, reglages, mesSalles, memoriserSalle } from "./etat.js";

const ZONE = "#pantheon-auto";
const nombre = (x) => Number(x).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const place = (r) => `${r}${r === 1 ? "re" : "e"}`;
// en plus des programmes connus du banc : la mission « elle mange au lieu de pondre » et le coup de pouce
const EXTRA = [
  ...MISSIONS_PONTE.flatMap((m) => [m.code, m.solution].filter(Boolean).map((code) => ({ nom: "une mission du tutoriel", code }))),
  ...[...PALIERS, PALIER_EQUIPE].map((p) => ({ nom: "un programme du coup de pouce", code: p.code.split("\n").map((l) => l.replace(/^\+/, "")).join("\n") })),
];

// l'état affiché (il survit à un nouveau dessin de la scène des résultats)
let etat = { cle: null, html: "" };
const afficher = (html) => { etat.html = html; const z = $(ZONE); if (z) z.innerHTML = html; };

// les candidates d'une manche : [{ pseudo, code, nids }], dans l'ordre du match
export function candidates(sm, manche, tortues, nb = 1) {
  const vus = new Set(), l = [];
  const tri = sm.filter((s) => !estBot(s.pseudo)).sort((a, b) => b.nids - a.nids || a.rang - b.rang);
  for (const s of tri) {
    if (l.length >= nb) break;
    if (s.nids <= 0) continue;                                                            // aucun nid : pas au Panthéon
    if (!tortues.some((t) => t.pseudo === s.pseudo && t.manche <= manche)) continue;      // rien envoyé : la tortue de départ
    const code = codeDe(s.pseudo, manche, tortues), n = normaliser(code);
    if (vus.has(n) || codeConnu(code, EXTRA)) continue;                                   // copie d'un programme connu
    vus.add(n); l.push({ pseudo: s.pseudo, code, nids: s.nids });
  }
  return l;
}

export async function pantheonAuto({ manche, sm, tortues }) {
  const cle = `${S.code}:${manche}`;
  if (etat.cle === cle) { afficher(etat.html); return; }   // déjà en cours (ou fait) pour cette manche
  etat = { cle, html: "" };
  if (reglages.pantheonAuto === false) return afficher(`<p class="petit muted">🏛️ Panthéon automatique désactivé (⚙️ Réglages).</p>`);
  const fait = ((mesSalles()[S.code] || {}).pantheonAuto || {})[manche];
  if (fait) return afficher(resultatHTML(fait));
  const liste = candidates(sm, manche, tortues, reglages.pantheonNb === 3 ? 3 : 1);
  if (!liste.length) return afficher(`<p class="petit muted">🏛️ Aucune tortue de cette manche pour le Panthéon (il faut au moins un nid, et un programme inventé par l'élève).</p>`);
  // le banc d'essai, tortue par tortue
  const entrees = [];
  for (const [i, c] of liste.entries()) {
    const rendu = (k, n) => afficher(`<div class="pt-auto en-cours">🏛️ Banc d'essai du Panthéon : <b>${esc(c.pseudo)}</b>${liste.length > 1 ? ` (${i + 1} / ${liste.length})` : ""}
      <div class="jauge"><div style="width:${(100 * k) / n}%"></div><span>${k} / ${n} parties</span></div></div>`);
    rendu(0, BANC.parties);
    let r;
    try { r = await evaluerBanc(c.code, rendu); } catch { continue; }
    if (etat.cle !== cle) return;   // (la salle a changé entre-temps)
    if (r.moyenne > 0) entrees.push({ pseudo: c.pseudo, code: c.code, moyenne: r.moyenne, banc: BANC.version });
  }
  if (!entrees.length) return afficher(`<p class="petit muted">🏛️ Pas de tortue pour le Panthéon cette manche (0 nid en moyenne sur le banc d'essai).</p>`);
  let res;
  try { res = await db.pantheonClasse(S.code, S.secret, manche, entrees); }
  catch (e) {
    etat.cle = null;   // on pourra réessayer en revenant sur les résultats
    // (base pas encore à jour : une ligne discrète, ce n'est pas une erreur à montrer à la classe)
    return afficher(/pas prête/.test(e.message) ? `<p class="petit muted">🏛️ Panthéon automatique : bientôt disponible (la base de données doit être mise à jour).</p>` : `<p class="petit msg warn">🏛️ ${esc(e.message)}</p>`);
  }
  const lignes = res.filter((x) => x.statut !== "inconnue");
  memoriserSalle(S.code, S.secret, { pantheonAuto: { ...((mesSalles()[S.code] || {}).pantheonAuto || {}), [manche]: lignes } });
  afficher(resultatHTML(lignes));
}

function resultatHTML(lignes) {
  if (!lignes.length) return `<p class="petit muted">🏛️ Pas de nouvelle tortue au Panthéon cette manche.</p>`;
  const txt = (x) => ({
    nouveau: `🏛️ <b>${esc(x.pseudo)}</b> entre au Panthéon (<b>${place(x.rang)}</b>) !`,
    ameliore: `🏛️ <b>${esc(x.pseudo)}</b> améliore sa tortue du Panthéon : <b>${place(x.rang)}</b> !`,
    moins_bien: `🏛️ ${esc(x.pseudo)} : sa tortue déjà au Panthéon reste meilleure (${place(x.rang)}).`,
    deja: `🏛️ ${esc(x.pseudo)} : cette tortue est déjà au Panthéon (${place(x.rang)}).`,
    copie: `🏛️ ${esc(x.pseudo)} : ce programme est déjà au Panthéon (copie ?) : pas inscrite.`,
  }[x.statut] || "");
  return `<div class="pt-auto">${lignes.map((x) => `<div class="${["nouveau", "ameliore"].includes(x.statut) ? "pt-entre" : "petit"}">${txt(x)}${x.moyenne != null && ["nouveau", "ameliore"].includes(x.statut) ? ` <span class="petit muted">${nombre(x.moyenne)} nids en moyenne · ⏳ à vérifier</span>` : ""}</div>`).join("")}
    <div class="petit muted">L'élève retrouve son code Panthéon dans ses résultats, pour l'améliorer plus tard · <a href="pantheon.html" target="_blank">voir le Panthéon</a></div></div>`;
}
