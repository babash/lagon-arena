// =====================================================================
//  Lagon Arena — enseignant : élèves fictifs (MODE DÉMO uniquement, pour tester seul)
// =====================================================================
import { db, MODE } from "../db.js";
import { BOTS } from "../engine.js";
import { store, toast, jeton } from "../common.js";
import { S } from "./etat.js";

const NOMS = ["Kaweni", "Mtsamboro", "Bandrele", "Sada", "Chirongui", "Dembeni", "Acoua", "Pamandzi", "Ouangani", "Tsingoni"];
const COUL = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#42d4f4"];

export async function ajouterFaux() {
  const faux = store.get("lagon:faux:" + S.code, []);
  for (let i = 0; i < 3; i++) {
    const p = "Test_" + NOMS[faux.length % NOMS.length] + (faux.length >= NOMS.length ? faux.length : "");
    const j = jeton();
    try { await db.rejoindre(S.code, p, j, COUL[faux.length % COUL.length]); faux.push({ pseudo: p, jeton: j }); } catch (e) { toast(e.message, "err"); }
  }
  store.set("lagon:faux:" + S.code, faux);
  await envoyerFaux();
}

// les élèves fictifs envoient le code d'une tortue d'entraînement
export async function envoyerFaux() {
  const s = S.salle;
  if (MODE !== "demo" || !s || s.phase !== "prog") return;
  const faux = store.get("lagon:faux:" + S.code, []);
  for (const [i, f] of faux.entries()) {
    if (s.duel && !s.duel.includes(f.pseudo)) continue;
    try { await db.deposer(S.code, f.pseudo, f.jeton, s.manche, BOTS[(i + s.manche) % BOTS.length].code); } catch { /* rien */ }
  }
}
