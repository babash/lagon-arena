// =====================================================================
//  Lagon Arena — tutoriel avancé : ce qui sert aux trois niveaux
// =====================================================================
import { simulate, BOTS, BOT_PIRATE } from "../engine.js";
import { CAPTEURS, ACTIONS_INFO, setAvance, estAvance } from "../primitives.js";
import { $, esc, toast, lienPartie } from "../common.js";

// les trois niveaux (cle = la progression gardée dans ce navigateur)
export const NIVEAUX = {
  moyen: { icone: "🥈", titre: "Intermédiaire", cle: "lagon:tuto-avance",   // (même clé qu'avant : les étoiles déjà gagnées sont gardées)
    resume: "Les distances, <code>or</code> / <code>not</code>, les algues libres, <b>pousser</b> une tortue (sur un requin…), partir avant la nuit.", defi: "battre la Pirate 🏴‍☠️" },
  expert: { icone: "🥇", titre: "Expert", cle: "lagon:tuto-expert",
    resume: "<b>Lire le lagon</b> : requins autour, algues sûres, touffes presque vides, algues près des plages… pour choisir les meilleures algues.", defi: "une stratégie d'expert" },
  equipe: { icone: "👥", titre: "Équipe", cle: "lagon:tuto-equipe",
    resume: "S'entraider (<b>donner</b> de l'énergie, se protéger à deux), et jouer contre plusieurs équipes : viser l'équipe <b>rivale</b>.", defi: "une stratégie d'équipe" },
};

// les primitives par niveau
export const AV_C = CAPTEURS.filter((c) => c.avance), AV_A = ACTIONS_INFO.filter((a) => a.avance);
export const AV_BASE = AV_C.filter((c) => !c.groupe);                        // intermédiaire
export const ALG_C = AV_C.filter((c) => c.groupe === "algues");              // expert : choisir ses algues
export const EQ_C = CAPTEURS.filter((c) => c.equipe), EQ_A = ACTIONS_INFO.filter((a) => a.equipe);
export const RIVALE_C = EQ_C.filter((c) => ["rang_equipe", "equipe_en_tete", "equipe_rivale", "nids_adversaires", "rivale_a_cote"].includes(c.nom));
export const table = (l) => `<table class="prims">${l.map((p) => `<tr><td>${p.icone}</td><td><code>${p.nom}()</code></td><td>${esc(p.role)}</td></tr>`).join("")}</table>`;

// un match de démonstration (5 tortues d'entraînement + la Pirate), sur la carte classique
let demo = null;
const COUL = ["#ff7b5c", "#ffc93c", "#4363d8", "#f032e6", "#3cb44b", "#111111"];
export const matchDemo = () => demo ||= simulate({
  joueurs: [...BOTS, BOT_PIRATE].map((b, i) => ({ id: b.nom, nom: b.nom, couleur: COUL[i], code: b.code })), graine: 77, twist: "calme", version: 1,
});

// la carte de fin de niveau : activer le mode avancé, s'entraîner, rejoindre la partie, niveau suivant
export function carteFin(box, suivants = []) {
  const c = $("#fin-niveau", box);
  c.innerHTML = `<h3>🚀 Active le mode avancé</h3>
    <p>Les primitives avancées apparaîtront dans l'autocomplétion et la boîte à outils de ta page élève (et la Pirate jouera dans ton bac à sable).</p>
    <p id="etat-av"></p>
    <div class="row">
      <button class="btn" id="activer">🚀 Activer le mode avancé</button>
      <a class="btn vert" href="eleve.html?libre=1">🧪 Bac à sable</a>
      <a class="btn ghost" href="${lienPartie()}">🐢 Rejoindre la partie</a>
    </div>
    ${suivants.length ? `<h3 style="margin-top:16px">➡️ Niveau suivant</h3><div class="row">${suivants.map((n) => `<a class="btn ghost" href="tuto-avance.html?niveau=${n}">${NIVEAUX[n].icone} ${NIVEAUX[n].titre}</a>`).join("")}</div>` : ""}`;
  const maj = () => { $("#etat-av", c).innerHTML = estAvance() ? "✅ Mode avancé <b>activé</b>." : "Mode avancé <b>désactivé</b>."; $("#activer", c).textContent = estAvance() ? "Désactiver le mode avancé" : "🚀 Activer le mode avancé"; };
  $("#activer", c).addEventListener("click", () => { setAvance(!estAvance()); maj(); toast(estAvance() ? "🚀 Mode avancé activé !" : "Mode simple."); });
  maj();
}
