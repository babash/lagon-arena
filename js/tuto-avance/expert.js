// =====================================================================
//  Lagon Arena — tutoriel avancé, niveau 🥇 EXPERT : lire le lagon, choisir ses algues
//  Les algues les plus proches ne sont pas toujours les meilleures : gardées par un requin,
//  loin des plages, presque vides… Certaines zones sont pleines de requins et sans algues.
// =====================================================================
import { P } from "../engine.js";
import { CodeView } from "../editor.js";
import { $ } from "../common.js";
import { capt, exemple, exercice, quiz } from "../tutokit.js";
import { ALG_C, table, carteFin } from "./commun.js";

export const ETAPES_EXPERT = [];

// une stratégie d'expert (elle bat la Championne en moyenne : vérifié par simulation)
export const CODE_EXPERT = `def tour():
    if requin_proche() and not sur_plage():
        fuir()
    elif sur_plage() and est_la_nuit() and energie() >= 6:
        pondre()
    elif est_la_nuit() and energie() >= 6:
        aller_vers_plage()
    elif requins_autour() >= 2 and algues_autour() == 0 and not sur_plage():
        aller_vers_plage()
    elif heure() >= 16 and energie() >= 8 and not algue_pres_plage():
        aller_vers_plage()
    elif algue_ici() and not plastique_ici() and energie() < 10:
        manger()
    elif portions_algue() <= 1 and algues_autour() >= 2:
        aller_vers_algue_libre()
    else:
        aller_vers_algue()
`;

// ---------- 1. Lire le lagon ----------
ETAPES_EXPERT.push({
  court: "1", titre: "Lire le lagon",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🌿 Lire le lagon</h2>
      <ul class="points">
        <li>Chaque partie se joue dans un <b>lagon différent</b> : ta tortue ne peut pas apprendre la carte par cœur, elle doit <b>observer</b>.</li>
        <li>Les algues les plus proches ne sont pas toujours les meilleures : un <b>requin</b> peut rôder autour, elles peuvent être <b>loin des plages</b>, ou presque <b>vides</b>.</li>
        <li>Certaines zones sont pleines de requins et sans algues : mieux vaut en <b>sortir</b> !</li>
        <li>Ces capteurs ne déplacent pas ta tortue : ils l'aident à <b>choisir</b> entre les ordres que tu connais (plage, algues, algues libres, se cacher…).</li>
      </ul>
      ${table(ALG_C)}
    </div><div class="card"><h3>🔬 Essaie : bouge les curseurs</h3><div id="ex"></div></div></div>`;
    exemple($("#ex", box), "if requins_autour() >= 2 and not sur_plage():\n    aller_vers_plage()\nelif algue_ici() and requins_pres_algue() == 0:\n    manger()\nelif portions_algue() <= 1 and algues_autour() >= 2:\n    aller_vers_algue_libre()\nelse:\n    aller_vers_algue()",
      [{ nom: "requins_autour", min: 0, max: 4 }, "sur_plage", "algue_ici", { nom: "requins_pres_algue", min: 0, max: 3 }, { nom: "portions_algue", min: 0, max: P.portionsHerbier }, { nom: "algues_autour", min: 0, max: 6 }],
      { requins_autour: 0, sur_plage: false, algue_ici: false, requins_pres_algue: 0, portions_algue: 1, algues_autour: 3 });
  },
});

// ---------- 2. Comparer ----------
ETAPES_EXPERT.push({
  court: "2", titre: "Comparer", cle: "x-comparer",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>⚖️ Comparer deux choix</h2>
      <p>Un expert compare : « les algues <b>sûres</b> sont-elles beaucoup plus loin que les plus proches ? »</p>
      <div class="msg info"><code>distance_algue_sure() &lt;= distance_algue() + 3</code><br>veut dire « les algues sans requin sont au plus 3 cases plus loin ».</div>
      <p>Et quand il n'y a <b>aucune</b> algue sûre, ${capt("distance_algue_sure")} vaut <b>99</b>.</p>
    </div><div class="card" id="q"></div></div>`;
    const opts = [[true, "True"], [false, "False"]];
    const questions = [
      { texte: `${capt("distance_algue")} vaut <b>2</b> et ${capt("distance_algue_sure")} vaut <b>4</b>.<br>Que vaut <code>distance_algue_sure() &lt;= distance_algue() + 3</code> ?`, bon: true, pourquoi: "2 + 3 = 5, et 4 ≤ 5 : les algues sûres ne sont que 2 cases plus loin." },
      { texte: `${capt("distance_algue")} vaut <b>2</b> et ${capt("distance_algue_sure")} vaut <b>99</b>.<br>Que vaut <code>distance_algue_sure() &lt;= distance_algue() + 3</code> ?`, bon: false, pourquoi: "99 veut dire « aucune algue sûre » : 99 n'est pas ≤ 5." },
      { texte: `${capt("requins_autour")} vaut <b>3</b> et ${capt("algues_autour")} vaut <b>0</b>.<br>Que vaut <code>requins_autour() &gt;= 2 and algues_autour() == 0</code> ?`, bon: true, pourquoi: "Beaucoup de requins et rien à manger : c'est une zone à quitter !" },
      { texte: `${capt("portions_algue")} vaut <b>1</b> et ${capt("algues_autour")} vaut <b>1</b>.<br>Que vaut <code>portions_algue() &lt;= 1 and algues_autour() &gt;= 2</code> ?`, bon: false, pourquoi: "1 ≥ 2 est faux : il n'y a pas d'autre touffe autour, autant finir celle-ci." },
    ].map((q) => ({ ...q, options: opts }));
    questions.cle = "x-comparer";
    quiz($("#q", box), "🧮 Vrai ou faux ?", questions);
  },
});

// ---------- 3. La zone dangereuse ----------
ETAPES_EXPERT.push({
  court: "3", titre: "Zone dangereuse", cle: "algues",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🦈 La zone dangereuse</h2>
      <ul class="points">
        <li>${capt("requins_autour")} compte les requins à ${P.zone} cases ou moins : à <b>2 ou plus</b>, la zone est dangereuse.</li>
        <li>${capt("requins_pres_algue")} dit si les algues les plus proches sont <b>gardées</b>.</li>
        <li>Dans les algues, ${"<code>se_cacher()</code>"} rend la tortue invisible.</li>
      </ul>
    </div><div class="card" id="exo"></div></div>`;
    exercice($("#exo", box), {
      cle: "algues", avance: true,
      consigne: "Écris : « Si <b>au moins 2 requins</b> sont autour de toi : aller vers la plage. <b>Sinon si</b> un requin rôde près des algues les plus proches : se cacher. <b>Sinon</b> : aller vers les algues. »",
      cas: [
        { texte: "🦈🦈 2 requins autour de toi", sit: { requins_autour: 2, requins_pres_algue: 1 }, attendu: "aller_vers_plage" },
        { texte: "🦈🦈🦈 3 requins, algues gardées", sit: { requins_autour: 3, requins_pres_algue: 2 }, attendu: "aller_vers_plage" },
        { texte: "🌿🦈 1 requin près des algues", sit: { requins_autour: 1, requins_pres_algue: 1 }, attendu: "se_cacher" },
        { texte: "😌 tout est calme", sit: { requins_autour: 0, requins_pres_algue: 0 }, attendu: "aller_vers_algue" },
      ],
      solution: "def tour():\n    if requins_autour() >= 2:\n        aller_vers_plage()\n    elif requins_pres_algue() >= 1:\n        se_cacher()\n    else:\n        aller_vers_algue()\n",
      indice: "Trois cas : <code>if requins_autour() &gt;= 2:</code>, puis <code>elif requins_pres_algue() &gt;= 1:</code>, puis <code>else:</code>.",
      outils: { capteurs: ["requins_autour", "requins_pres_algue", "algues_autour", "portions_algue"], actions: ["aller_vers_plage", "se_cacher", "aller_vers_algue"], mots: ["if", "elif", "else"] },
    });
  },
});

// ---------- 4. Le bon repas ----------
ETAPES_EXPERT.push({
  court: "4", titre: "Le bon repas", cle: "x-repas",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🍽️ Le bon repas</h2>
      <ul class="points">
        <li>Une touffe a ${P.portionsHerbier} repas. ${capt("portions_algue")} dit combien il en reste dans les algues les plus proches.</li>
        <li>Une touffe presque vide va disparaître : s'il y en a d'autres autour (${capt("algues_autour")}), autant viser des <b>algues libres</b>.</li>
      </ul>
    </div><div class="card" id="exo"></div></div>`;
    exercice($("#exo", box), {
      cle: "x-repas", avance: true,
      consigne: "Écris : « Si un requin rôde près des algues les plus proches : se cacher. <b>Sinon si</b> tu es sur des algues : manger. <b>Sinon si</b> les algues les plus proches n'ont plus qu'<b>1 repas ou moins</b> : aller vers les algues libres. <b>Sinon</b> : aller vers les algues. »",
      cas: [
        { texte: "🌿🦈 un requin près des algues", sit: { requins_pres_algue: 1, algue_ici: true, portions_algue: 4 }, attendu: "se_cacher" },
        { texte: "🌿 sur des algues, calme", sit: { algue_ici: true, portions_algue: 4 }, attendu: "manger" },
        { texte: "🍽️ touffe presque vide (1 repas)", sit: { portions_algue: 1, algues_autour: 3 }, attendu: "aller_vers_algue_libre" },
        { texte: "🌿🌿 touffe pleine, plus loin", sit: { portions_algue: 5 }, attendu: "aller_vers_algue" },
      ],
      solution: "def tour():\n    if requins_pres_algue() >= 1:\n        se_cacher()\n    elif algue_ici():\n        manger()\n    elif portions_algue() <= 1:\n        aller_vers_algue_libre()\n    else:\n        aller_vers_algue()\n",
      indice: "Quatre cas, dans l'ordre : <code>if requins_pres_algue() &gt;= 1:</code>, <code>elif algue_ici():</code>, <code>elif portions_algue() &lt;= 1:</code>, <code>else:</code>.",
      outils: { capteurs: ["requins_pres_algue", "algue_ici", "portions_algue", "algues_autour"], actions: ["se_cacher", "manger", "aller_vers_algue_libre", "aller_vers_algue"], mots: ["if", "elif", "else"] },
    });
  },
});

// ---------- 5. Dîner près de la plage ----------
ETAPES_EXPERT.push({
  court: "5", titre: "Dîner près de la plage", cle: "x-nuit",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🌅 Dîner près de la plage</h2>
      <ul class="points">
        <li>L'après-midi, mieux vaut manger <b>près d'une plage</b> : la nuit venue, il n'y aura que quelques cases à faire pour pondre.</li>
        <li>${capt("algue_pres_plage")} : les algues les plus proches sont-elles à ${P.plageProche} cases ou moins d'une plage ?</li>
        <li>Si elles sont loin, il vaut mieux <b>partir</b> vers la plage.</li>
      </ul>
    </div><div class="card" id="exo"></div></div>`;
    exercice($("#exo", box), {
      cle: "x-nuit", avance: true,
      consigne: "Écris : « Si l'heure est <b>15 ou plus</b> et que les algues les plus proches sont <b>près d'une plage</b> : aller vers les algues. <b>Sinon si</b> l'heure est 15 ou plus : aller vers la plage. <b>Sinon</b> : aller vers les algues. »",
      cas: [
        { texte: "🕒 16 h, algues près d'une plage", sit: { heure: 16, algue_pres_plage: true }, attendu: "aller_vers_algue" },
        { texte: "🕒 16 h, algues loin des plages", sit: { heure: 16, algue_pres_plage: false }, attendu: "aller_vers_plage" },
        { texte: "🕙 10 h, algues loin des plages", sit: { heure: 10, algue_pres_plage: false }, attendu: "aller_vers_algue" },
      ],
      solution: "def tour():\n    if heure() >= 15 and algue_pres_plage():\n        aller_vers_algue()\n    elif heure() >= 15:\n        aller_vers_plage()\n    else:\n        aller_vers_algue()\n",
      indice: "La première ligne : <code>if heure() &gt;= 15 and algue_pres_plage():</code>",
      outils: { capteurs: ["heure", "algue_pres_plage", "distance_plage"], actions: ["aller_vers_algue", "aller_vers_plage"], mots: ["if", "elif", "else", "and"] },
    });
  },
});

// ---------- 🏆 Le défi expert ----------
ETAPES_EXPERT.push({
  court: "🏆", titre: "Le défi expert",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🏆 Le défi : une stratégie d'expert</h2>
      <p>Cette tortue lit le lagon : elle quitte les zones à requins sans algues, rentre tôt quand ses algues sont loin des plages, et laisse les touffes presque vides. En moyenne, elle <b>bat la Championne</b> 🤖.</p>
      <div id="expert"></div>
      <div class="msg info">💡 Défi : copie-la dans le bac à sable, clique sur <b>📊 Estimer</b>, puis améliore-la pour monter sa moyenne d'œufs. Change une seule chose à la fois, et compare !</div>
    </div><div class="card"><div id="fin-niveau"></div>
      <h3 style="margin-top:16px">📋 Les capteurs pour choisir ses algues</h3>${table(ALG_C)}
    </div></div>`;
    new CodeView($("#expert", box)).setCode(CODE_EXPERT);
    carteFin(box, ["equipe"]);
  },
});
