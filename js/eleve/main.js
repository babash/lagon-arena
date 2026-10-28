// =====================================================================
//  Lagon Arena — écran ÉLÈVE : programmer, tester, envoyer, comprendre (démarrage)
//  Les modules : etat.js (qui je suis, la salle) · ui.js (onglets, fenêtres) · editeur.js
//                bac.js (bac à sable, estimation) · envoi.js · session.js (code de session)
//                manche.js (suivre la salle) · resultats.js (résultats, classement)
// =====================================================================
import { MODE, synchroniserHorloge } from "../db.js";
import { $, el } from "../common.js";
import { S, LIBRE, SALLE } from "./etat.js";
import "./ui.js";
import "./editeur.js";
import { tester } from "./bac.js";
import { majEnvoi } from "./envoi.js";
import { recupererDerniereTortue, annoncerCodeSession } from "./session.js";
import { majInfo, rafraichir } from "./manche.js";
import "./resultats.js";

document.body.classList.add(LIBRE ? "mode-libre" : "mode-salle");

if (LIBRE) {   // bac à sable seul, sans salle
  $("#info").append(el("span", { class: "pill" }, "🧪 Bac à sable"));
  if (MODE === "demo") $("#info").append(el("span", { class: "pill mode-demo" }, "Mode démo"));
  tester();
} else if (!S.jeton) {   // pas encore inscrit dans cette salle sur ce navigateur
  location.replace(`index.html?salle=${encodeURIComponent(SALLE)}`);
} else {
  majInfo(); majEnvoi();
  await synchroniserHorloge();
  await rafraichir(true);
  setInterval(rafraichir, 2000);
  await recupererDerniereTortue();
  annoncerCodeSession();
}
