// =====================================================================
//  Lagon Arena — écran ENSEIGNANT (à projeter au tableau) : démarrage
//  Les modules : etat.js (état, pilotage) · accueil.js · salle.js · scenes.js (ce qui est projeté)
//                preparer.js (préparer la manche) · liens.js (liens, codes de session) · demo.js
// =====================================================================
import { synchroniserHorloge } from "../db.js";
import { $, toast } from "../common.js";
import { mesSalles, memoriserSalle, navigation } from "./etat.js";
import { accueil } from "./accueil.js";
import { ouvrir } from "./salle.js";

navigation.accueil = accueil;
$("#plein").addEventListener("click", () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); });
$("#panneau").addEventListener("click", () => { const l = $(".prof-layout"); if (l) l.classList.toggle("plein"); });

await synchroniserHorloge();
const demande = (new URLSearchParams(location.search).get("salle") || "").toUpperCase();
// lien enseignant (…prof.html?salle=ABCD#cle=…) : la salle s'ajoute à « Mes salles » de cet ordinateur
const cleLien = new URLSearchParams(location.hash.slice(1)).get("cle");
if (demande && cleLien) {
  memoriserSalle(demande, cleLien);
  history.replaceState(null, "", "prof.html?salle=" + demande);
  toast(`🏠 Salle ${demande} ajoutée à vos salles sur cet ordinateur.`);
}
if (demande && mesSalles()[demande]) ouvrir(demande); else accueil();
