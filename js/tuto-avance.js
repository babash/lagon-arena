// =====================================================================
//  Lagon Arena — tutoriel AVANCÉ (niveau intermédiaire)
//  Le lagon qui bouge, les distances, or / not, les algues libres,
//  pousser une tortue (sur un requin…), anticiper la nuit.
// =====================================================================
import { simulate, BOTS, BOT_PIRATE, MISSIONS_AVANCEES, P, EQUIPES } from "./engine.js";
import { CodeView } from "./editor.js";
import { MatchViewer } from "./viewer.js";
import { CAPTEURS, ACTIONS_INFO, setAvance, estAvance } from "./primitives.js";
import { $, esc, toast } from "./common.js";
import { vf, capt, act, exemple, exercice, quiz, etapeMission, demarrer } from "./tutokit.js";

const AV_C = CAPTEURS.filter((c) => c.avance), AV_A = ACTIONS_INFO.filter((a) => a.avance);
const table = (l) => `<table class="prims">${l.map((p) => `<tr><td>${p.icone}</td><td><code>${p.nom}()</code></td><td>${esc(p.role)}</td></tr>`).join("")}</table>`;

let demo = null;
const COUL = ["#ff7b5c", "#ffc93c", "#4363d8", "#f032e6", "#3cb44b", "#111111"];
const matchDemo = () => demo ||= simulate({
  joueurs: [...BOTS, BOT_PIRATE].map((b, i) => ({ id: b.nom, nom: b.nom, couleur: COUL[i], code: b.code })), graine: 77, twist: "calme",
});

const ETAPES = [];

// ---------- 1. Le lagon bouge ----------
ETAPES.push({
  court: "1", titre: "Le lagon bouge",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🌊 Le lagon bouge</h2>
      <p>Tu sais déjà écrire des <code>if</code> / <code>elif</code> / <code>else</code>. Ici, le lagon devient plus vivant :</p>
      <div class="regle"><span>🌿</span><div>Une touffe d'algues a <b>${P.portionsHerbier} portions</b>. Mangée jusqu'au bout, elle <b>disparaît</b>… et une nouvelle <b>pousse ailleurs</b> (loin des plages).</div></div>
      <div class="regle"><span>🛍️</span><div>Les sacs plastique <b>dérivent</b>, coulent, puis <b>réapparaissent ailleurs</b>.</div></div>
      <div class="regle"><span>☀️</span><div>Le jour, rester <b>sur la plage</b> fatigue : l'énergie baisse plus vite.</div></div>
      <div class="regle"><span>🏴‍☠️</span><div>Nouveau : on peut <b>pousser</b> une autre tortue… parfois sur un requin !</div></div>
      <p class="muted">👉 Regarde les touffes d'algues apparaître et disparaître. La tortue noire est une <b>Pirate</b> 🤖.</p>
    </div><div><div id="vue"></div></div></div>`;
    const v = new MatchViewer($("#vue", box), { sim: matchDemo(), vitesse: 5, pensee: false });
    v.player.onEnd = () => setTimeout(() => v.player.play(), 3000);
    return () => v.destroy();
  },
});

// ---------- 2. Les distances et les comparaisons ----------
ETAPES.push({
  court: "2", titre: "Les distances", cle: "comparaisons",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>📏 Des questions qui répondent un nombre</h2>
      ${table(AV_C.filter((c) => c.rep === "un nombre"))}
      <p>On les <b>compare</b> : <code>&lt;</code> <code>&lt;=</code> <code>&gt;</code> <code>&gt;=</code> <code>==</code> (égal) <code>!=</code> (différent).</p>
      <h3>🔬 Essaie :</h3><div id="ex"></div>
    </div><div class="card" id="q"></div></div>`;
    exemple($("#ex", box), "if distance_requin() <= 2:\n    fuir()\nelif distance_algue() == 0:\n    manger()\nelse:\n    aller_vers_algue()",
      [{ nom: "distance_requin", min: 0, max: 10 }, { nom: "distance_algue", min: 0, max: 10 }], { distance_requin: 5, distance_algue: 3 });
    const opts = [[true, "True"], [false, "False"]];
    const questions = [
      { texte: `${capt("distance_requin")} vaut <b>3</b>.<br>Que vaut <code>distance_requin() &lt;= 2</code> ?`, bon: false, pourquoi: "3 n'est pas inférieur ou égal à 2." },
      { texte: `${capt("distance_algue")} vaut <b>0</b>.<br>Que vaut <code>distance_algue() == 0</code> ?`, bon: true, pourquoi: "0 est égal à 0 : la tortue est sur les algues." },
      { texte: `Il fait nuit et ${capt("distance_plage")} vaut <b>7</b>.<br>Que vaut <code>est_la_nuit() and distance_plage() &lt; 5</code> ?`, bon: false, pourquoi: "True and False donne False : avec and, il faut que les deux soient vrais." },
      { texte: `${capt("energie")} vaut <b>4</b>.<br>Que vaut <code>energie() != 10</code> ?`, bon: true, pourquoi: "!= veut dire « différent de » : 4 est différent de 10." },
    ].map((q) => ({ ...q, options: opts }));
    questions.cle = "comparaisons";
    quiz($("#q", box), "🧮 Vrai ou faux ?", questions);
  },
});

// ---------- 3. or et not ----------
ETAPES.push({
  court: "3", titre: "or et not", cle: "ornot",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🔀 <code>or</code> et <code>not</code></h2>
      <ul class="points">
        <li><code>A or B</code> est vrai si <b>au moins une</b> des deux est vraie.</li>
        <li><code>not A</code> est vrai quand A est <b>faux</b> (et inversement).</li>
        <li>On peut grouper avec des parenthèses : <code>est_la_nuit() and (sur_plage() or distance_plage() &lt;= 1)</code></li>
      </ul>
      <h3>🔬 Essaie :</h3><div id="ex"></div>
    </div><div class="card" id="exo"></div></div>`;
    exemple($("#ex", box), "if requin_proche() or energie() < 3:\n    aller_vers_plage()\nelse:\n    aller_vers_algue()",
      ["requin_proche", { nom: "energie", min: 0, max: 10 }], { requin_proche: false, energie: 6 });
    exercice($("#exo", box), {
      cle: "ornot", avance: true,
      consigne: "Écris : « Si tu n'es <b>pas</b> sur la plage <b>et</b> qu'un requin est à <b>2 cases ou moins</b> : fuir. <b>Sinon</b> : aller vers les algues. »",
      cas: [
        { texte: "🌊 dans l'eau, 🦈 à 1 case", sit: { sur_plage: false, distance_requin: 1 }, attendu: "fuir" },
        { texte: "🏖️ sur la plage, 🦈 à 1 case", sit: { sur_plage: true, distance_requin: 1 }, attendu: "aller_vers_algue" },
        { texte: "🌊 dans l'eau, 🦈 à 6 cases", sit: { sur_plage: false, distance_requin: 6 }, attendu: "aller_vers_algue" },
      ],
      solution: "def tour():\n    if not sur_plage() and distance_requin() <= 2:\n        fuir()\n    else:\n        aller_vers_algue()\n",
      indice: "La première ligne : <code>if not sur_plage() and distance_requin() &lt;= 2:</code>",
      outils: { capteurs: ["sur_plage", "distance_requin", "requin_proche"], actions: ["fuir", "aller_vers_algue"], mots: ["if", "else", "and", "or", "not"] },
    });
  },
});

// ---------- 4. Mission : algues libres ----------
const A1 = MISSIONS_AVANCEES[0], A2 = MISSIONS_AVANCEES[1];
ETAPES.push(etapeMission({
  court: "M1", cle: "a1", titre: A1.titre, notion: A1.notion, avance: true,
  probleme: A1.probleme + `<br><span class="petit">✨ Nouveau : ${act("aller_vers_algue_libre")} nage vers les algues où il n'y a <b>aucune autre tortue</b>.</span>`,
  objectif: A1.objectif, code: A1.code, indice: A1.indice, solution: A1.solution, appris: A1.appris,
  scenario: A1.scenario, autres: A1.autres, graine: 7, reussi: A1.reussi, bilan: A1.bilan,
}));

// ---------- 5. Pousser ----------
ETAPES.push({
  court: "4", titre: "Pousser", cle: "pousser",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>💥 Pousser une tortue</h2>
      <ul class="points">
        <li>${act("pousser")} pousse une tortue <b>collée à toi</b> d'<b>une case</b>, dans la direction opposée. Coût : <b>${P.coutPousse} ⚡</b>.</li>
        <li>Impossible contre du corail ou une autre tortue.</li>
        <li>Si un <b>requin</b> attend derrière elle : elle est attrapée (<b>−1 nid</b> pour elle !).</li>
        <li>Une tortue sur la plage peut être poussée… dans l'eau !</li>
      </ul>
      ${table(AV_C.filter((c) => c.rep !== "un nombre"))}
      <h3>🔬 Essaie :</h3><div id="ex"></div>
    </div><div class="card" id="exo"></div></div>`;
    exemple($("#ex", box), "if requin_derriere_tortue():\n    pousser()\nelif tortue_a_cote():\n    aller_vers_algue_libre()\nelse:\n    aller_vers_algue()",
      ["requin_derriere_tortue", "tortue_a_cote"], { requin_derriere_tortue: false, tortue_a_cote: true });
    exercice($("#exo", box), {
      cle: "pousser", avance: true,
      consigne: "Écris : « Si un requin est <b>derrière une tortue voisine</b> et que tu as <b>au moins 4 d'énergie</b> : pousser. <b>Sinon</b> : aller vers les algues libres. »",
      cas: [
        { texte: "🐢🦈 requin derrière, ⚡ 8", sit: { requin_derriere_tortue: true, tortue_a_cote: true, energie: 8 }, attendu: "pousser" },
        { texte: "🐢🦈 requin derrière, ⚡ 3", sit: { requin_derriere_tortue: true, tortue_a_cote: true, energie: 3 }, attendu: "aller_vers_algue_libre" },
        { texte: "🐢 pas de requin, ⚡ 8", sit: { requin_derriere_tortue: false, tortue_a_cote: true, energie: 8 }, attendu: "aller_vers_algue_libre" },
      ],
      solution: "def tour():\n    if requin_derriere_tortue() and energie() >= 4:\n        pousser()\n    else:\n        aller_vers_algue_libre()\n",
      indice: "La première ligne : <code>if requin_derriere_tortue() and energie() &gt;= 4:</code>",
      outils: { capteurs: ["requin_derriere_tortue", "tortue_a_cote", "energie"], actions: ["pousser", "aller_vers_algue_libre"], mots: ["if", "else", "and", "not"] },
    });
  },
});

// ---------- 6. Mission : la pirate ----------
ETAPES.push(etapeMission({
  court: "M2", cle: "a2", titre: A2.titre, notion: A2.notion, avance: true,
  probleme: A2.probleme, objectif: A2.objectif, code: A2.code, indice: A2.indice, solution: A2.solution, appris: A2.appris,
  scenario: A2.scenario, autres: A2.autres, graine: 7, reussi: A2.reussi, bilan: A2.bilan,
}));

// ---------- 7. Anticiper la nuit ----------
ETAPES.push({
  court: "5", titre: "Anticiper la nuit", cle: "anticiper",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🌙 Partir avant la nuit</h2>
      <ul class="points">
        <li>1 heure ≈ <b>2,5 tours</b> : la tortue avance d'environ 2 cases par heure.</li>
        <li>Si la plage est loin (<code>distance_plage()</code> grand), il faut <b>partir avant</b> la nuit.</li>
        <li>Les « nuits courtes » ne durent que de 20 h à 5 h : chaque tour compte !</li>
      </ul>
      <h3>🔬 Essaie :</h3><div id="ex"></div>
    </div><div class="card" id="exo"></div></div>`;
    exemple($("#ex", box), "if est_la_nuit() and sur_plage():\n    pondre()\nelif heure() >= 17 and distance_plage() >= 5:\n    aller_vers_plage()\nelif algue_ici():\n    manger()\nelse:\n    aller_vers_algue()",
      ["est_la_nuit", "sur_plage", { nom: "heure", min: 8, max: 23 }, { nom: "distance_plage", min: 0, max: 12 }], { est_la_nuit: false, sur_plage: false, heure: 15, distance_plage: 8 });
    exercice($("#exo", box), {
      cle: "anticiper", avance: true,
      consigne: "Écris : « Si l'heure est <b>17 ou plus</b> et que la plage est à <b>5 cases ou plus</b> : aller vers la plage. <b>Sinon</b> : aller vers les algues. »",
      cas: [
        { texte: "🕐 18 h, plage à 8 cases", sit: { heure: 18, distance_plage: 8 }, attendu: "aller_vers_plage" },
        { texte: "🕐 18 h, plage à 2 cases", sit: { heure: 18, distance_plage: 2 }, attendu: "aller_vers_algue" },
        { texte: "🕐 12 h, plage à 8 cases", sit: { heure: 12, distance_plage: 8 }, attendu: "aller_vers_algue" },
      ],
      solution: "def tour():\n    if heure() >= 17 and distance_plage() >= 5:\n        aller_vers_plage()\n    else:\n        aller_vers_algue()\n",
      indice: "La première ligne : <code>if heure() &gt;= 17 and distance_plage() &gt;= 5:</code>",
      outils: { capteurs: ["heure", "distance_plage", "est_la_nuit"], actions: ["aller_vers_plage", "aller_vers_algue"], mots: ["if", "else", "and"] },
    });
  },
});

// ---------- 8. Jouer en équipe ----------
const EQ_C = CAPTEURS.filter((c) => c.equipe), EQ_A = ACTIONS_INFO.filter((a) => a.equipe);
ETAPES.push({
  court: "6", titre: "Jouer en équipe", cle: "equipe",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>👥 Jouer en équipe</h2>
      <ul class="points">
        <li>Ton enseignant peut lancer une manche <b>en équipes</b> : 2 équipes ou plus (${[1, 2, 3, 4].map((e) => `${EQUIPES[e].icone} ${EQUIPES[e].nom}`).join(", ")}…). Tu sais <b>avant la manche</b> avec qui tu joues.</li>
        <li><b>Seul le rang de l'équipe compte</b> (on compare la moyenne des nids de ses tortues) : aider une équipière rapporte autant que pondre soi-même !</li>
        <li>🛡️ Deux équipières <b>collées</b> sont protégées des requins. On ne peut pas pousser une équipière.</li>
        <li>🎁 ${act("donner")} passe ${P.don} ⚡ à une équipière collée à toi.</li>
      </ul>
      ${table(EQ_C)}${table(EQ_A)}
    </div><div>
      <div class="card"><h3>🔬 Essaie :</h3><div id="ex"></div></div>
      <div class="card" id="exo"></div>
    </div></div>`;
    exemple($("#ex", box), "if equipiere_fatiguee() and energie() >= 8:\n    donner()\nelif requin_derriere_adversaire():\n    pousser()\nelif requin_proche() and not equipiere_a_cote():\n    aller_vers_equipiere()\nelse:\n    aller_vers_algue()",
      ["equipiere_fatiguee", "requin_derriere_adversaire", "requin_proche", "equipiere_a_cote", { nom: "energie", min: 0, max: 10 }],
      { equipiere_fatiguee: true, requin_derriere_adversaire: false, requin_proche: false, equipiere_a_cote: true, energie: 9 });
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

// ---------- 9. Mission : la nourrice ----------
const A3 = MISSIONS_AVANCEES[2];
ETAPES.push(etapeMission({
  court: "M3", cle: "a3", titre: A3.titre, notion: A3.notion, avance: true, equipe: A3.equipe,
  probleme: A3.probleme, objectif: A3.objectif, code: A3.code, indice: A3.indice, solution: A3.solution, appris: A3.appris,
  scenario: A3.scenario, autres: A3.autres, graine: 7, reussi: A3.reussi, bilan: A3.bilan,
}));

// ---------- 10. Le défi ----------
ETAPES.push({
  court: "🏆", titre: "Le défi",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🏆 Le défi : battre la Pirate</h2>
      <p>Voici le code de la <b>Pirate</b> 🤖. Lis-le : comprends-tu chaque ligne ?</p>
      <div id="pirate"></div>
      <div class="msg info">💡 Idées pour la battre : ne pas rester collée aux autres (<code>not tortue_a_cote()</code>), partir tôt vers la plage, éviter les sacs…</div>
    </div><div class="card">
      <h3>🚀 Active le mode avancé</h3>
      <p>Les nouvelles primitives apparaîtront dans l'autocomplétion et la boîte à outils, et la Pirate jouera dans ton bac à sable.</p>
      <p id="etat-av"></p>
      <div class="row">
        <button class="btn" id="activer">🚀 Activer le mode avancé</button>
        <a class="btn vert" href="eleve.html?libre=1">🧪 Bac à sable</a>
        <a class="btn ghost" href="index.html">🐢 Rejoindre la partie</a>
      </div>
      <h3 style="margin-top:16px">📋 Toutes les primitives avancées</h3>
      ${table(AV_C)}${table(AV_A)}
    </div></div>`;
    new CodeView($("#pirate", box)).setCode(BOT_PIRATE.code);
    const maj = () => { $("#etat-av", box).innerHTML = estAvance() ? "✅ Mode avancé <b>activé</b>." : "Mode avancé <b>désactivé</b>."; $("#activer", box).textContent = estAvance() ? "Désactiver le mode avancé" : "🚀 Activer le mode avancé"; };
    $("#activer", box).addEventListener("click", () => { setAvance(!estAvance()); maj(); toast(estAvance() ? "🚀 Mode avancé activé !" : "Mode simple."); });
    maj();
  },
});

demarrer(ETAPES, "lagon:tuto-avance");
