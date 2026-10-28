// =====================================================================
//  Lagon Arena — tutoriel avancé, niveau 👥 ÉQUIPE
//  S'entraider (donner, se protéger à deux), la mission « La nourrice »,
//  plusieurs équipes : le classement en direct et l'équipe rivale.
// =====================================================================
import { MISSIONS_AVANCEES, P, EQUIPES } from "../engine.js";
import { CodeView } from "../editor.js";
import { $ } from "../common.js";
import { capt, act, exemple, exercice, etapeMission } from "../tutokit.js";
import { EQ_C, EQ_A, RIVALE_C, table, carteFin } from "./commun.js";

export const ETAPES_EQUIPE = [];

export { CODE_EQUIPE } from "./strategies.js";
import { CODE_EQUIPE } from "./strategies.js";

// ---------- 1. Jouer en équipe ----------
ETAPES_EQUIPE.push({
  court: "1", titre: "Jouer en équipe",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>👥 Jouer en équipe</h2>
      <ul class="points">
        <li>Ton enseignant peut lancer une manche <b>en équipes</b> : 2 équipes ou plus (${[1, 2, 3, 4].map((e) => `${EQUIPES[e].icone} ${EQUIPES[e].nom}`).join(", ")}…). Tu sais <b>avant la manche</b> avec qui tu joues : mettez-vous d'accord sur une stratégie !</li>
        <li><b>Seul le rang de l'équipe compte</b> (on compare la moyenne des nids de ses tortues) : aider une équipière rapporte autant que pondre soi-même !</li>
        <li>🛡️ Deux équipières <b>collées</b> sont protégées des requins. On ne peut pas pousser une équipière.</li>
        <li>🎁 ${act("donner")} passe ${P.don} ⚡ à une équipière collée à toi. ${act("aller_vers_equipiere")} va la rejoindre.</li>
      </ul>
      ${table(EQ_C.filter((c) => !RIVALE_C.includes(c)))}${table(EQ_A)}
    </div><div class="card"><h3>🔬 Essaie :</h3><div id="ex"></div></div></div>`;
    exemple($("#ex", box), "if equipiere_fatiguee() and energie() >= 8:\n    donner()\nelif requin_derriere_adversaire():\n    pousser()\nelif requin_proche() and not equipiere_a_cote():\n    aller_vers_equipiere()\nelse:\n    aller_vers_algue()",
      ["equipiere_fatiguee", "requin_derriere_adversaire", "requin_proche", "equipiere_a_cote", { nom: "energie", min: 0, max: 10 }],
      { equipiere_fatiguee: true, requin_derriere_adversaire: false, requin_proche: false, equipiere_a_cote: true, energie: 9 });
  },
});

// ---------- 2. S'entraider ----------
ETAPES_EQUIPE.push({
  court: "2", titre: "S'entraider", cle: "equipe",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🤝 S'entraider</h2>
      <ul class="points">
        <li>Une équipière sur la plage avec moins de ${P.energiePonte} ⚡ ne peut pas pondre : ${capt("equipiere_fatiguee")} devient vrai.</li>
        <li>Donner coûte : garde assez d'énergie pour toi (par exemple <b>8 ou plus</b> avant de donner).</li>
        <li>Une adversaire collée à toi devant un requin ? ${capt("requin_derriere_adversaire")}… et ${act("pousser")} !</li>
      </ul>
    </div><div class="card" id="exo"></div></div>`;
    exercice($("#exo", box), {
      cle: "equipe", avance: true,
      consigne: "Écris : « Si une équipière collée à toi est <b>fatiguée</b> et que tu as <b>au moins 8</b> d'énergie : donner. <b>Sinon si</b> une adversaire collée à toi peut être poussée sur un requin : pousser. <b>Sinon</b> : aller vers les algues libres. »",
      cas: [
        { texte: "🤝😓 équipière fatiguée, ⚡ 9", sit: { equipiere_fatiguee: true, equipiere_a_cote: true, tortue_a_cote: true, energie: 9 }, attendu: "donner" },
        { texte: "🤝😓 équipière fatiguée, ⚡ 5", sit: { equipiere_fatiguee: true, equipiere_a_cote: true, tortue_a_cote: true, energie: 5 }, attendu: "aller_vers_algue_libre" },
        { texte: "⚔️🦈 adversaire devant un requin", sit: { requin_derriere_adversaire: true, requin_derriere_tortue: true, adversaire_a_cote: true, tortue_a_cote: true, energie: 9 }, attendu: "pousser" },
        { texte: "😌 personne autour", sit: { energie: 9 }, attendu: "aller_vers_algue_libre" },
      ],
      solution: "def tour():\n    if equipiere_fatiguee() and energie() >= 8:\n        donner()\n    elif requin_derriere_adversaire():\n        pousser()\n    else:\n        aller_vers_algue_libre()\n",
      indice: "Trois cas : <code>if … and energie() &gt;= 8:</code>, puis <code>elif requin_derriere_adversaire():</code>, puis <code>else:</code>.",
      outils: { capteurs: ["equipiere_fatiguee", "requin_derriere_adversaire", "equipiere_a_cote", "energie"], actions: ["donner", "pousser", "aller_vers_algue_libre"], mots: ["if", "elif", "else", "and"] },
    });
  },
});

// ---------- M. Mission : la nourrice ----------
const A3 = MISSIONS_AVANCEES[2];
ETAPES_EQUIPE.push(etapeMission({
  court: "M", cle: "a3", titre: A3.titre, notion: A3.notion, avance: true, equipe: A3.equipe,
  probleme: A3.probleme, objectif: A3.objectif, code: A3.code, indice: A3.indice, solution: A3.solution, appris: A3.appris,
  scenario: A3.scenario, autres: A3.autres, graine: 7, reussi: A3.reussi, bilan: A3.bilan,
}));

// ---------- 3. Plusieurs équipes : la rivale ----------
ETAPES_EQUIPE.push({
  court: "3", titre: "L'équipe rivale", cle: "rivale",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🎯 Plusieurs équipes : la rivale</h2>
      <ul class="points">
        <li>Avec 3 équipes ou plus, toutes les adversaires ne se valent pas : l'équipe <b>rivale</b> est la <b>meilleure des autres</b> en ce moment.</li>
        <li>${capt("rang_equipe")} dit à quelle place est ton équipe (1 = en tête), ${capt("equipe_en_tete")} si elle mène.</li>
        <li>${act("pousser")} vise <b>d'abord</b> une tortue de l'équipe rivale.</li>
        <li>Les 🤖 ne sont dans aucune équipe : ce sont des adversaires de tout le monde.</li>
      </ul>
      ${table(RIVALE_C)}
      <h3>🔬 Essaie :</h3><div id="ex"></div>
    </div><div class="card" id="exo"></div></div>`;
    exemple($("#ex", box), "if rivale_a_cote() and requin_derriere_adversaire():\n    pousser()\nelif not equipe_en_tete() and equipiere_fatiguee():\n    donner()\nelse:\n    aller_vers_algue()",
      ["rivale_a_cote", "requin_derriere_adversaire", "equipe_en_tete", "equipiere_fatiguee"],
      { rivale_a_cote: true, requin_derriere_adversaire: false, equipe_en_tete: false, equipiere_fatiguee: true });
    exercice($("#exo", box), {
      cle: "rivale", avance: true,
      consigne: "Écris : « Si une tortue de l'équipe <b>rivale</b> est collée à toi <b>et</b> qu'elle peut être poussée sur un requin : pousser. <b>Sinon si</b> ton équipe n'est <b>pas en tête</b> et qu'une équipière est fatiguée : donner. <b>Sinon</b> : aller vers les algues. »",
      cas: [
        { texte: "🎯🦈 rivale devant un requin", sit: { rivale_a_cote: true, requin_derriere_adversaire: true, adversaire_a_cote: true, tortue_a_cote: true }, attendu: "pousser" },
        { texte: "🎯 rivale à côté, pas de requin", sit: { rivale_a_cote: true, adversaire_a_cote: true, tortue_a_cote: true }, attendu: "aller_vers_algue" },
        { texte: "🥈 2e place, équipière fatiguée", sit: { equipe_en_tete: false, rang_equipe: 2, equipiere_fatiguee: true, equipiere_a_cote: true, tortue_a_cote: true }, attendu: "donner" },
        { texte: "👑 en tête, équipière fatiguée", sit: { equipe_en_tete: true, rang_equipe: 1, equipiere_fatiguee: true, equipiere_a_cote: true, tortue_a_cote: true }, attendu: "aller_vers_algue" },
      ],
      solution: "def tour():\n    if rivale_a_cote() and requin_derriere_adversaire():\n        pousser()\n    elif not equipe_en_tete() and equipiere_fatiguee():\n        donner()\n    else:\n        aller_vers_algue()\n",
      indice: "Trois cas : <code>if rivale_a_cote() and requin_derriere_adversaire():</code>, puis <code>elif not equipe_en_tete() and equipiere_fatiguee():</code>, puis <code>else:</code>.",
      outils: { capteurs: ["rivale_a_cote", "requin_derriere_adversaire", "equipe_en_tete", "equipiere_fatiguee", "rang_equipe"], actions: ["pousser", "donner", "aller_vers_algue"], mots: ["if", "elif", "else", "and", "not"] },
    });
  },
});

// ---------- 🏆 Stratégie d'équipe ----------
ETAPES_EQUIPE.push({
  court: "🏆", titre: "Stratégie d'équipe",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🏆 Une stratégie d'équipe</h2>
      <p>Cette tortue reste avec ses équipières face aux requins (à deux, on est protégées), donne de l'énergie à celles qui en manquent et pousse les rivales sur les requins.</p>
      <div id="strat"></div>
      <div class="msg info">💡 Avant une manche en équipes, <b>parlez-vous</b> : qui va manger loin ? qui reste près de la plage pour aider ? Une équipe où chaque tortue a un rôle bat souvent une équipe de « Championnes » !</div>
    </div><div class="card"><div id="fin-niveau"></div>
      <h3 style="margin-top:16px">📋 Les primitives d'équipe</h3>${table(EQ_C)}${table(EQ_A)}
    </div></div>`;
    new CodeView($("#strat", box)).setCode(CODE_EQUIPE);
    carteFin(box, ["moyen", "expert"]);
  },
});
