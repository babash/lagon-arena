// =====================================================================
//  Lagon Arena — élève : le CODE DE SESSION (se reconnecter depuis un autre ordinateur)
//  et la dernière tortue envoyée, retrouvée sur un nouvel ordinateur.
// =====================================================================
import { db } from "../db.js";
import { $, esc, toast, store, copier, lienSite, sansProtocole, nouveauCodePerso, jetonDuCode, codeLisible } from "../common.js";
import { remplacerCode } from "./editeur.js";
import { majEnvoi } from "./envoi.js";
import { S, LIBRE, SALLE, PSEUDO, cleCode, memoriserEnvoi, memoriserSession, configActuelle, tempsIllimite } from "./etat.js";
import { overlay } from "./ui.js";

// Les élèves arrivés avant les codes de session en reçoivent un (si la base de données est à jour).
export async function assurerCodeSession() {
  if (LIBRE || S.codeSession) return S.codeSession;
  const code = nouveauCodePerso(), nv = jetonDuCode(code);
  try { await db.changerJeton(SALLE, PSEUDO, S.jeton, nv); memoriserSession(nv, code); }
  catch { /* base de données pas encore à jour : pas de code de session */ }
  return S.codeSession;
}

export async function montrerCodeSession() {
  const code = await assurerCodeSession();
  if (!code) {
    overlay(`<h2>🏠 Continuer sur un autre ordinateur</h2><p>Ton code de session n'est pas encore disponible : ton enseignant doit mettre à jour la base de données.</p>
      <p>En attendant, sur l'autre ordinateur, demande à ton enseignant de <b>débloquer ton pseudo</b> (🔓).</p>`, true);
    return;
  }
  const lien = lienSite(`index.html?salle=${encodeURIComponent(SALLE)}&pseudo=${encodeURIComponent(PSEUDO)}#code=${code}`);
  overlay(`<h2>🏠 Continuer chez toi (ou sur un autre ordinateur)</h2>
    <ol class="etapes-code">
      <li>Va sur <b>${esc(sansProtocole(lienSite("index.html")))}</b></li>
      <li>Salle <b class="gros-code">${esc(SALLE)}</b> · pseudo <b>${esc(PSEUDO)}</b></li>
      <li>Clique sur « 🏠 Tu reviens depuis un autre ordinateur ? » et tape ton <b>code de session</b> :</li>
    </ol>
    <div class="code-perso">${codeLisible(code)}</div>
    <p>✍️ <b>Note-le dans ton cahier.</b> Ne le donne à personne : avec ce code, on peut envoyer une tortue à ta place.</p>
    <p class="petit">Ou garde ce lien personnel (il remplit tout seul le code) : <button class="btn small ghost" id="copier-lien">📋 Copier mon lien</button></p>
    <p class="petit muted">Sur l'autre ordinateur, tu retrouves ta dernière tortue envoyée et tes points. Pendant une <b>manche à temps illimité</b>, tu peux continuer à la programmer et la renvoyer jusqu'au brawl. Pense à l'envoyer avant de quitter un ordinateur : c'est elle que tu retrouveras sur l'autre.</p>`, true);
  $("#copier-lien").addEventListener("click", () => copier(lien).then(() => toast("Lien copié !"), () => toast(lien)));
}

// à la première visite : pendant une manche longue (devoir…), on montre tout de suite le code ; sinon, un petit message
export async function annoncerCodeSession() {
  const c = await assurerCodeSession();
  const vu = `lagon:vuCode:${SALLE}:${PSEUDO}`;
  if (!c || store.get(vu)) return;
  store.set(vu, 1);
  const long = tempsIllimite() || !!(configActuelle() || {}).illimite;
  if (long) setTimeout(montrerCodeSession, 1200);
  else setTimeout(() => toast("🏠 Pour te reconnecter depuis un autre ordinateur (chez toi…), note ton code de session : bouton « 🏠 Mon code de session » en haut."), 2500);
}

// sur un nouvel ordinateur : on retrouve la dernière tortue envoyée (même celle de la manche en cours)
export async function recupererDerniereTortue() {
  if (LIBRE) return;
  let t = null;
  try { t = await db.maTortue(SALLE, PSEUDO, S.jeton); } catch { return; }   // (base pas à jour : comportement d'avant)
  if (!t) return;
  const e = S.dernierEnvoi;
  if (!e || t.manche > e.manche || (t.manche === e.manche && t.code !== e.code)) memoriserEnvoi({ manche: t.manche, code: t.code, at: t.depose_le || new Date().toISOString() });
  if (!store.get(cleCode)) remplacerCode(t.code);
  majEnvoi();
}
