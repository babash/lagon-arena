// =====================================================================
//  Lagon Arena — élève : le bouton « 🧩 Mes règles » sous l'éditeur (voir regles-panneau.js)
// =====================================================================
import { panneauRegles } from "../regles-panneau.js";
import { $ } from "../common.js";
import { ed, remplacerCode, quandModifie } from "./editeur.js";

const box = $("#mes-regles");
const { dessiner } = panneauRegles(box, { lire: () => ed.value, ecrire: remplacerCode });
$("#regles-btn").addEventListener("click", () => {
  box.classList.toggle("cache");
  $("#regles-btn").classList.toggle("on", !box.classList.contains("cache"));
  dessiner();
});
let minu = null;
quandModifie(() => { clearTimeout(minu); minu = setTimeout(dessiner, 300); });
