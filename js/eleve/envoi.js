// =====================================================================
//  Lagon Arena — élève : ENVOYER sa tortue (et le chrono, avec envoi automatique à la fin)
// =====================================================================
import { db, secondesRestantes } from "../db.js";
import { check } from "../interp.js";
import { $, esc, toast, mmss } from "../common.js";
import { ed, verifier, quandModifie } from "./editeur.js";
import { S, LIBRE, SALLE, PSEUDO, memoriserEnvoi, estFinaliste, titreManche, tempsIllimite, ILLIMITE } from "./etat.js";
import { jourHeure } from "./ui.js";

export function majEnvoi() {
  if (LIBRE) return;
  const b = $("#envoyer"), box = $("#envoi"), s = S.salle, e = S.dernierEnvoi;
  b.classList.remove("pulse");
  if (!s || s.phase !== "prog") {
    b.disabled = true;
    box.innerHTML = `<div class="msg info">${!s || s.phase === "attente" ? "⏳ La manche n'a pas encore commencé : entraîne-toi dans le bac à sable !" : "🔒 Les envois sont fermés pour cette manche."}</div>`;
    return;
  }
  if (!estFinaliste()) {
    b.disabled = true;
    box.innerHTML = `<div class="msg info">⭐ ${esc(titreManche())} : seuls ${s.duel.map(esc).join(", ")} envoient une tortue. Regarde le match au tableau… et continue à t'entraîner !</div>`;
    return;
  }
  b.disabled = false;
  const envoye = e && e.manche === s.manche;
  if (envoye && e.code === ed.value) {
    b.textContent = "📤 Renvoyer";
    box.innerHTML = `<div class="msg ok">✅ Tortue envoyée pour la manche ${s.manche} (${jourHeure(e.at)}). Tu peux encore l'améliorer et la renvoyer ${tempsIllimite() ? "jusqu'au brawl, même depuis chez toi (🏠 Mon code de session)" : "avant la fin du chrono"}.</div>`;
  } else if (envoye) {
    b.textContent = "📤 Renvoyer"; b.classList.add("pulse");
    box.innerHTML = `<div class="msg warn">⚠️ Tu as modifié ton code depuis l'envoi. Renvoie-la, sinon c'est l'<b>ancienne version</b> qui jouera.</div>`;
  } else {
    b.textContent = "📤 Envoyer ma tortue"; b.classList.add("pulse");
    box.innerHTML = `<div class="msg warn">⏳ Pas encore envoyée. Si tu n'envoies rien, c'est ta tortue précédente (ou la tortue de départ) qui jouera.</div>`;
  }
}
quandModifie(majEnvoi);

let envoiEnCours = false;
async function envoyer(auto = false) {
  if (LIBRE || envoiEnCours) return;
  const c = check(ed.value);
  if (!c.ok) { verifier(); if (!auto) toast("Corrige l'erreur avant d'envoyer ta tortue.", "err"); return; }
  if (!S.salle || S.salle.phase !== "prog") { if (!auto) toast("Ce n'est pas le moment d'envoyer ta tortue.", "err"); return; }
  envoiEnCours = true;
  const code = ed.value, manche = S.salle.manche;
  try {
    const at = await db.deposer(SALLE, PSEUDO, S.jeton, manche, code);
    memoriserEnvoi({ manche, code, at: typeof at === "string" ? at : new Date().toISOString() });
    toast(auto ? "⏰ Chrono terminé : ta tortue a été envoyée automatiquement." : "📤 Tortue envoyée ! Elle jouera au prochain brawl.");
  } catch (e) { toast(e.message, "err"); }
  envoiEnCours = false;
  majEnvoi();
}
$("#envoyer").addEventListener("click", () => envoyer(false));

// le chrono (en haut) ; juste avant la fin, la tortue modifiée part toute seule si son code est correct
let autoEnvoiFait = "";
if (!LIBRE) setInterval(() => {
  const s = S.salle; if (!s) return;
  const c = $("#chrono");
  if (s.phase !== "prog" || !s.fin_chrono) { c.classList.add("cache"); return; }
  const r = secondesRestantes(s.fin_chrono);
  c.classList.remove("cache");
  if (r > ILLIMITE) { c.textContent = "♾️ Temps illimité"; c.classList.remove("alerte"); return; }
  c.textContent = r > 0 ? "⏱️ " + mmss(r) : "⏱️ Temps écoulé";
  c.classList.toggle("alerte", r <= 30);
  const cle = s.manche + "";
  if (r <= 3 && r > -8 && autoEnvoiFait !== cle && estFinaliste()) {
    autoEnvoiFait = cle;
    const e = S.dernierEnvoi, envoye = e && e.manche === s.manche && e.code === ed.value;
    if (!envoye && check(ed.value).ok) envoyer(true);
  }
}, 250);
